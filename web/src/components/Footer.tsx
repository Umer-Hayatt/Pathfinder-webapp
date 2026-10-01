import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="site-footer">
      <div className="footer-left">
        <span>Pathfinder</span>
        <span>•</span>
        <span>Original code released under the MIT License</span>
      </div>
      <div>
        <span>Powered by Gemma via the Gemini API</span>
      </div>
    </footer>
  );
};
