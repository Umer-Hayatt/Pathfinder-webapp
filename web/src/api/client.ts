// OpenSourceMatch API Client
// Handles mock simulation and live backend invocations.

import type {
  UserProfile,
  RecommendationResponse,
  ApiErrorResponse,
  ApiErrorCode,
} from '../types/api';

export class ClientApiError extends Error {
  code: ApiErrorCode | 'NETWORK_ERROR' | 'TIMEOUT_ERROR' | 'UNKNOWN_ERROR';
  retryable: boolean;
  requestId?: string;

  constructor(
    message: string,
    code: ApiErrorCode | 'NETWORK_ERROR' | 'TIMEOUT_ERROR' | 'UNKNOWN_ERROR',
    retryable: boolean,
    requestId?: string
  ) {
    super(message);
    this.name = 'ClientApiError';
    this.code = code;
    this.retryable = retryable;
    this.requestId = requestId;
  }
}

export interface RecommendationRequestOptions {
  mockScenario?: string;
  userSignal?: AbortSignal;
}

export async function getRecommendations(
  profile: UserProfile,
  options: RecommendationRequestOptions = {}
): Promise<RecommendationResponse> {
  const isMock = import.meta.env.VITE_USE_MOCK === 'true';

  if (isMock) {
    // Dynamic import to allow tree-shaking when VITE_USE_MOCK is false
    const { simulateMockRequest } = await import('./mock');
    try {
      return await simulateMockRequest(
        profile,
        options.mockScenario as any,
        options.userSignal
      );
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw err;
      }
      if (err.apiError) {
        const apiErr: ApiErrorResponse = err.apiError;
        throw new ClientApiError(
          apiErr.error.message,
          apiErr.error.code,
          apiErr.error.retryable,
          apiErr.requestId
        );
      }
      throw new ClientApiError(
        err.message || 'An unexpected mock error occurred',
        'UNKNOWN_ERROR',
        false
      );
    }
  }

  // --- LIVE BACKEND INVOCATION ---
  const apiUrl =
    import.meta.env.VITE_API_URL ||
    'https://<project-ref>.supabase.co/functions/v1/recommend';

  // 100-second timeout budget matching DRD.md specifications
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => {
    timeoutController.abort(new Error('UPSTREAM_TIMEOUT'));
  }, 100000);

  // Link caller signal with timeout controller
  const combinedAbortHandler = () => timeoutController.abort();
  if (options.userSignal) {
    if (options.userSignal.aborted) {
      clearTimeout(timeoutId);
      throw new DOMException('Request aborted by user', 'AbortError');
    }
    options.userSignal.addEventListener('abort', combinedAbortHandler);
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      // =========================================================================
      // TODO [INTEGRATION NEEDED]: Add backend invocation headers here
      // (e.g. Supabase anonymous key or function authorization header as documented
      // by the backend phase). Do NOT invent auth headers until backend is ready.
      // =========================================================================
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(profile),
      signal: timeoutController.signal,
    });

    clearTimeout(timeoutId);

    // Try parsing response as JSON
    let responseData: any;
    const rawText = await response.text();
    try {
      responseData = rawText ? JSON.parse(rawText) : {};
    } catch {
      throw new ClientApiError(
        `Server returned non-JSON response (HTTP ${response.status}): ${rawText.slice(0, 100)}`,
        'MODEL_ERROR',
        response.status >= 500
      );
    }

    if (!response.ok) {
      // Check if response matches DRD error contract: { error: { code, message, retryable }, requestId }
      if (responseData?.error && typeof responseData.error === 'object') {
        const { code, message, retryable } = responseData.error;
        throw new ClientApiError(
          message || 'Server error',
          code || 'UNKNOWN_ERROR',
          Boolean(retryable),
          responseData.requestId
        );
      }
      throw new ClientApiError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status === 429 ? 'RATE_LIMITED' : 'UNKNOWN_ERROR',
        response.status >= 500
      );
    }

    return responseData as RecommendationResponse;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (options.userSignal?.aborted) {
      throw new DOMException('Request aborted by user', 'AbortError');
    }
    if (timeoutController.signal.aborted && err?.message === 'UPSTREAM_TIMEOUT') {
      throw new ClientApiError(
        'Request exceeded 100s timeout budget.',
        'UPSTREAM_TIMEOUT',
        true
      );
    }
    if (err instanceof ClientApiError) {
      throw err;
    }
    throw new ClientApiError(
      err?.message || 'Network error connecting to recommendation service',
      'NETWORK_ERROR',
      true
    );
  } finally {
    if (options.userSignal) {
      options.userSignal.removeEventListener('abort', combinedAbortHandler);
    }
  }
}
