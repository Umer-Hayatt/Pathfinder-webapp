import React from 'react';

export const AboutSection: React.FC = () => {
  return (
    <section className="about-section" aria-labelledby="about-heading">
      <h3 id="about-heading" className="about-title">
        How Pathfinder works and limitations
      </h3>
      <div className="about-grid">
        <div>
          <span className="about-item-title">Evidence-based matching: </span>
          <span>
            Candidate repositories and open issue tickets are retrieved directly from the GitHub REST API.
            An open-weights Gemma model evaluates repository complexity, issue discussion, and contribution guidelines
            against your stated language skills and learning goals.
          </span>
        </div>

        <div>
          <span className="about-item-title">Estimates, not guarantees: </span>
          <span>
            Fit labels and difficulty ratings are automated suggestions based on repository documentation and label evidence.
            They are not formal assessments of issue difficulty.
          </span>
        </div>

        <div>
          <span className="about-item-title">Check ticket availability: </span>
          <span>
            An issue might have an active conversation or pending pull request not yet merged. Always read recent
            issue comments and check with project maintainers before writing code.
          </span>
        </div>

        <div>
          <span className="about-item-title">Zero persistence: </span>
          <span>
            This tool does not use databases, user accounts, cookies, or localStorage history. Your profile and
            recommendations exist only in memory during the active session.
          </span>
        </div>
      </div>
    </section>
  );
};
