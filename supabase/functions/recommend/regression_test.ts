// Offline regression tests: stub fetch (GitHub + Gemini) and drive the real code paths.
// Each test pins a previously diagnosed bug (B1-B9) so it cannot come back.
// Run: deno test --allow-env supabase/functions/recommend/regression_test.ts

import { assert, assertEquals } from "jsr:@std/assert@1";
import { FakeTime } from "jsr:@std/testing@1/time";
import { handleRequest } from "./index.ts";
import { fetchGitHubCandidates } from "./github.ts";
import type { UserProfile } from "./types.ts";

type Route = (url: URL, init?: RequestInit) => Response | Promise<Response>;

function stubFetch(route: Route): () => void {
  const original = globalThis.fetch;
  globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    return Promise.resolve(route(url, init));
  }) as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const repo = (id: number) => ({
  id,
  full_name: `org/repo${id}`,
  html_url: `https://github.com/org/repo${id}`,
  description: "d",
  language: "Python",
  topics: [],
  license: { spdx_id: "MIT" },
  stargazers_count: 100,
  pushed_at: "2026-01-01T00:00:00Z",
});

const issue = (n: number, pr = false) => ({
  number: n,
  title: `Issue ${n}`,
  html_url: `https://github.com/org/repo/issues/${n}`,
  labels: [],
  body: "b",
  ...(pr ? { pull_request: {} } : {}),
});

const gemini = (text: string) => json({ candidates: [{ content: { parts: [{ text }] } }] });

const rec = (candidateId: number, extra: Record<string, unknown> = {}) => ({
  candidateId,
  issueNumber: null,
  fit: "good",
  difficulty: "beginner",
  rationale: "r",
  requiredSkills: [],
  skillsToLearn: [],
  skillGaps: [],
  firstAction: "a",
  roadmap: ["1", "2", "3"],
  limitations: [],
  ...extra,
});

const beginner: UserProfile = {
  level: "beginner",
  languages: ["Python"],
  interests: ["developer tools"],
  goal: "first_contribution",
};

const post = (body: unknown) =>
  new Request("http://localhost/functions/v1/recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Origin": "http://localhost:5173" },
    body: JSON.stringify(body),
  });

function withKey() {
  Deno.env.set("GEMINI_API_KEY", "test-key-offline");
}

// --- B1: label query returning 200 [] never falls back to unlabeled issues ---------------
Deno.test("B1 beginner: empty 'good first issue' result falls back to open issues", async () => {
  const restore = stubFetch((url) => {
    if (url.pathname === "/search/repositories") return json({ items: [repo(1)] });
    if (url.searchParams.get("labels")) return json([]); // repo has no labelled issues
    return json([issue(10), issue(11)]); // but does have open issues
  });
  try {
    const { candidates } = await fetchGitHubCandidates(beginner);
    assertEquals(candidates[0].issues.length > 0, true, "beginner got zero issues although repo has open issues");
  } finally {
    restore();
  }
});

// --- B2: per_page=6 page of PRs leaves zero issues ----------------------------------------
Deno.test("B2 issues: a first page that is all pull requests still yields issues", async () => {
  const restore = stubFetch((url) => {
    if (url.pathname === "/search/repositories") return json({ items: [repo(1)] });
    const perPage = Number(url.searchParams.get("per_page") ?? 30);
    // Repo whose 6 most recent open items are PRs, with real issues after them.
    const all = [...Array.from({ length: 6 }, (_, i) => issue(100 + i, true)), issue(7), issue(8)];
    return json(all.slice(0, perPage));
  });
  try {
    const { candidates } = await fetchGitHubCandidates({ ...beginner, level: "advanced", goal: "features" });
    assertEquals(candidates[0].issues.length > 0, true, "PRs crowded out every issue");
  } finally {
    restore();
  }
});

// --- B4: issue fetch 403/429 is indistinguishable from "no issues" -----------------------
Deno.test("B4 issues: rate-limited issue fetch produces a warning", async () => {
  const restore = stubFetch((url) => {
    if (url.pathname === "/search/repositories") return json({ items: [repo(1)] });
    return json({ message: "API rate limit exceeded" }, 403);
  });
  try {
    const { candidates, warnings } = await fetchGitHubCandidates({ ...beginner, level: "advanced", goal: "features" });
    assertEquals(candidates[0].issues.length, 0);
    assert(warnings.length > 0, "issue fetch failed with 403 but no warning was surfaced");
  } finally {
    restore();
  }
});

// --- B5: GitHub search 403 → body says RATE_LIMITED but HTTP status is 502 ---------------
Deno.test("B5 HTTP: GitHub rate limit returns 429 to match RATE_LIMITED", async () => {
  withKey();
  const restore = stubFetch(() => json({ message: "API rate limit exceeded" }, 403));
  try {
    const res = await handleRequest(post(beginner));
    const body = await res.json();
    assertEquals(body.error.code, "RATE_LIMITED");
    assertEquals(res.status, 429, `RATE_LIMITED returned with HTTP ${res.status}`);
  } finally {
    restore();
  }
});

// --- B6: total-budget timeout during GitHub phase reported as GITHUB_ERROR/502 -----------
Deno.test("B6 HTTP: 90s budget expiring during GitHub search returns 504 UPSTREAM_TIMEOUT", async () => {
  withKey();
  const time = new FakeTime();
  const restore = stubFetch((_url, init) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    })
  );
  try {
    const pending = handleRequest(post(beginner));
    await time.tickAsync(90_001);
    const res = await pending;
    const body = await res.json();
    assertEquals([res.status, body.error.code], [504, "UPSTREAM_TIMEOUT"]);
  } finally {
    restore();
    time.restore();
  }
});

// --- B7: unparseable first Gemma reply skips the repair attempt ----------------------------
Deno.test("B7 HTTP: non-JSON first model reply gets the repair attempt", async () => {
  withKey();
  let geminiCalls = 0;
  const restore = stubFetch((url) => {
    if (url.hostname === "generativelanguage.googleapis.com") {
      geminiCalls++;
      return geminiCalls === 1
        ? gemini('Here are your recommendations:\n```json\n{"recommendations": [')
        : gemini(JSON.stringify({ recommendations: [rec(1)] }));
    }
    if (url.pathname === "/search/repositories") return json({ items: [repo(1)] });
    return json([issue(10)]);
  });
  try {
    const res = await handleRequest(post(beginner));
    assertEquals(geminiCalls, 2, "repair attempt never ran");
    assertEquals(res.status, 200);
  } finally {
    restore();
  }
});

// --- B8: one hallucinated candidateId discards every valid recommendation ----------------
Deno.test("B8 HTTP: one invented candidateId does not discard the valid ones", async () => {
  withKey();
  const restore = stubFetch((url) => {
    if (url.hostname === "generativelanguage.googleapis.com") {
      return gemini(JSON.stringify({ recommendations: [rec(1), rec(2), rec(999999)] }));
    }
    if (url.pathname === "/search/repositories") return json({ items: [repo(1), repo(2)] });
    return json([issue(10)]);
  });
  try {
    const res = await handleRequest(post(beginner));
    const body = await res.json();
    assertEquals(res.status, 200, `got ${res.status} ${body?.error?.code}`);
    assertEquals(body.recommendations.length, 2);
  } finally {
    restore();
  }
});

// --- B9: roadmap contract is 3-6 steps but [] yields 1 step --------------------------------
Deno.test("B9 HTTP: empty model roadmap is padded to at least 3 steps", async () => {
  withKey();
  const restore = stubFetch((url) => {
    if (url.hostname === "generativelanguage.googleapis.com") {
      return gemini(JSON.stringify({ recommendations: [rec(1, { roadmap: [] })] }));
    }
    if (url.pathname === "/search/repositories") return json({ items: [repo(1)] });
    return json([issue(10)]);
  });
  try {
    const res = await handleRequest(post(beginner));
    const body = await res.json();
    assert(body.recommendations[0].roadmap.length >= 3, `roadmap has ${body.recommendations[0].roadmap.length} step(s)`);
  } finally {
    restore();
  }
});

// --- B3: only languages[0] and interests[0] reach the search query ------------------------
Deno.test("B3 search: secondary languages and interests influence retrieval", async () => {
  const queries: string[] = [];
  const restore = stubFetch((url) => {
    if (url.pathname === "/search/repositories") {
      queries.push(url.searchParams.get("q") ?? "");
      return json({ items: [] });
    }
    return json([]);
  });
  try {
    await fetchGitHubCandidates({
      level: "intermediate",
      languages: ["TypeScript", "JavaScript"],
      interests: ["web frameworks", "developer tools"],
      goal: "features",
    });
    const all = queries.join(" | ");
    assert(/JavaScript/.test(all) || /developer-tools/.test(all), `only queried: ${all}`);
  } finally {
    restore();
  }
});

// --- B3b: free-text fallback runs when no exact GitHub topic matches ------------------------
Deno.test("B3b search: free-text query is reached when every topic query is empty", async () => {
  const queries: string[] = [];
  const restore = stubFetch((url) => {
    if (url.pathname === "/search/repositories") {
      const q = url.searchParams.get("q") ?? "";
      queries.push(q);
      return json({ items: q.includes("topic:") ? [] : [repo(1)] });
    }
    return json([issue(10)]);
  });
  try {
    const { candidates } = await fetchGitHubCandidates({
      level: "intermediate",
      languages: ["TypeScript", "JavaScript"],
      interests: ["web frameworks", "developer tools"],
      goal: "features",
    });
    assertEquals(candidates.length, 1, `free-text query never ran; queried: ${queries.join(" | ")}`);
  } finally {
    restore();
  }
});

// --- B8b: an issue number from another repo drops only that recommendation ------------------
Deno.test("B8b HTTP: unverifiable issueNumber drops that item and keeps the rest", async () => {
  withKey();
  const restore = stubFetch((url) => {
    if (url.hostname === "generativelanguage.googleapis.com") {
      return gemini(JSON.stringify({
        recommendations: [rec(1, { issueNumber: 10 }), rec(2, { issueNumber: 424242 })],
      }));
    }
    if (url.pathname === "/search/repositories") return json({ items: [repo(1), repo(2)] });
    return json([issue(10)]);
  });
  try {
    const res = await handleRequest(post(beginner));
    const body = await res.json();
    assertEquals(res.status, 200, `got ${res.status} ${body?.error?.code}`);
    assertEquals(body.recommendations.length, 1);
    assertEquals(body.recommendations[0].repository.id, 1);
    assertEquals(body.recommendations[0].issue.number, 10);
  } finally {
    restore();
  }
});

// --- B10: one transient Gemini 500 should not fail the request ------------------------------
Deno.test("B10 HTTP: a single transient Gemini 500 is retried", async () => {
  withKey();
  let geminiCalls = 0;
  const restore = stubFetch((url) => {
    if (url.hostname === "generativelanguage.googleapis.com") {
      geminiCalls++;
      return geminiCalls === 1
        ? json({ error: { code: 500, message: "Internal error encountered.", status: "INTERNAL" } }, 500)
        : gemini(JSON.stringify({ recommendations: [rec(1)] }));
    }
    if (url.pathname === "/search/repositories") return json({ items: [repo(1)] });
    return json([issue(10)]);
  });
  try {
    const res = await handleRequest(post(beginner));
    await res.body?.cancel();
    assertEquals([res.status, geminiCalls], [200, 2]);
  } finally {
    restore();
  }
});

// --- B11: Gemini quota exhaustion reported as RATE_LIMITED/429, not MODEL_ERROR/502 ----------
Deno.test("B11 HTTP: Gemini 429 returns 429 RATE_LIMITED", async () => {
  withKey();
  const restore = stubFetch((url) => {
    if (url.hostname === "generativelanguage.googleapis.com") {
      return json({ error: { code: 429, message: "Resource has been exhausted (e.g. check quota).", status: "RESOURCE_EXHAUSTED" } }, 429);
    }
    if (url.pathname === "/search/repositories") return json({ items: [repo(1)] });
    return json([issue(10)]);
  });
  try {
    const res = await handleRequest(post(beginner));
    const body = await res.json();
    assertEquals([res.status, body.error.code, body.error.retryable], [429, "RATE_LIMITED", true]);
  } finally {
    restore();
  }
});
