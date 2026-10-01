import React from 'react';

interface EmptyStateProps {
  onReset: () => void;
  warnings?: string[];
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onReset, warnings }) => {
  return (
    <div
      className="empty-box"
      role="region"
      aria-label="No recommendations found"
    >
      <div className="empty-title">No matching opportunities found</div>
      <div className="empty-desc">
        No active repositories or open issues matched your exact combination of experience level,
        programming languages, and specific interests.
      </div>

      {warnings && warnings.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          {warnings.map((w, idx) => (
            <p key={idx} style={{ fontSize: '0.85rem', color: 'var(--color-warning-text)' }}>
              {w}
            </p>
          ))}
        </div>
      )}

      <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '8px' }}>
        Suggestions to broaden your search:
      </div>
      <ul className="empty-suggestions">
        <li>Select more common or general programming languages (e.g. Python, TypeScript, Go).</li>
        <li>Remove specific framework requirements to open up core utility libraries.</li>
        <li>Try switching the contribution goal to "first_contribution" or "documentation".</li>
        <li>Use broader topic interests like "developer tools" or "web frameworks".</li>
      </ul>

      <button type="button" className="btn-primary" onClick={onReset}>
        Adjust developer profile
      </button>
    </div>
  );
};
