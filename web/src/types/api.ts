// OpenSourceMatch API Types
// Strictly mirrors DRD.md request, response, and error specifications.

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export type GitExperience = 'none' | 'basic' | 'comfortable';

export type ContributionGoal =
  | 'first_contribution'
  | 'portfolio'
  | 'learn_technology'
  | 'documentation'
  | 'bugs_tests'
  | 'features';

export type FitCategory = 'strong' | 'good' | 'possible';

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export interface UserProfile {
  level: ExperienceLevel;
  languages: string[]; // 1-10 items, <= 60 chars each
  interests: string[]; // 1-10 items, <= 60 chars each
  skills?: string[]; // 0-10 items, <= 60 chars each
  gitExperience?: GitExperience;
  goal: ContributionGoal;
  context?: string; // <= 1000 chars
}

export interface RepositoryFact {
  id: number;
  fullName: string;
  description: string | null;
  url: string;
  language: string | null;
  topics: string[];
  license: string | null;
  stars: number | null;
  pushedAt: string | null;
}

export interface IssueFact {
  number: number;
  title: string;
  url: string;
  labels: string[];
}

export interface Recommendation {
  repository: RepositoryFact;
  issue: IssueFact | null;
  fit: FitCategory;
  difficulty: DifficultyLevel;
  rationale: string;
  requiredSkills: string[];
  skillsToLearn: string[];
  skillGaps: string[];
  firstAction: string;
  roadmap: string[]; // 3-6 ordered steps
  contributionGuideUrl: string | null;
  limitations: string[];
}

export interface RecommendationResponse {
  requestId: string;
  model: string;
  retrievedAt: string; // ISO 8601 string
  recommendations: Recommendation[]; // 0-5 items
  warnings?: string[];
}

export type ApiErrorCode =
  | 'INVALID_PROFILE'
  | 'INVALID_JSON'
  | 'METHOD_NOT_ALLOWED'
  | 'REQUEST_TOO_LARGE'
  | 'RATE_LIMITED'
  | 'GITHUB_ERROR'
  | 'MODEL_ERROR'
  | 'INVALID_MODEL_OUTPUT'
  | 'SERVICE_NOT_CONFIGURED'
  | 'UPSTREAM_TIMEOUT';

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  retryable: boolean;
}

export interface ApiErrorResponse {
  error: ApiError;
  requestId: string;
}
