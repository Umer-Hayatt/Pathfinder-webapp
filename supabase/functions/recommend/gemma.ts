// OpenSourceMatch Gemma Inference & Reference Validation
// Strictly calls gemma-4-26b-a4b-it via Gemini API. Validates candidateId and issueNumber membership.

import type {
  UserProfile,
  GitHubCandidate,
  ModelOutputPayload,
  ModelRecommendationItem,
  FitCategory,
  DifficultyLevel,
} from "./types.ts";

export class GemmaInferenceError extends Error {
  code: "MODEL_ERROR" | "INVALID_MODEL_OUTPUT" | "UPSTREAM_TIMEOUT";
  retryable: boolean;

  constructor(message: string, code: "MODEL_ERROR" | "INVALID_MODEL_OUTPUT" | "UPSTREAM_TIMEOUT", retryable: boolean) {
    super(message);
    this.name = "GemmaInferenceError";
    this.code = code;
    this.retryable = retryable;
  }
}

const VALID_FITS: Set<string> = new Set(["strong", "good", "possible"]);
const VALID_DIFFS: Set<string> = new Set(["beginner", "intermediate", "advanced"]);

export async function callGemmaMatching(
  profile: UserProfile,
  candidates: GitHubCandidate[],
  apiKey: string,
  signal?: AbortSignal,
): Promise<ModelRecommendationItem[]> {
  const modelName = Deno.env.get("GEMMA_MODEL") || "gemma-4-26b-a4b-it";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

  // Build candidate facts context for Gemma
  const candidatesContext = candidates.map((c) => ({
    candidateId: c.id,
    fullName: c.fullName,
    description: c.description,
    language: c.language,
    topics: c.topics,
    license: c.license,
    stars: c.stars,
    issues: c.issues.map((i) => ({
      number: i.number,
      title: i.title,
      labels: i.labels,
      excerpt: i.bodyExcerpt.slice(0, 300),
    })),
  }));

  const systemInstructions = `You are OpenSourceMatch, an AI assistant matching developers to open-source contributions.
Compare the user profile against the provided candidate repositories and issues.
CRITICAL RULES:
1. You MUST select candidateId ONLY from the provided candidate repositories.
2. If recommending an issue, issueNumber MUST be from the issues belonging to that candidateId. If no suitable issue exists, set issueNumber to null.
3. Return ONLY a valid JSON object matching this schema:
{
  "recommendations": [
    {
      "candidateId": number,
      "issueNumber": number or null,
      "fit": "strong" | "good" | "possible",
      "difficulty": "beginner" | "intermediate" | "advanced",
      "rationale": string (concise explanation, max 800 chars),
      "requiredSkills": string[] (max 10 items),
      "skillsToLearn": string[] (max 10 items),
      "skillGaps": string[] (max 10 items),
      "firstAction": string (one concise immediate action, max 300 chars),
      "roadmap": string[] (3 to 6 ordered practical steps, max 300 chars each),
      "limitations": string[] (evidence gaps or notes, max 10 items)
    }
  ]
}
Do not invent candidate IDs, issue numbers, commands, or repositories. Do not wrap in markdown quotes if possible.`;

  const userPrompt = `Developer Profile:
${JSON.stringify(profile, null, 2)}

Candidate Repositories:
${JSON.stringify(candidatesContext, null, 2)}

Provide up to 5 best recommendations as JSON.`;

  // First inference attempt
  let items = await executeGemmaRequest(endpoint, apiKey, systemInstructions, userPrompt, signal);
  let validation = validateModelOutput(items, candidates);

  if (validation.ok) {
    return validation.items;
  }

  // At most ONE repair attempt within budget per DRD.md specifications
  const repairPrompt = `${userPrompt}

PREVIOUS OUTPUT WAS INVALID:
${validation.error}

Please fix the output according to the schema rules and candidate IDs. Return valid JSON only.`;

  items = await executeGemmaRequest(endpoint, apiKey, systemInstructions, repairPrompt, signal);
  validation = validateModelOutput(items, candidates);

  if (!validation.ok) {
    throw new GemmaInferenceError(
      `Model output failed schema validation after repair attempt: ${validation.error}`,
      "INVALID_MODEL_OUTPUT",
      true,
    );
  }

  return validation.items;
}

async function executeGemmaRequest(
  endpoint: string,
  apiKey: string,
  systemInstructions: string,
  prompt: string,
  signal?: AbortSignal,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemInstructions}\n\n${prompt}` }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2500,
          thinkingConfig: { thinkingLevel: "minimal" },
        },
      }),
    });
  } catch (err: any) {
    if (signal?.aborted) {
      throw new GemmaInferenceError("Inference timed out.", "UPSTREAM_TIMEOUT", true);
    }
    throw new GemmaInferenceError(`Gemma API network error: ${err?.message}`, "MODEL_ERROR", true);
  }

  if (!response.ok) {
    const errorBody = await response.text();
    throw new GemmaInferenceError(
      `Gemma API returned HTTP ${response.status}: ${errorBody.slice(0, 200)}`,
      "MODEL_ERROR",
      response.status >= 500 || response.status === 429,
    );
  }

  const data: any = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts;
  const textPart = Array.isArray(parts)
    ? parts
        .filter((part: any) => !part.thought && typeof part.text === "string")
        .map((part: any) => part.text)
        .join("")
        .trim()
    : "";
  if (!textPart) {
    throw new GemmaInferenceError("Gemma returned empty text candidate.", "INVALID_MODEL_OUTPUT", true);
  }

  // Clean JSON string from markdown fences if any
  let cleanJson = textPart.trim();
  if (cleanJson.startsWith("```json")) {
    cleanJson = cleanJson.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleanJson.startsWith("```")) {
    cleanJson = cleanJson.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }

  try {
    return JSON.parse(cleanJson);
  } catch {
    throw new GemmaInferenceError("Model output could not be parsed as JSON.", "INVALID_MODEL_OUTPUT", true);
  }
}

function validateModelOutput(
  parsed: any,
  candidates: GitHubCandidate[],
): { ok: true; items: ModelRecommendationItem[] } | { ok: false; error: string } {
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.recommendations)) {
    return { ok: false, error: "Output must contain a 'recommendations' array." };
  }

  const candidateMap = new Map<number, GitHubCandidate>();
  for (const c of candidates) {
    candidateMap.set(c.id, c);
  }

  const validItems: ModelRecommendationItem[] = [];
  const seenCandidateIds = new Set<number>();

  for (let idx = 0; idx < parsed.recommendations.length; idx++) {
    if (validItems.length >= 5) break;
    const item = parsed.recommendations[idx];
    if (!item || typeof item !== "object") continue;

    // Check candidate ID membership
    const candId = Number(item.candidateId);
    if (!candidateMap.has(candId)) {
      return { ok: false, error: `candidateId ${item.candidateId} was not in the provided candidates.` };
    }
    if (seenCandidateIds.has(candId)) {
      continue; // Deduplicate candidate recommendations
    }
    seenCandidateIds.add(candId);

    const cand = candidateMap.get(candId)!;

    // Check issue number membership
    let issueNum: number | null = null;
    if (item.issueNumber !== null && item.issueNumber !== undefined) {
      issueNum = Number(item.issueNumber);
      const issueExists = cand.issues.some((i) => i.number === issueNum);
      if (!issueExists) {
        return {
          ok: false,
          error: `issueNumber ${issueNum} does not belong to candidate repository ${cand.fullName}.`,
        };
      }
    }

    const fit: FitCategory = VALID_FITS.has(item.fit) ? item.fit : "good";
    const difficulty: DifficultyLevel = VALID_DIFFS.has(item.difficulty) ? item.difficulty : "intermediate";

    const rationale = typeof item.rationale === "string" ? item.rationale.slice(0, 800) : "Matches your profile.";
    const firstAction = typeof item.firstAction === "string" ? item.firstAction.slice(0, 300) : "Clone the repository.";

    const roadmap = Array.isArray(item.roadmap)
      ? item.roadmap
          .filter((s: any) => typeof s === "string")
          .map((s: string) => s.slice(0, 300))
          .slice(0, 6)
      : ["Fork repository", "Run tests", "Open PR"];

    if (roadmap.length < 3) {
      roadmap.push("Review open issues for further contribution opportunities.");
    }

    const toStringArray = (val: any): string[] =>
      Array.isArray(val)
        ? val
            .filter((x: any) => typeof x === "string")
            .map((x: string) => x.trim().slice(0, 60))
            .filter(Boolean)
            .slice(0, 10)
        : [];

    validItems.push({
      candidateId: candId,
      issueNumber: issueNum,
      fit,
      difficulty,
      rationale,
      requiredSkills: toStringArray(item.requiredSkills),
      skillsToLearn: toStringArray(item.skillsToLearn),
      skillGaps: toStringArray(item.skillGaps),
      firstAction,
      roadmap,
      limitations: toStringArray(item.limitations),
    });
  }

  return { ok: true, items: validItems };
}
