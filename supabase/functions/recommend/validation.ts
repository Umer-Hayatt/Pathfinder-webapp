// OpenSourceMatch Request Validation
// Strictly adheres to DRD.md bounds, trimming, deduplication, and field rejection.

import type { UserProfile, ExperienceLevel, GitExperience, ContributionGoal } from "./types.ts";

export interface ValidationSuccess {
  ok: true;
  profile: UserProfile;
}

export interface ValidationFailure {
  ok: false;
  code: "INVALID_PROFILE" | "INVALID_JSON" | "REQUEST_TOO_LARGE";
  message: string;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

const VALID_LEVELS: Set<string> = new Set(["beginner", "intermediate", "advanced"]);
const VALID_GIT_EXP: Set<string> = new Set(["none", "basic", "comfortable"]);
const VALID_GOALS: Set<string> = new Set([
  "first_contribution",
  "portfolio",
  "learn_technology",
  "documentation",
  "bugs_tests",
  "features",
]);

const ALLOWED_KEYS = new Set([
  "level",
  "languages",
  "skills",
  "interests",
  "gitExperience",
  "goal",
  "context",
]);

export function cleanAndDedupeStringArray(
  arr: unknown,
  fieldName: string,
  minItems: number,
  maxItems: number,
  maxItemLength: number,
): { ok: true; values: string[] } | { ok: false; message: string } {
  if (!Array.isArray(arr)) {
    return { ok: false, message: `'${fieldName}' must be an array of strings.` };
  }

  const seen = new Set<string>();
  const cleaned: string[] = [];

  for (const item of arr) {
    if (typeof item !== "string") {
      return { ok: false, message: `All items in '${fieldName}' must be strings.` };
    }
    const trimmed = item.trim();
    if (trimmed.length === 0) continue;
    if (trimmed.length > maxItemLength) {
      return {
        ok: false,
        message: `Items in '${fieldName}' must not exceed ${maxItemLength} characters.`,
      };
    }
    const lower = trimmed.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      cleaned.push(trimmed);
    }
  }

  if (cleaned.length < minItems) {
    return {
      ok: false,
      message: `'${fieldName}' must contain at least ${minItems} item(s).`,
    };
  }

  if (cleaned.length > maxItems) {
    return {
      ok: false,
      message: `'${fieldName}' must contain at most ${maxItems} items.`,
    };
  }

  return { ok: true, values: cleaned };
}

export function validateUserProfile(body: unknown): ValidationResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      ok: false,
      code: "INVALID_PROFILE",
      message: "Request body must be a JSON object.",
    };
  }

  const record = body as Record<string, unknown>;

  // Reject unknown fields
  for (const key of Object.keys(record)) {
    if (!ALLOWED_KEYS.has(key)) {
      return {
        ok: false,
        code: "INVALID_PROFILE",
        message: `Unknown field '${key}' is not allowed in profile.`,
      };
    }
  }

  // Validate level
  if (typeof record.level !== "string" || !VALID_LEVELS.has(record.level)) {
    return {
      ok: false,
      code: "INVALID_PROFILE",
      message: "'level' is required and must be 'beginner', 'intermediate', or 'advanced'.",
    };
  }
  const level = record.level as ExperienceLevel;

  // Validate languages (1-10, max 60 chars)
  const langResult = cleanAndDedupeStringArray(record.languages, "languages", 1, 10, 60);
  if (!langResult.ok) {
    return { ok: false, code: "INVALID_PROFILE", message: langResult.message };
  }
  const languages = langResult.values;

  // Validate interests (1-10, max 60 chars)
  const intResult = cleanAndDedupeStringArray(record.interests, "interests", 1, 10, 60);
  if (!intResult.ok) {
    return { ok: false, code: "INVALID_PROFILE", message: intResult.message };
  }
  const interests = intResult.values;

  // Validate goal
  if (typeof record.goal !== "string" || !VALID_GOALS.has(record.goal)) {
    return {
      ok: false,
      code: "INVALID_PROFILE",
      message:
        "'goal' is required and must be one of: first_contribution, portfolio, learn_technology, documentation, bugs_tests, features.",
    };
  }
  const goal = record.goal as ContributionGoal;

  const profile: UserProfile = {
    level,
    languages,
    interests,
    goal,
  };

  // Optional: skills (0-10, max 60 chars)
  if (record.skills !== undefined && record.skills !== null) {
    const skillsResult = cleanAndDedupeStringArray(record.skills, "skills", 0, 10, 60);
    if (!skillsResult.ok) {
      return { ok: false, code: "INVALID_PROFILE", message: skillsResult.message };
    }
    if (skillsResult.values.length > 0) {
      profile.skills = skillsResult.values;
    }
  }

  // Optional: gitExperience
  if (record.gitExperience !== undefined && record.gitExperience !== null) {
    if (typeof record.gitExperience !== "string" || !VALID_GIT_EXP.has(record.gitExperience)) {
      return {
        ok: false,
        code: "INVALID_PROFILE",
        message: "'gitExperience' must be 'none', 'basic', or 'comfortable'.",
      };
    }
    profile.gitExperience = record.gitExperience as GitExperience;
  }

  // Optional: context (max 1000 chars)
  if (record.context !== undefined && record.context !== null) {
    if (typeof record.context !== "string") {
      return {
        ok: false,
        code: "INVALID_PROFILE",
        message: "'context' must be a string.",
      };
    }
    const trimmed = record.context.trim();
    if (trimmed.length > 1000) {
      return {
        ok: false,
        code: "INVALID_PROFILE",
        message: "'context' must not exceed 1,000 characters.",
      };
    }
    if (trimmed.length > 0) {
      profile.context = trimmed;
    }
  }

  return { ok: true, profile };
}
