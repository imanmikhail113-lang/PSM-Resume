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

  return (
    <>
      <button 
        className="theme-toggle-btn"
        onClick={toggleTheme}
        aria-label="Toggle theme mode"
        title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        <span className="theme-toggle-icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
        <span className="theme-toggle-text">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
      </button>

      {!userId ? (
        <Login onLoginSuccess={(id) => setUserId(id)} />
      ) : (
        <Dashboard onLogout={handleLogout} userId={userId} theme={theme} />
      )}
    </>
  );
}

export default App;
