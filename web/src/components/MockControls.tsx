import React from 'react';
import type { UserProfile } from '../types/api';

interface MockControlsProps {
  currentScenario: string;
  onSelectScenario: (scenario: string, profileOverride?: UserProfile) => void;
  isLoading: boolean;
}

export const MockControls: React.FC<MockControlsProps> = ({
  currentScenario,
  onSelectScenario,
  isLoading,
}) => {
  return (
    <div style={{ marginBottom: '24px' }}>
      {/* Sample Data Banner */}
      <div className="mock-banner" role="status">
        <span className="mock-banner-dot" aria-hidden="true" />
        <span>Sample data — not live results</span>
      </div>

      {/* Mock Toolbar */}
      <div className="mock-toolbar" style={{ marginTop: '12px' }}>
        <div className="mock-toolbar-title">
          Mock Testing Toolbar (VITE_USE_MOCK=true)
        </div>
        <div className="mock-toolbar-buttons">
          <button
            type="button"
            className={`mock-btn ${currentScenario === 'auto' ? 'active' : ''}`}
            disabled={isLoading}
            onClick={() => onSelectScenario('auto')}
          >
            Auto (By Form)
          </button>
          <button
            type="button"
            className={`mock-btn ${currentScenario === 'beginner' ? 'active' : ''}`}
            disabled={isLoading}
            onClick={() =>
              onSelectScenario('beginner', {
                level: 'beginner',
                languages: ['Python'],
                interests: ['developer tools'],
                skills: ['Git'],
                gitExperience: 'basic',
                goal: 'first_contribution',
                context: 'Looking for good first issue.',
              })
            }
          >
            Fixture: Beginner
          </button>
          <button
            type="button"
            className={`mock-btn ${currentScenario === 'intermediate' ? 'active' : ''}`}
            disabled={isLoading}
            onClick={() =>
              onSelectScenario('intermediate', {
                level: 'intermediate',
                languages: ['TypeScript'],
                interests: ['web frameworks', 'react'],
                skills: ['React', 'TypeScript'],
                gitExperience: 'comfortable',
                goal: 'features',
                context: 'Looking for frontend components.',
              })
            }
          >
            Fixture: Intermediate
          </button>
          <button
            type="button"
            className={`mock-btn ${currentScenario === 'advanced' ? 'active' : ''}`}
            disabled={isLoading}
            onClick={() =>
              onSelectScenario('advanced', {
                level: 'advanced',
                languages: ['Go'],
                interests: ['distributed systems'],
                skills: ['Go', 'Raft'],
                gitExperience: 'comfortable',
                goal: 'bugs_tests',
                context: 'Performance optimization.',
              })
            }
          >
            Fixture: Advanced
          </button>
          <button
            type="button"
            className={`mock-btn ${currentScenario === 'issue_less' ? 'active' : ''}`}
            disabled={isLoading}
            onClick={() =>
              onSelectScenario('issue_less', {
                level: 'intermediate',
                languages: ['Rust'],
                interests: ['CLI'],
                skills: ['Rust'],
                goal: 'learn_technology',
              })
            }
          >
            Fixture: Issue-less Repo
          </button>
          <button
            type="button"
            className={`mock-btn ${currentScenario === 'zero_results' ? 'active' : ''}`}
            disabled={isLoading}
            onClick={() => onSelectScenario('zero_results')}
          >
            Fixture: 0 Results
          </button>
        </div>

        {/* Error Simulation buttons */}
        <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', width: '100%' }}>
            Simulate DRD Error Codes:
          </span>
          {[
            { id: 'error_invalid_profile', label: '400 Profile' },
            { id: 'error_invalid_json', label: '400 JSON' },
            { id: 'error_method_not_allowed', label: '405 Method' },
            { id: 'error_request_too_large', label: '413 Size' },
            { id: 'error_rate_limited', label: '429 Rate' },
            { id: 'error_github_error', label: '502 GitHub' },
            { id: 'error_model_error', label: '502 Model' },
            { id: 'error_invalid_model_output', label: '502 Output' },
            { id: 'error_service_not_configured', label: '503 Config' },
            { id: 'error_upstream_timeout', label: '504 Timeout' },
          ].map((err) => (
            <button
              key={err.id}
              type="button"
              className={`mock-btn ${currentScenario === err.id ? 'active' : ''}`}
              style={{ fontSize: '0.72rem', padding: '1px 6px' }}
              disabled={isLoading}
              onClick={() => onSelectScenario(err.id)}
            >
              {err.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MockControls;
