import { lazy, Suspense, useEffect, useState } from 'react';
import Login from './Login';
const Dashboard = lazy(() => import('./Dashboard'));
import { authRequest, rememberSession } from './api';
import FeedbackFAB from './FeedbackFAB';
import './index.css';
import './studio.css';

export default function App() {
  const [userId, setUserId] = useState(null);
  const [checking, setChecking] = useState(true);
  const [sessionError, setSessionError] = useState('');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.body.className = 'theme-dark';
    localStorage.removeItem('user_id');
    authRequest('session')
      .then(user => {
        rememberSession(user);
        setUserId(user.user_id);
      })
      .catch(() => {})
      .finally(() => setChecking(false));

    const expired = () => {
      setUserId(null);
      setSessionError('Your session has expired. Sign in again to continue.');
    };
    window.addEventListener('session-expired', expired);
    return () => window.removeEventListener('session-expired', expired);
  }, []);

  async function logout() {
    try {
      await authRequest('logout', { method: 'POST' });
      window.google?.accounts.id.disableAutoSelect();
      ['user_email', 'user_username', 'user_avatar', 'user_id'].forEach(k => localStorage.removeItem(k));
      setUserId(null);
      setSessionError('');
    } catch {
      setSessionError('Could not sign out. Check your connection and try again.');
    }
  }

  return (
    <>
      {sessionError && (
        <div className="session-notice" role="alert">
          {sessionError}
          <button onClick={() => setSessionError('')} aria-label="Dismiss">×</button>
        </div>
      )}
      {userId ? (
        <Suspense fallback={<div className="session-loading" role="status">Opening your workspace…</div>}>
          <Dashboard key={userId} userId={userId} theme="dark" onLogout={logout} />
        </Suspense>
      ) : (
        <Login restoringSession={checking} onLoginSuccess={id => { setUserId(id); setSessionError(''); }} />
      )}
      <FeedbackFAB />
    </>
  );
}
