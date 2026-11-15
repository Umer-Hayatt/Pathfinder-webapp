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
  rateLimited: boolean;

  constructor(message: string, statusCode: number, retryable: boolean, rateLimited = false) {
    super(message);
    this.name = "GitHubApiError";
    this.statusCode = statusCode;
    this.retryable = retryable;
    this.rateLimited = rateLimited;
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

const MAX_CANDIDATES = 8;
// Search API allows 10 req/min unauthenticated, so cap the number of search queries per request.
const MAX_SEARCH_QUERIES = 4;
const ISSUES_PER_CANDIDATE = 3;
// The issues endpoint also returns pull requests, so fetch a full page and filter them out.
const ISSUE_PAGE_SIZE = 30;
const BEGINNER_LABEL = "good first issue";

function slugify(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function stripQuotes(text: string): string {
  return text.replace(/"/g, "").trim();
}

/**
 * Builds search queries from most to least specific. Every language/interest pair is tried
 * as an exact GitHub topic first (ordered so the user's first choices come first), then each
 * language with the interest as free text, which matches repos that don't tag topics.
 */
export function buildSearchQueries(profile: UserProfile): string[] {
  const base = ["is:public", "archived:false", "stars:>10"];
  const langs = profile.languages.slice(0, 3).map(stripQuotes).filter(Boolean);
  const interests = profile.interests.slice(0, 3).map(stripQuotes).filter(Boolean);

  const pairs: Array<{ lang: string; interest: string; rank: number }> = [];
  langs.forEach((lang, li) => interests.forEach((interest, ii) => pairs.push({ lang, interest, rank: li + ii })));
  pairs.sort((a, b) => a.rank - b.rank);

  const topicQueries: string[] = [];
  for (const { lang, interest } of pairs) {
    const slug = slugify(interest);
    if (slug) topicQueries.push([...base, `language:"${lang}"`, `topic:${slug}`].join(" "));
  }
  const freeTextQueries = langs.map((lang) => {
    const keyword = interests[0] ? `"${interests[0]}"` : "";
    return [keyword, ...base, `language:"${lang}"`].filter(Boolean).join(" ");
  });

  // Free text goes third so it stays within MAX_SEARCH_QUERIES even when there are many
  // topic pairs; it catches repos whose topics don't match the user's wording.
  return Array.from(new Set([
    ...topicQueries.slice(0, 2),
    ...freeTextQueries.slice(0, 1),
    ...topicQueries.slice(2),
    ...freeTextQueries.slice(1),
  ]));
}

function isRateLimitResponse(res: Response, bodyText: string): boolean {
  if (res.status === 429) return true;
  if (res.status !== 403) return false;
  return (
    res.headers.get("x-ratelimit-remaining") === "0" ||
    res.headers.has("retry-after") ||
    /rate limit/i.test(bodyText)
  );
}

async function githubGet(url: string, headers: Record<string, string>, signal?: AbortSignal): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, { method: "GET", headers, signal });
  } catch (err: any) {
    if (signal?.aborted) {
      throw new GitHubApiError("GitHub retrieval timed out.", 504, true);
    }
    throw new GitHubApiError(`Network failure querying GitHub: ${err?.message}`, 502, true);
  }

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    if (isRateLimitResponse(res, bodyText)) {
      throw new GitHubApiError("GitHub API rate limit exceeded.", res.status, true, true);
    }
    throw new GitHubApiError(`GitHub request returned HTTP ${res.status}.`, res.status, res.status >= 500);
  }

  try {
    return await res.json();
  } catch {
    throw new GitHubApiError("GitHub returned a malformed JSON response.", 502, true);
  }
}

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

  const queries = buildSearchQueries(profile).slice(0, MAX_SEARCH_QUERIES);
  const seenIds = new Set<number>();
  let rawItemCount = 0;

  for (let qi = 0; qi < queries.length && candidates.length < MAX_CANDIDATES; qi++) {
    const searchUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(queries[qi])}` +
      `&sort=stars&order=desc&per_page=12`;

    let searchData: any;
    try {
      searchData = await githubGet(searchUrl, headers, signal);
    } catch (err) {
      // The first query is required; later broadening queries are best effort.
      if (qi === 0 || (err instanceof GitHubApiError && err.statusCode === 504)) throw err;
      warnings.push("Some broader repository searches could not be completed; results may be narrower.");
      break;
    }

    const rawItems: any[] = Array.isArray(searchData?.items) ? searchData.items : [];
    rawItemCount += rawItems.length;

    for (const item of rawItems) {
      if (candidates.length >= MAX_CANDIDATES) break;
      if (typeof item?.id !== "number" || seenIds.has(item.id)) continue;
      seenIds.add(item.id);

      // Filter recognized open-source licenses
      const spdxId = item.license?.spdx_id?.toLowerCase();
      if (!spdxId || spdxId === "noassertion" || !RECOGNIZED_LICENSES.has(spdxId)) {
        continue; // Skip unrecognized or missing licenses per DRD
      }

      candidates.push({
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
      });
    }
  }

  // Retrieve issues for all candidates concurrently.
  const issueResults = await Promise.allSettled(
    candidates.map((c) => fetchCandidateIssues(c.fullName, profile, headers, signal)),
  );
  issueResults.forEach((result, i) => {
    if (result.status === "fulfilled") {
      candidates[i].issues = result.value;
    } else {
      const reason = result.reason instanceof GitHubApiError && result.reason.rateLimited
        ? " (GitHub rate limit reached)"
        : "";
      warnings.push(`Could not fetch open issues for repository ${candidates[i].fullName}${reason}.`);
    }
  });

  if (signal?.aborted) {
    throw new GitHubApiError("GitHub retrieval timed out.", 504, true);
  }

  if (candidates.length === 0 && rawItemCount > 0) {
    warnings.push("Retrieved candidate repositories lacked recognized open-source licenses.");
  }

  return { candidates, warnings };
}

function toIssueCandidates(rawIssues: unknown): IssueCandidate[] {
  if (!Array.isArray(rawIssues)) return [];
  const issues: IssueCandidate[] = [];

  for (const raw of rawIssues) {
    if (issues.length >= ISSUES_PER_CANDIDATE) break;
    // Exclude pull requests (GitHub Issues API returns PRs unless filtered)
    if (!raw || raw.pull_request) continue;

    issues.push({
      number: raw.number,
      title: (raw.title || "").slice(0, 300),
      url: raw.html_url,
      labels: Array.isArray(raw.labels)
        ? raw.labels.map((l: any) => (typeof l === "string" ? l : l?.name)).filter(Boolean).slice(0, 8)
        : [],
      bodyExcerpt: typeof raw.body === "string" ? raw.body.slice(0, 1500) : "",
    });
  }

  return issues;
}

/** Throws GitHubApiError when GitHub refuses the request, so callers can surface a warning. */
async function fetchCandidateIssues(
  repoFullName: string,
  profile: UserProfile,
  headers: Record<string, string>,
  signal?: AbortSignal,
): Promise<IssueCandidate[]> {
  const baseUrl = `https://api.github.com/repos/${repoFullName}/issues?state=open&per_page=${ISSUE_PAGE_SIZE}`;

  // Beginners and first contributions prefer good-first-issue labels, falling back to any
  // open issue when the label is unused or yields no issues.
  if (profile.level === "beginner" || profile.goal === "first_contribution") {
    const labelled = toIssueCandidates(
      await githubGet(`${baseUrl}&labels=${encodeURIComponent(BEGINNER_LABEL)}`, headers, signal),
    );
    if (labelled.length > 0) return labelled;
  }

  return toIssueCandidates(await githubGet(baseUrl, headers, signal));
}
