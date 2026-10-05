import React, { useState, useEffect } from 'react';
import Login from './Login';
import Dashboard from './Dashboard';
import './index.css';

function App() {
  const [userId, setUserId] = useState(null);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('app_theme') || 'dark';
  });

  useEffect(() => {
    const storedUserId = localStorage.getItem('user_id');
    if (storedUserId) {
      setUserId(storedUserId);
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.className = theme === 'light' ? 'theme-light' : 'theme-dark';
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleLogout = () => {
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_username');
    setUserId(null);
  };

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  return (
    <>
      <div className="top-nav-actions">
        <button 
          className="feedback-toggle-btn"
          onClick={() => setShowFeedbackModal(true)}
          aria-label="Provide Feedback"
          title="Share your feedback & suggestions"
        >
          <span className="feedback-btn-icon">💬</span>
          <span className="feedback-btn-text">Feedback</span>
        </button>

        <button 
          className="theme-toggle-btn"
          onClick={toggleTheme}
          aria-label="Toggle theme mode"
          title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          <span className="theme-toggle-icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
          <span className="theme-toggle-text">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
      </div>

      {showFeedbackModal && (
        <div className="feedback-modal-overlay" onClick={() => setShowFeedbackModal(false)}>
          <div className="feedback-modal-card" onClick={(e) => e.stopPropagation()}>
            <button 
              type="button" 
              className="feedback-modal-close" 
              onClick={() => setShowFeedbackModal(false)}
              aria-label="Close"
            >
              ×
            </button>
            <div className="feedback-modal-header">
              <div className="feedback-modal-badge">
                <span>🌟 FEEDBACK & SUGGESTIONS</span>
              </div>
              <h3 className="feedback-modal-title">We Value Your Feedback</h3>
              <p className="feedback-modal-sub">
                Scan the QR code below using your phone camera to share your thoughts, report an issue, or suggest new features!
              </p>
            </div>

            <div className="feedback-qr-wrapper">
              <div className="feedback-qr-frame">
                <img 
                  src="/feedbackqr.png" 
                  alt="Feedback QR Code" 
                  className="feedback-qr-img" 
                />
              </div>
              <div className="feedback-scan-pill">
                <span className="scan-pill-icon">📱</span>
                <span className="scan-pill-text">Scan with Phone Camera</span>
              </div>
            </div>

            <div className="feedback-modal-footer">
              <p className="feedback-footer-tip">
                Your feedback helps us continuously improve the AI Resume & Formality Analysis platform.
              </p>
              <button 
                type="button" 
                className="feedback-dismiss-btn"
                onClick={() => setShowFeedbackModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {!userId ? (
        <Login onLoginSuccess={(id) => setUserId(id)} />
      ) : (
        <Dashboard key={userId} onLogout={handleLogout} userId={userId} theme={theme} />
      )}
    </>
  );
}

export default App;
