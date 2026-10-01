import React from 'react';
import type { RecommendationResponse } from '../types/api';
import { RecommendationCard } from './RecommendationCard';

interface RecommendationListProps {
  data: RecommendationResponse;
  onReset: () => void;
}

export const RecommendationList: React.FC<RecommendationListProps> = ({
  data,
  onReset,
}) => {
  const { recommendations, retrievedAt, model, warnings } = data;

  const formattedDate = retrievedAt
    ? new Date(retrievedAt).toLocaleString()
    : 'Unknown date';

  return (
    <section className="results-container" aria-label="Recommendation results">
      {/* Top Metadata and Actions */}
      <div className="results-meta">
        <div>
          <span>Model: {model}</span>
          <span style={{ margin: '0 8px' }}>•</span>
          <span>Retrieved: {formattedDate}</span>
        </div>
        <div className="results-actions">
          <button type="button" className="btn-secondary" onClick={onReset}>
            Edit profile
          </button>
        </div>
      </div>

      {/* Warnings Banner if any */}
      {warnings && warnings.length > 0 && (
        <div className="warnings-box" role="status">
          <strong>Retrieval notices:</strong>
          <ul>
            {warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Single Column List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {recommendations.map((item, idx) => (
          <RecommendationCard
            key={`${item.repository.id}-${idx}`}
            item={item}
            rank={idx + 1}
          />
        ))}
      </div>
    </section>
  );
};
