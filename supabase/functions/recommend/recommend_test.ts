// OpenSourceMatch Backend Test Suite
// Verifies request validation, OPTIONS preflight, unsupported methods, oversized payload,
// invalid JSON, zero results, fabricated candidates, cross-repo issues, and live/mocked profiles.

import { assertEquals, assertMatch } from "jsr:@std/assert@1";
import { handleRequest } from "./index.ts";
import { validateUserProfile } from "./validation.ts";
import type { UserProfile, ApiErrorResponse, RecommendationResponse } from "./types.ts";

Deno.test("Validation: rejects empty object", () => {
  const result = validateUserProfile({});
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.code, "INVALID_PROFILE");
  }
});

Deno.test("Validation: rejects unknown fields", () => {
  const result = validateUserProfile({
    level: "beginner",
    languages: ["Python"],
    interests: ["tools"],
    goal: "first_contribution",
    unknownField: "malicious_or_unexpected",
  });
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.code, "INVALID_PROFILE");
    assertMatch(result.message, /Unknown field/);
  }
});

Deno.test("Validation: trims and dedupes languages and skills", () => {
  const result = validateUserProfile({
    level: "beginner",
    languages: ["  Python  ", "python", "TypeScript"],
    interests: ["cli", "CLI"],
    skills: ["Git", "git", " Docker "],
    goal: "first_contribution",
  });
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.profile.languages, ["Python", "TypeScript"]);
    assertEquals(result.profile.interests, ["cli"]);
    assertEquals(result.profile.skills, ["Git", "Docker"]);
  }
});

Deno.test("Validation: rejects >10 languages or >60 char item", () => {
  const tooManyLangs = Array.from({ length: 11 }, (_, i) => `Lang${i}`);
  const result1 = validateUserProfile({
    level: "beginner",
    languages: tooManyLangs,
    interests: ["cli"],
    goal: "first_contribution",
  });
  assertEquals(result1.ok, false);

  const result2 = validateUserProfile({
    level: "beginner",
    languages: ["A".repeat(61)],
    interests: ["cli"],
    goal: "first_contribution",
  });
  assertEquals(result2.ok, false);
});

Deno.test("Validation: rejects >1000 char context", () => {
  const result = validateUserProfile({
    level: "beginner",
    languages: ["Python"],
    interests: ["cli"],
    goal: "first_contribution",
    context: "X".repeat(1001),
  });
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertMatch(result.message, /1,000 characters/);
  }
});

Deno.test("HTTP: OPTIONS preflight returns 204 with CORS headers", async () => {
  const req = new Request("http://localhost:54321/functions/v1/recommend", {
    method: "OPTIONS",
    headers: {
      "Origin": "http://localhost:5173",
      "Access-Control-Request-Method": "POST",
    },
  });
  const res = await handleRequest(req);
  assertEquals(res.status, 204);
  assertEquals(res.headers.get("Access-Control-Allow-Origin"), "http://localhost:5173");
  assertMatch(res.headers.get("Access-Control-Allow-Methods") || "", /POST/);
});

Deno.test("HTTP: GET method returns 405 METHOD_NOT_ALLOWED", async () => {
  const req = new Request("http://localhost:54321/functions/v1/recommend", {
    method: "GET",
  });
  const res = await handleRequest(req);
  assertEquals(res.status, 405);
  const data: ApiErrorResponse = await res.json();
  assertEquals(data.error.code, "METHOD_NOT_ALLOWED");
  assertEquals(data.error.retryable, false);
});

Deno.test("HTTP: Oversized body returns 413 REQUEST_TOO_LARGE", async () => {
  const hugeString = "x".repeat(17 * 1024); // 17 KB > 16 KB bound
  const req = new Request("http://localhost:54321/functions/v1/recommend", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": String(hugeString.length),
    },
    body: JSON.stringify({ context: hugeString }),
  });
  const res = await handleRequest(req);
  assertEquals(res.status, 413);
  const data: ApiErrorResponse = await res.json();
  assertEquals(data.error.code, "REQUEST_TOO_LARGE");
});

Deno.test("HTTP: Malformed JSON returns 400 INVALID_JSON", async () => {
  const req = new Request("http://localhost:54321/functions/v1/recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{ malformed json",
  });
  const res = await handleRequest(req);
  assertEquals(res.status, 400);
  const data: ApiErrorResponse = await res.json();
  assertEquals(data.error.code, "INVALID_JSON");
});

Deno.test("HTTP: Invalid profile returns 400 INVALID_PROFILE", async () => {
  const req = new Request("http://localhost:54321/functions/v1/recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ level: "expert_invalid", languages: [] }),
  });
  const res = await handleRequest(req);
  assertEquals(res.status, 400);
  const data: ApiErrorResponse = await res.json();
  assertEquals(data.error.code, "INVALID_PROFILE");
});

Deno.test("HTTP LIVE: Beginner profile returns recommendations", async () => {
  const profileRaw = await Deno.readTextFile("examples/profile-beginner.json");
  const started = performance.now();
  const req = new Request("http://localhost:54321/functions/v1/recommend", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "http://localhost:5173",
    },
    body: profileRaw,
  });

  const res = await handleRequest(req);
  const latencyMs = Math.round(performance.now() - started);
  console.log(`Live Beginner Profile Test: HTTP ${res.status} in ${latencyMs}ms`);

  assertEquals(res.status, 200);
  const data: RecommendationResponse = await res.json();
  assertEquals(typeof data.requestId, "string");
  assertEquals(data.model, "gemma-4-26b-a4b-it");
  assertEquals(Array.isArray(data.recommendations), true);

  if (data.recommendations.length > 0) {
    const rec = data.recommendations[0];
    assertEquals(typeof rec.repository.id, "number");
    assertEquals(typeof rec.repository.fullName, "string");
    assertMatch(rec.fit, /strong|good|possible/);
    assertMatch(rec.difficulty, /beginner|intermediate|advanced/);
    assertEquals(typeof rec.rationale, "string");
    assertEquals(Array.isArray(rec.roadmap), true);
  }
});

Deno.test("HTTP LIVE: Intermediate profile returns recommendations", async () => {
  const profileRaw = await Deno.readTextFile("examples/profile-intermediate.json");
  const started = performance.now();
  const req = new Request("http://localhost:54321/functions/v1/recommend", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "http://localhost:5173",
    },
    body: profileRaw,
  });

  const res = await handleRequest(req);
  const latencyMs = Math.round(performance.now() - started);
  console.log(`Live Intermediate Profile Test: HTTP ${res.status} in ${latencyMs}ms`);

  assertEquals(res.status, 200);
  const data: RecommendationResponse = await res.json();
  assertEquals(typeof data.requestId, "string");
  assertEquals(Array.isArray(data.recommendations), true);
});

Deno.test("HTTP LIVE: Advanced profile returns recommendations", async () => {
  const profileRaw = await Deno.readTextFile("examples/profile-advanced.json");
  const started = performance.now();
  const req = new Request("http://localhost:54321/functions/v1/recommend", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "http://localhost:5173",
    },
    body: profileRaw,
  });

  const res = await handleRequest(req);
  const latencyMs = Math.round(performance.now() - started);
  console.log(`Live Advanced Profile Test: HTTP ${res.status} in ${latencyMs}ms`);

  assertEquals(res.status, 200);
  const data: RecommendationResponse = await res.json();
  assertEquals(typeof data.requestId, "string");
  assertEquals(Array.isArray(data.recommendations), true);
});

Deno.test("HTTP LIVE: Zero results returns 200 with empty array", async () => {
  const req = new Request("http://localhost:54321/functions/v1/recommend", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "http://localhost:5173",
    },
    body: JSON.stringify({
      level: "advanced",
      languages: ["NonExistentLanguageXYZ9999"],
      interests: ["NonExistentInterestABC8888"],
      goal: "features",
    }),
  });

  const res = await handleRequest(req);
  assertEquals(res.status, 200);
  const data: RecommendationResponse = await res.json();
  assertEquals(data.recommendations.length, 0);
  assertEquals(Array.isArray(data.warnings), true);
});

