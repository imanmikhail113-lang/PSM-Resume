import React from 'react';

export default function FeedbackFAB() {
  const FEEDBACK_URL = 'https://forms.gle/H2RrNcbwdQNs5oQa8';

  return (
    <a
      href={FEEDBACK_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="feedback-fab"
      aria-label="Open Intelligent Resume System Feedback Form (opens in a new tab)"
      title="Intelligent Resume System Feedback Form"
      id="feedback-fab-btn"
    >
      <span className="fab-pulse-dot" aria-hidden="true" />
      <span className="fab-icon" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <line x1="9" y1="10" x2="15" y2="10" />
          <line x1="12" y1="7" x2="12" y2="13" />
        </svg>
      </span>
      <span className="fab-label">Feedback</span>
      <span className="fab-arrow" aria-hidden="true">↗</span>
    </a>
  );
}
