// OpenSourceMatch Mock Fixtures and Simulator
// Distinctive string for verification: FIXTURE_CANDIDATE_PALETTE_TEST_MOCK_DATA
import type {
  RecommendationResponse,
  ApiErrorResponse,
  UserProfile,
  ApiErrorCode,
} from '../types/api';

export type MockScenario =
  | 'auto'
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'issue_less'
  | 'zero_results'
  | 'error_invalid_profile'
  | 'error_invalid_json'
  | 'error_method_not_allowed'
  | 'error_request_too_large'
  | 'error_rate_limited'
  | 'error_github_error'
  | 'error_model_error'
  | 'error_invalid_model_output'
  | 'error_service_not_configured'
  | 'error_upstream_timeout';

export const MOCK_FIXTURE_BEGINNER: RecommendationResponse = {
  requestId: 'mock-req-beginner-001',
  model: 'gemma-4-26b-a4b-it',
  retrievedAt: new Date().toISOString(),
  recommendations: [
    {
      repository: {
        id: 11223344,
        fullName: 'psf/requests-html',
        description: 'HTML Parsing for Humans (Pythonic HTML Parsing for Humans)',
        url: 'https://github.com/psf/requests-html',
        language: 'Python',
        topics: ['python', 'scraping', 'html', 'parser'],
        license: 'MIT',
        stars: 13400,
        pushedAt: '2024-08-10T14:32:00Z',
      },
      issue: {
        number: 412,
        title: 'Add type annotations to response helper utilities',
        url: 'https://github.com/psf/requests-html/issues/412',
        labels: ['good first issue', 'help wanted', 'typing'],
      },
      fit: 'strong',
      difficulty: 'beginner',
      rationale:
        'Matches your Python background and first contribution goal. The issue asks for typing improvements in isolated helper functions with existing unit tests.',
      requiredSkills: ['Python 3', 'Type hints', 'pytest'],
      skillsToLearn: ['mypy', 'Sphinx docstrings'],
      skillGaps: ['Familiarity with pyquery internals'],
      firstAction: 'Fork the repository and run existing tests using pytest tests/.',
      roadmap: [
        'Fork and clone psf/requests-html to your local machine.',
        'Set up a virtual environment and run the test suite with pytest.',
        'Read the issue thread and identify helpers.py as the target file.',
        'Add typing annotations to function parameters and return values.',
        'Run mypy helpers.py to verify type soundness without regressions.',
        'Submit a pull request referencing issue #412 with tests passing.',
      ],
      contributionGuideUrl:
        'https://github.com/psf/requests-html/blob/master/CONTRIBUTING.md',
      limitations: [
        'Issue was verified open at retrievedAt timestamp; verify maintainer activity on GitHub before starting.',
      ],
    },
    {
      repository: {
        id: 22334455,
        fullName: 'pallets/click',
        description: 'Python composable command line interface toolkit',
        url: 'https://github.com/pallets/click',
        language: 'Python',
        topics: ['python', 'cli', 'toolkit'],
        license: 'BSD-3-Clause',
        stars: 15600,
        pushedAt: '2024-09-12T10:20:00Z',
      },
      issue: {
        number: 2780,
        title: 'Clarify docstring examples for option prompt parameter',
        url: 'https://github.com/pallets/click/issues/2780',
        labels: ['documentation', 'good first issue'],
      },
      fit: 'good',
      difficulty: 'beginner',
      rationale:
        'Ideal first contribution for learning Pallets contribution workflow. Focuses on clarifying documentation and doctests without altering core runtime logic.',
      requiredSkills: ['Python', 'Git', 'Markdown'],
      skillsToLearn: ['Sphinx documentation', 'tox test runner'],
      skillGaps: ['Familiarity with click parameter evaluation'],
      firstAction: 'Read the Pallets contribution guide and check the existing docs folder.',
      roadmap: [
        'Fork pallets/click and clone your fork locally.',
        'Install dev dependencies using pip install -e .[dev].',
        'Review the option prompt examples in docs/options.rst.',
        'Update docstring text and execute doctests with pytest --doctest-modules.',
        'Commit your changes with a descriptive conventional commit message.',
      ],
      contributionGuideUrl:
        'https://github.com/pallets/click/blob/main/CONTRIBUTING.rst',
      limitations: [
        'Documentation issue; verify no duplicate open pull requests exist.',
      ],
    },
  ],
  warnings: [],
};

export const MOCK_FIXTURE_INTERMEDIATE: RecommendationResponse = {
  requestId: 'mock-req-intermediate-002',
  model: 'gemma-4-26b-a4b-it',
  retrievedAt: new Date().toISOString(),
  recommendations: [
    {
      repository: {
        id: 33445566,
        fullName: 'facebook/docusaurus',
        description: 'Easy to maintain open source documentation websites.',
        url: 'https://github.com/facebook/docusaurus',
        language: 'TypeScript',
        topics: ['react', 'documentation', 'typescript', 'ssg'],
        license: 'MIT',
        stars: 54200,
        pushedAt: '2024-09-25T08:15:00Z',
      },
      issue: {
        number: 9821,
        title: 'Improve code block copy button aria-live announcement',
        url: 'https://github.com/facebook/docusaurus/issues/9821',
        labels: ['accessibility', 'difficulty: starter', 'status: accepting pr'],
      },
      fit: 'strong',
      difficulty: 'intermediate',
      rationale:
        'Leverages your TypeScript and React experience for an accessible UI improvement in a widely used documentation framework.',
      requiredSkills: ['React', 'TypeScript', 'ARIA accessibility'],
      skillsToLearn: ['Monorepo toolchains (Yarn Berry)', 'Screen reader testing'],
      skillGaps: ['Docusaurus theme plugin architecture'],
      firstAction:
        'Clone the repo and run yarn start in packages/docusaurus-theme-classic.',
      roadmap: [
        'Fork and clone facebook/docusaurus locally.',
        'Install dependencies with yarn install and build core packages.',
        'Locate CodeBlock component in packages/docusaurus-theme-classic.',
        'Implement aria-live polite region for feedback on click.',
        'Add unit and end-to-end tests for keyboard focus and announcement.',
        'Open a pull request following Docusaurus contribution guidelines.',
      ],
      contributionGuideUrl:
        'https://github.com/facebook/docusaurus/blob/main/CONTRIBUTING.md',
      limitations: [
        'High maintainer activity; check recent PRs to ensure nobody has reserved the ticket.',
      ],
    },
    {
      repository: {
        id: 44556677,
        fullName: 'shadcn-ui/ui',
        description:
          'Beautifully designed components that you can copy and paste into your apps.',
        url: 'https://github.com/shadcn-ui/ui',
        language: 'TypeScript',
        topics: ['react', 'tailwind', 'components', 'radix-ui'],
        license: 'MIT',
        stars: 71000,
        pushedAt: '2024-09-29T18:00:00Z',
      },
      issue: {
        number: 4892,
        title: 'Form component: add support for uncontrolled defaultValue resets',
        url: 'https://github.com/shadcn-ui/ui/issues/4892',
        labels: ['bug', 'components'],
      },
      fit: 'good',
      difficulty: 'intermediate',
      rationale:
        'Matches intermediate React knowledge. Involves react-hook-form integration and custom component wrapper lifecycle handling.',
      requiredSkills: ['React', 'TypeScript', 'react-hook-form'],
      skillsToLearn: ['Radix Primitives internal event propagation'],
      skillGaps: ['CLI registry generator scripts'],
      firstAction:
        'Inspect packages/react/src/form.tsx and run tests with pnpm test.',
      roadmap: [
        'Fork and clone shadcn-ui/ui.',
        'Run pnpm install and pnpm build to initialize local workspace packages.',
        'Reproduce the form reset issue in a minimal test fixture.',
        'Adjust the FormField value synchronization hook.',
        'Verify existing form examples in the docs package work as expected.',
        'Submit a clean pull request with repro test case.',
      ],
      contributionGuideUrl:
        'https://github.com/shadcn-ui/ui/blob/main/CONTRIBUTING.md',
      limitations: [
        'Large influx of PRs; ensure maintainers confirm acceptance on issue thread.',
      ],
    },
  ],
  warnings: [],
};

export const MOCK_FIXTURE_ADVANCED: RecommendationResponse = {
  requestId: 'mock-req-advanced-003',
  model: 'gemma-4-26b-a4b-it',
  retrievedAt: new Date().toISOString(),
  recommendations: [
    {
      repository: {
        id: 55667788,
        fullName: 'etcd-io/etcd',
        description:
          'Distributed reliable key-value store for the most critical data of a distributed system',
        url: 'https://github.com/etcd-io/etcd',
        language: 'Go',
        topics: ['distributed-systems', 'raft', 'go', 'k8s'],
        license: 'Apache-2.0',
        stars: 47200,
        pushedAt: '2024-09-28T19:40:00Z',
      },
      issue: {
        number: 18450,
        title: 'raft: optimize heartbeat batching under saturated network links',
        url: 'https://github.com/etcd-io/etcd/issues/18450',
        labels: ['area/raft', 'performance', 'help wanted'],
      },
      fit: 'possible',
      difficulty: 'advanced',
      rationale:
        'Aligns with advanced systems programming and concurrency goals. Requires deep familiarity with Raft consensus protocol and Go network profiling.',
      requiredSkills: ['Go', 'Distributed consensus (Raft)', 'pprof profiling'],
      skillsToLearn: ['etcd test cluster harness', 'failover simulation'],
      skillGaps: ['etcd v3 storage engine specifics'],
      firstAction:
        'Review raft/raft.go tick heartbeat scheduler and discuss proposal on the issue.',
      roadmap: [
        'Set up Go 1.22+ development environment and run etcd test suite.',
        'Trace heartbeat execution flow in server/etcdserver/api/v3rpc/.',
        'Write benchmark tests measuring memory allocations during network saturation.',
        'Draft an architectural approach and solicit maintainer feedback on the issue thread.',
        'Implement batched heartbeat scheduling behind a feature flag.',
        'Submit PR with regression benchmarks and Raft formal state tests.',
      ],
      contributionGuideUrl:
        'https://github.com/etcd-io/etcd/blob/main/CONTRIBUTING.md',
      limitations: [
        'Complex review lifecycle; maintainers require detailed design proposals before PR.',
      ],
    },
  ],
  warnings: [],
};

export const MOCK_FIXTURE_ISSUE_LESS: RecommendationResponse = {
  requestId: 'mock-req-issueless-004',
  model: 'gemma-4-26b-a4b-it',
  retrievedAt: new Date().toISOString(),
  recommendations: [
    {
      repository: {
        id: 66778899,
        fullName: 'BurntSushi/ripgrep',
        description:
          'ripgrep recursively searches directories for a regex pattern while respecting your gitignore',
        url: 'https://github.com/BurntSushi/ripgrep',
        language: 'Rust',
        topics: ['rust', 'search', 'cli', 'performance'],
        license: 'MIT',
        stars: 49800,
        pushedAt: '2024-09-20T11:00:00Z',
      },
      issue: null,
      fit: 'good',
      difficulty: 'intermediate',
      rationale:
        'Strong language match for Rust CLI tooling. No unassigned beginner/intermediate issues are currently open, but the codebase has clean documentation and tests.',
      requiredSkills: ['Rust', 'Regular expressions', 'Command line interfaces'],
      skillsToLearn: ['Cargo benchmarking', 'cross-platform file traversal'],
      skillGaps: ['SIMD optimization in grep-regex engine'],
      firstAction: 'Read doc/ARCHITECTURE.md and run cargo test --all.',
      roadmap: [
        'Clone BurntSushi/ripgrep and build locally using cargo build.',
        'Review open discussions to identify documentation or test coverage needs.',
        'Examine existing test harness in tests/ folder.',
        'Draft a small documentation or test improvement after maintainer discussion.',
      ],
      contributionGuideUrl:
        'https://github.com/BurntSushi/ripgrep/blob/master/GUIDELINES.md',
      limitations: [
        'No suitable open issue found meeting newcomer criteria; repository included for exploration only.',
      ],
    },
  ],
  warnings: ['No open beginner issues found for candidate repository.'],
};

export const MOCK_FIXTURE_ZERO_RESULTS: RecommendationResponse = {
  requestId: 'mock-req-zero-005',
  model: 'gemma-4-26b-a4b-it',
  retrievedAt: new Date().toISOString(),
  recommendations: [],
  warnings: [
    'No public repositories matched the selected language and skill combinations. Consider broadening your profile by removing restrictive frameworks or selecting general languages.',
  ],
};

export const MOCK_ERRORS: Record<ApiErrorCode, ApiErrorResponse> = {
  INVALID_PROFILE: {
    requestId: 'mock-err-400-01',
    error: {
      code: 'INVALID_PROFILE',
      message:
        'The submitted developer profile failed validation: languages array must contain 1 to 10 valid strings.',
      retryable: false,
    },
  },
  INVALID_JSON: {
    requestId: 'mock-err-400-02',
    error: {
      code: 'INVALID_JSON',
      message: 'Request body could not be parsed as valid JSON.',
      retryable: false,
    },
  },
  METHOD_NOT_ALLOWED: {
    requestId: 'mock-err-405-01',
    error: {
      code: 'METHOD_NOT_ALLOWED',
      message: 'Method not allowed. Use POST /functions/v1/recommend.',
      retryable: false,
    },
  },
  REQUEST_TOO_LARGE: {
    requestId: 'mock-err-413-01',
    error: {
      code: 'REQUEST_TOO_LARGE',
      message: 'Request payload exceeded maximum size limit of 16 KB.',
      retryable: false,
    },
  },
  RATE_LIMITED: {
    requestId: 'mock-err-429-01',
    error: {
      code: 'RATE_LIMITED',
      message:
        'Rate limit reached. Please wait a moment before sending another recommendation request.',
      retryable: true,
    },
  },
  GITHUB_ERROR: {
    requestId: 'mock-err-502-01',
    error: {
      code: 'GITHUB_ERROR',
      message:
        'Upstream GitHub API request failed while querying candidate repositories.',
      retryable: true,
    },
  },
  MODEL_ERROR: {
    requestId: 'mock-err-502-02',
    error: {
      code: 'MODEL_ERROR',
      message: 'Selected Gemma model endpoint returned an unexpected error.',
      retryable: true,
    },
  },
  INVALID_MODEL_OUTPUT: {
    requestId: 'mock-err-502-03',
    error: {
      code: 'INVALID_MODEL_OUTPUT',
      message:
        'Model inference response failed schema validation and could not be repaired.',
      retryable: true,
    },
  },
  SERVICE_NOT_CONFIGURED: {
    requestId: 'mock-err-503-01',
    error: {
      code: 'SERVICE_NOT_CONFIGURED',
      message: 'Backend service is missing required environment configuration.',
      retryable: false,
    },
  },
  UPSTREAM_TIMEOUT: {
    requestId: 'mock-err-504-01',
    error: {
      code: 'UPSTREAM_TIMEOUT',
      message:
        'Upstream retrieval and model inference exceeded the 90-second time budget.',
      retryable: true,
    },
  },
};

export async function simulateMockRequest(
  profile: UserProfile,
  scenario: MockScenario = 'auto',
  signal?: AbortSignal
): Promise<RecommendationResponse> {
  // Simulate honest 3-6 second delay
  const delayMs = 3000 + Math.floor(Math.random() * 2000);

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => resolve(), delayMs);
    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new DOMException('Request aborted by user', 'AbortError'));
      });
    }
  });

  // Handle specific error scenarios
  if (scenario.startsWith('error_')) {
    const errorCode = scenario.replace('error_', '').toUpperCase() as ApiErrorCode;
    const errorResponse = MOCK_ERRORS[errorCode] || MOCK_ERRORS.GITHUB_ERROR;
    const err = new Error(errorResponse.error.message) as Error & {
      apiError: ApiErrorResponse;
    };
    err.apiError = errorResponse;
    throw err;
  }

  if (scenario === 'issue_less') return MOCK_FIXTURE_ISSUE_LESS;
  if (scenario === 'zero_results') return MOCK_FIXTURE_ZERO_RESULTS;
  if (scenario === 'beginner') return MOCK_FIXTURE_BEGINNER;
  if (scenario === 'intermediate') return MOCK_FIXTURE_INTERMEDIATE;
  if (scenario === 'advanced') return MOCK_FIXTURE_ADVANCED;

  // Auto scenario: select fixture based on profile level
  if (profile.level === 'advanced') return MOCK_FIXTURE_ADVANCED;
  if (profile.level === 'intermediate') return MOCK_FIXTURE_INTERMEDIATE;
  return MOCK_FIXTURE_BEGINNER;
}
