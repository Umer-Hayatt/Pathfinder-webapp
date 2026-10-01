// OpenSourceMatch Supabase Edge Function Handler
// Handles public no-login invocation, CORS, streaming request limits, GitHub retrieval, Gemma inference, and DRD error shapes.

import type {
  RecommendationResponse,
  Recommendation,
  ApiErrorCode,
  ApiErrorResponse,
  GitHubCandidate,
} from "./types.ts";
import { validateUserProfile } from "./validation.ts";
import { fetchGitHubCandidates, GitHubApiError } from "./github.ts";
import { callGemmaMatching, GemmaInferenceError } from "./gemma.ts";

const MAX_BODY_BYTES = 16 * 1024; // 16 KB DRD bound

export function createErrorResponse(
  status: number,
  code: ApiErrorCode,
  message: string,
  retryable: boolean,
  requestId: string,
  corsHeaders: Record<string, string>,
): Response {
  const payload: ApiErrorResponse = {
    error: {
      code,
      message,
      retryable,
    },
    requestId,
  };

  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

export function getCorsHeaders(req: Request): Record<string, string> {
  const allowedOriginsStr = Deno.env.get("ALLOWED_ORIGINS") || "http://localhost:5173";
  const allowedOrigins = allowedOriginsStr
    .split(",")
    .map((o) => o.trim().toLowerCase())
    .filter(Boolean);

  const reqOrigin = req.headers.get("origin");
  const headers: Record<string, string> = {
    "Vary": "Origin",
  };

  if (reqOrigin) {
    const isAllowed = allowedOrigins.includes("*") || allowedOrigins.includes(reqOrigin.toLowerCase());
    if (isAllowed) {
      headers["Access-Control-Allow-Origin"] = reqOrigin;
      headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
      headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
      headers["Access-Control-Max-Age"] = "86400";
    }
  }

  return headers;
}

export async function handleRequest(req: Request): Promise<Response> {
  const requestId = `req_${crypto.randomUUID().slice(0, 12)}`;
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS OPTIONS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Reject unsupported HTTP methods
  if (req.method !== "POST") {
    return createErrorResponse(
      405,
      "METHOD_NOT_ALLOWED",
      `Method ${req.method} not allowed. Use POST /functions/v1/recommend.`,
      false,
      requestId,
      corsHeaders,
    );
  }

  // Fast check on Content-Length header if present
  const contentLengthHeader = req.headers.get("content-length");
  if (contentLengthHeader) {
    const parsedLength = parseInt(contentLengthHeader, 10);
    if (!isNaN(parsedLength) && parsedLength > MAX_BODY_BYTES) {
      return createErrorResponse(
        413,
        "REQUEST_TOO_LARGE",
        `Request body exceeded maximum size limit of ${MAX_BODY_BYTES} bytes.`,
        false,
        requestId,
        corsHeaders,
      );
    }
  }

  // Stream and bound request body reading
  if (!req.body) {
    return createErrorResponse(
      400,
      "INVALID_JSON",
      "Request body is required.",
      false,
      requestId,
      corsHeaders,
    );
  }

  let rawBodyText = "";
  const reader = req.body.getReader();
  let totalBytes = 0;
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_BODY_BYTES) {
        reader.cancel();
        return createErrorResponse(
          413,
          "REQUEST_TOO_LARGE",
          `Request body exceeded maximum size limit of ${MAX_BODY_BYTES} bytes.`,
          false,
          requestId,
          corsHeaders,
        );
      }
      rawBodyText += decoder.decode(value, { stream: true });
    }
    rawBodyText += decoder.decode();
  } catch (err: any) {
    return createErrorResponse(
      400,
      "INVALID_JSON",
      `Failed to read request body: ${err?.message}`,
      false,
      requestId,
      corsHeaders,
    );
  } finally {
    reader.releaseLock();
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawBodyText);
  } catch {
    return createErrorResponse(
      400,
      "INVALID_JSON",
      "Request body could not be parsed as valid JSON.",
      false,
      requestId,
      corsHeaders,
    );
  }

  // Validate user profile against DRD bounds
  const validation = validateUserProfile(parsedJson);
  if (!validation.ok) {
    return createErrorResponse(
      400,
      validation.code,
      validation.message,
      false,
      requestId,
      corsHeaders,
    );
  }
  const profile = validation.profile;

  // Check required backend secrets
  const geminiApiKey = Deno.env.get("GEMINI_API_KEY")?.trim();
  if (!geminiApiKey || /^(replace_|your_|<)/i.test(geminiApiKey)) {
    return createErrorResponse(
      503,
      "SERVICE_NOT_CONFIGURED",
      "Backend service is not configured with GEMINI_API_KEY.",
      false,
      requestId,
      corsHeaders,
    );
  }

  const githubToken = Deno.env.get("GITHUB_TOKEN")?.trim();
  const timeoutController = new AbortController();
  const timeoutTimer = setTimeout(() => timeoutController.abort(), 90000); // 90s total budget

  try {
    // 1. Retrieve GitHub candidate repositories and open issues
    const { candidates, warnings } = await fetchGitHubCandidates(
      profile,
      githubToken,
      timeoutController.signal,
    );

    // If zero candidates found, return 200 with empty array per DRD
    if (candidates.length === 0) {
      const emptyResponse: RecommendationResponse = {
        requestId,
        model: Deno.env.get("GEMMA_MODEL") || "gemma-4-26b-a4b-it",
        retrievedAt: new Date().toISOString(),
        recommendations: [],
        warnings: [
          ...warnings,
          "No public repositories found matching the provided criteria. Try broadening programming languages or interests.",
        ],
      };
      return new Response(JSON.stringify(emptyResponse), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    // 2. Call Gemma for matching, explanations, and roadmaps
    const modelItems = await callGemmaMatching(
      profile,
      candidates,
      geminiApiKey,
      timeoutController.signal,
    );

    // 3. Assemble public response by joining Gemma output with authoritative GitHub facts
    const candidateMap = new Map<number, GitHubCandidate>();
    for (const c of candidates) {
      candidateMap.set(c.id, c);
    }

    const recommendations: Recommendation[] = [];

    for (const item of modelItems) {
      const cand = candidateMap.get(item.candidateId);
      if (!cand) continue;

      let issueFact = null;
      if (item.issueNumber !== null) {
        const foundIssue = cand.issues.find((i) => i.number === item.issueNumber);
        if (foundIssue) {
          issueFact = {
            number: foundIssue.number,
            title: foundIssue.title,
            url: foundIssue.url,
            labels: foundIssue.labels,
          };
        }
      }

      recommendations.push({
        repository: {
          id: cand.id,
          fullName: cand.fullName,
          description: cand.description,
          url: cand.url,
          language: cand.language,
          topics: cand.topics,
          license: cand.license,
          stars: cand.stars,
          pushedAt: cand.pushedAt,
        },
        issue: issueFact,
        fit: item.fit,
        difficulty: item.difficulty,
        rationale: item.rationale,
        requiredSkills: item.requiredSkills,
        skillsToLearn: item.skillsToLearn,
        skillGaps: item.skillGaps,
        firstAction: item.firstAction,
        roadmap: item.roadmap,
        contributionGuideUrl: cand.contributionGuideUrl,
        limitations: item.limitations,
      });
    }

    const finalResponse: RecommendationResponse = {
      requestId,
      model: Deno.env.get("GEMMA_MODEL") || "gemma-4-26b-a4b-it",
      retrievedAt: new Date().toISOString(),
      recommendations,
      warnings: warnings.length > 0 ? warnings : undefined,
    };

    return new Response(JSON.stringify(finalResponse), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (err: any) {
    if (err instanceof GitHubApiError) {
      const code: ApiErrorCode = err.statusCode === 429 || err.statusCode === 403 ? "RATE_LIMITED" : "GITHUB_ERROR";
      return createErrorResponse(
        err.statusCode === 429 ? 429 : 502,
        code,
        err.message,
        err.retryable,
        requestId,
        corsHeaders,
      );
    }

    if (err instanceof GemmaInferenceError) {
      const status = err.code === "UPSTREAM_TIMEOUT" ? 504 : 502;
      return createErrorResponse(
        status,
        err.code,
        err.message,
        err.retryable,
        requestId,
        corsHeaders,
      );
    }

    if (timeoutController.signal.aborted) {
      return createErrorResponse(
        504,
        "UPSTREAM_TIMEOUT",
        "Recommendation pipeline exceeded total 90-second execution budget.",
        true,
        requestId,
        corsHeaders,
      );
    }

    return createErrorResponse(
      502,
      "MODEL_ERROR",
      err?.message || "An unexpected error occurred during recommendation processing.",
      true,
      requestId,
      corsHeaders,
    );
  } finally {
    clearTimeout(timeoutTimer);
  }
}

// Start HTTP listener if run as main module
if (import.meta.main) {
  Deno.serve({ port: 54321 }, handleRequest);
}
