import React from 'react';
import type { ClientApiError } from '../api/client';

interface ErrorStateProps {
  error: ClientApiError;
  onRetry: () => void;
  onReset: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  onRetry,
  onReset,
}) => {
  return (
    <div
      className="error-box"
      role="alert"
      aria-live="assertive"
    >
      <div className="error-badge">{error.code}</div>
      <div className="error-title">
        {error.retryable ? 'Temporary service error' : 'Unable to process request'}
      </div>
      <div className="error-message">{error.message}</div>

      {error.requestId && (
        <div className="error-request-id">Request ID: {error.requestId}</div>
      )}

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {error.retryable && (
          <button type="button" className="btn-primary" onClick={onRetry}>
            Retry request
          </button>
        )}
        <button
          type="button"
          className="btn-secondary"
          onClick={onReset}
          style={{ borderColor: 'var(--color-border-strong)' }}
        >
          Edit profile
        </button>
      </div>
    </div>
  );
};
