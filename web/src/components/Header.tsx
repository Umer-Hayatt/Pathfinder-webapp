import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="site-header">
      <h1 className="site-title">Pathfinder</h1>
      <p className="site-tagline">
        Find open-source contribution opportunities matching your programming languages,
        experience level, and learning goals. Recommendations are paired with relevant issues,
        required skills, and a suggested starting roadmap.
      </p>
    </header>
  );
};
