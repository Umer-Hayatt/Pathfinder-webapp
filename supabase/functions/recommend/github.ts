// OpenSourceMatch GitHub Evidence Retrieval
// Queries real GitHub REST API, filters licenses, non-archived repos, open non-PR issues.

import type { UserProfile, GitHubCandidate, IssueCandidate } from "./types.ts";

export interface GitHubRetrievalResult {
  candidates: GitHubCandidate[];
  warnings: string[];
}

export class GitHubApiError extends Error {
  statusCode: number;
  retryable: boolean;

  constructor(message: string, statusCode: number, retryable: boolean) {
    super(message);
    this.name = "GitHubApiError";
    this.statusCode = statusCode;
    this.retryable = retryable;
  }
}

const RECOGNIZED_LICENSES = new Set([
  "mit",
  "apache-2.0",
  "bsd-2-clause",
  "bsd-3-clause",
  "isc",
  "mpl-2.0",
  "gpl-3.0",
  "lgpl-3.0",
  "unlicense",
  "cc0-1.0",
  "artistic-2.0",
]);

export async function fetchGitHubCandidates(
  profile: UserProfile,
  githubToken?: string,
  signal?: AbortSignal,
): Promise<GitHubRetrievalResult> {
  const warnings: string[] = [];
  const candidates: GitHubCandidate[] = [];

  const headers: Record<string, string> = {
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "OpenSourceMatch-Backend/1.0",
  };

  if (githubToken && githubToken.trim()) {
    headers["Authorization"] = `Bearer ${githubToken.trim()}`;
  }

  // Construct search query from languages and interests
  const primaryLang = profile.languages[0];
  const queryParts: string[] = [`is:public`, `archived:false`];

  if (primaryLang) {
    queryParts.push(`language:"${primaryLang}"`);
  }

  if (profile.interests.length > 0) {
    const rawInterest = profile.interests[0].trim();
    const slug = rawInterest.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (slug) {
      queryParts.push(`topic:${slug}`);
    }
  }

  // Minimum stars to avoid inactive forks
  queryParts.push(`stars:>10`);

  const searchQuery = encodeURIComponent(queryParts.join(" "));
  const searchUrl = `https://api.github.com/search/repositories?q=${searchQuery}&sort=stars&order=desc&per_page=12`;

  let searchData: any;
  try {
    const res = await fetch(searchUrl, { method: "GET", headers, signal });
    if (!res.ok) {
      if (res.status === 403 || res.status === 429) {
        throw new GitHubApiError("GitHub API rate limit exceeded.", res.status, true);
      }
      throw new GitHubApiError(`GitHub repository search returned HTTP ${res.status}.`, res.status, res.status >= 500);
    }
    searchData = await res.json();
  } catch (err: any) {
    if (err instanceof GitHubApiError) throw err;
    if (signal?.aborted) {
      throw new GitHubApiError("GitHub retrieval timed out.", 504, true);
    }
    throw new GitHubApiError(`Network failure querying GitHub: ${err?.message}`, 502, true);
  }

  const rawItems: any[] = searchData?.items || [];
  const seenIds = new Set<number>();

  for (const item of rawItems) {
    if (candidates.length >= 8) break;
    if (seenIds.has(item.id)) continue;
    seenIds.add(item.id);

    // Filter recognized open-source licenses
    const spdxId = item.license?.spdx_id?.toLowerCase();
    if (!spdxId || spdxId === "noassertion" || !RECOGNIZED_LICENSES.has(spdxId)) {
      continue; // Skip unrecognized or missing licenses per DRD
    }

    const candidate: GitHubCandidate = {
      id: item.id,
      fullName: item.full_name,
      description: item.description ? item.description.slice(0, 500) : null,
      url: item.html_url,
      language: item.language || null,
      topics: Array.isArray(item.topics) ? item.topics.slice(0, 10) : [],
      license: item.license.spdx_id,
      stars: typeof item.stargazers_count === "number" ? item.stargazers_count : null,
      pushedAt: item.pushed_at || null,
      contributionGuideUrl: null,
      issues: [],
    };

    // Attempt to retrieve issues for this candidate repository
    try {
      const issues = await fetchCandidateIssues(candidate.fullName, profile, headers, signal);
      candidate.issues = issues;
    } catch {
      warnings.push(`Could not fetch open issues for repository ${candidate.fullName}.`);
    }

    candidates.push(candidate);
  }

  if (candidates.length === 0 && rawItems.length > 0) {
    warnings.push("Retrieved candidate repositories lacked recognized open-source licenses.");
  }

  return { candidates, warnings };
}

async function fetchCandidateIssues(
  repoFullName: string,
  profile: UserProfile,
  headers: Record<string, string>,
  signal?: AbortSignal,
): Promise<IssueCandidate[]> {
  const issues: IssueCandidate[] = [];

  // If beginner or first contribution, prefer good-first-issue labels
  let issueUrl = `https://api.github.com/repos/${repoFullName}/issues?state=open&per_page=6`;
  if (profile.level === "beginner" || profile.goal === "first_contribution") {
    issueUrl += `&labels=good%20first%20issue`;
  }

  let res = await fetch(issueUrl, { method: "GET", headers, signal });
  if (!res.ok && (profile.level === "beginner" || profile.goal === "first_contribution")) {
    // Fall back to general open issues if label search returned nothing or error
    res = await fetch(`https://api.github.com/repos/${repoFullName}/issues?state=open&per_page=6`, {
      method: "GET",
      headers,
      signal,
    });
  }

  if (!res.ok) return issues;

  const rawIssues: any[] = await res.json();
  if (!Array.isArray(rawIssues)) return issues;

  for (const raw of rawIssues) {
    if (issues.length >= 3) break;
    // Exclude pull requests (GitHub Issues API returns PRs unless filtered)
    if (raw.pull_request) continue;

    issues.push({
      number: raw.number,
      title: (raw.title || "").slice(0, 300),
      url: raw.html_url,
      labels: Array.isArray(raw.labels)
        ? raw.labels.map((l: any) => (typeof l === "string" ? l : l.name)).filter(Boolean).slice(0, 8)
        : [],
      bodyExcerpt: typeof raw.body === "string" ? raw.body.slice(0, 1500) : "",
    });
  }

  return issues;
}
