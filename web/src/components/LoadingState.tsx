import React, { useEffect, useState } from 'react';

interface LoadingStateProps {
  onAbort: () => void;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ onAbort }) => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="loading-box"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="loading-header">Searching repositories and analyzing opportunities...</div>
      <div className="loading-text">
        Querying GitHub candidate repositories, inspecting open issue threads, and running matching
        inference. Live calls may take up to 90 seconds depending on upstream API responsiveness.
      </div>
      <div className="loading-timer">
        Elapsed time: {seconds}s
      </div>
      <button
        type="button"
        className="btn-secondary"
        onClick={onAbort}
        aria-label="Cancel recommendation request"
      >
        Cancel request
      </button>
    </div>
  );
};
