import React from 'react';
import type { Recommendation } from '../types/api';

interface RecommendationCardProps {
  item: Recommendation;
  rank: number;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({ item, rank }) => {
  const {
    repository,
    issue,
    fit,
    difficulty,
    rationale,
    requiredSkills,
    skillsToLearn,
    skillGaps,
    firstAction,
    roadmap,
    contributionGuideUrl,
    limitations,
  } = item;

  const starsFormatted =
    repository.stars !== null && repository.stars !== undefined
      ? `${repository.stars.toLocaleString()} stars`
      : 'unknown stars';

  const pushedFormatted = repository.pushedAt
    ? `pushed ${repository.pushedAt.split('T')[0]}`
    : 'pushed unknown';

  const licenseFormatted = repository.license || 'unknown license';
  const languageFormatted = repository.language || 'unknown language';

  return (
    <article className="rec-card" aria-labelledby={`rec-title-${repository.id}`}>
      {/* Header */}
      <div className="rec-header">
        <div className="rec-title-row">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
              #{rank}
            </span>
            <h2 id={`rec-title-${repository.id}`} className="rec-repo-name">
              <a href={repository.url} target="_blank" rel="noopener noreferrer">
                {repository.fullName}
              </a>
            </h2>
          </div>

          <div className="rec-badge-row">
            <span className={`fit-tag fit-${fit}`}>Fit: {fit}</span>
            <span className="diff-tag">Difficulty: {difficulty}</span>
          </div>
        </div>

        {repository.description && (
          <p className="rec-repo-desc">{repository.description}</p>
        )}

        {/* Repository Facts */}
        <div className="rec-facts">
          <span>{languageFormatted}</span>
          <span>•</span>
          <span>{starsFormatted}</span>
          <span>•</span>
          <span>{licenseFormatted}</span>
          <span>•</span>
          <span>{pushedFormatted}</span>
          {contributionGuideUrl && (
            <>
              <span>•</span>
              <a href={contributionGuideUrl} target="_blank" rel="noopener noreferrer">
                Contribution guide
              </a>
            </>
          )}
        </div>
      </div>

      {/* Recommended Issue */}
      <div className="rec-issue-box">
        <div className="rec-issue-label">Target issue</div>
        {issue ? (
          <div>
            <div className="rec-issue-title">
              <a href={issue.url} target="_blank" rel="noopener noreferrer">
                #{issue.number} — {issue.title}
              </a>
            </div>
            {issue.labels && issue.labels.length > 0 && (
              <div className="rec-issue-labels">
                {issue.labels.map((lbl, idx) => (
                  <span key={idx} className="issue-label-tag">
                    {lbl}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="rec-no-issue">
            No specific unassigned issue recommended. Explore repository documentation or open discussions.
          </div>
        )}
      </div>

      {/* Rationale */}
      <div>
        <div className="rec-section-label">Why this matches your profile</div>
        <p className="rec-rationale">{rationale}</p>
      </div>

      {/* First Action */}
      <div>
        <div className="rec-section-label">Immediate next step</div>
        <div className="rec-action-box">{firstAction}</div>
      </div>

      {/* Skills Analysis */}
      <div>
        <div className="rec-section-label" style={{ marginBottom: '8px' }}>
          Skills and knowledge breakdown
        </div>
        <div className="rec-skills-grid">
          <div className="rec-skills-col">
            <div className="rec-skills-title">Required skills</div>
            <div className="rec-skill-items">
              {requiredSkills.length > 0 ? (
                requiredSkills.map((s, idx) => (
                  <span key={idx} className="rec-skill-tag">
                    {s}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>None specified</span>
              )}
            </div>
          </div>

          <div className="rec-skills-col">
            <div className="rec-skills-title">Skills you'll learn</div>
            <div className="rec-skill-items">
              {skillsToLearn.length > 0 ? (
                skillsToLearn.map((s, idx) => (
                  <span key={idx} className="rec-skill-tag">
                    {s}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>None specified</span>
              )}
            </div>
          </div>

          <div className="rec-skills-col">
            <div className="rec-skills-title">Identified gaps</div>
            <div className="rec-skill-items">
              {skillGaps.length > 0 ? (
                skillGaps.map((s, idx) => (
                  <span key={idx} className="rec-skill-tag">
                    {s}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>None detected</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contribution Roadmap */}
      {roadmap && roadmap.length > 0 && (
        <div>
          <div className="rec-section-label">Suggested contribution roadmap</div>
          <ol className="rec-roadmap-list">
            {roadmap.map((step, idx) => (
              <li key={idx}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      {/* Evidence Limitations */}
      {limitations && limitations.length > 0 && (
        <div className="rec-limitations">
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>Evidence limitations</div>
          <ul>
            {limitations.map((lim, idx) => (
              <li key={idx}>{lim}</li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
};
