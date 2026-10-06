import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { authRequest, rememberSession } from './api';

const ResumeScene = lazy(() => import('./ResumeScene'));
let googleScript;
let configRequest;

function loadConfig() {
  if (!configRequest) configRequest = authRequest('config').finally(() => { configRequest = null; });
  return configRequest;
}

function loadGoogle() {
  if (window.google?.accounts) return Promise.resolve();
  if (!googleScript) googleScript = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const fail = () => {
      clearTimeout(timeout);
      script.remove();
      googleScript = null;
      reject(new Error('Google Identity Services could not load. Check internet connection.'));
    };
    const timeout = setTimeout(fail, 15000);
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => { clearTimeout(timeout); resolve(); };
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return googleScript;
}

function GoogleMark() {
  return <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.89.6-2.03.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.41 13.92a6 6 0 0 1 0-3.84V7.49H3.07a10 10 0 0 0 0 9.02l3.34-2.59Z"/><path fill="#EA4335" d="M12 5.96c1.47 0 2.79.51 3.83 1.51L18.7 4.6A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.49l3.34 2.59C7.2 7.72 9.4 5.96 12 5.96Z"/></svg>;
}

export default function Login({ onLoginSuccess, restoringSession = false }) {
  const button = useRef(null);
  const callback = useRef(onLoginSuccess);
  useEffect(() => { callback.current = onLoginSuccess; }, [onLoginSuccess]);
  
  const [error, setError] = useState('');
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'unconfigured' | 'signing' | 'error'
  const [attempt, setAttempt] = useState(0);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [customClientId, setCustomClientId] = useState(localStorage.getItem('custom_google_client_id') || '');
  const [activeClientId, setActiveClientId] = useState('');

  useEffect(() => {
    if (restoringSession) return;
    let active = true;

    async function init() {
      try {
        setError('');
        setStatus('loading');
        
        // 1. Fetch server config
        const config = await loadConfig();
        if (!active) return;
        
        const effectiveClientId = customClientId || config?.client_id || '';
        setActiveClientId(effectiveClientId);

        if (!effectiveClientId) {
          setStatus('unconfigured');
          return;
        }

        // 2. Load Google Script & Initialize
        await loadGoogle();
        if (!active) return;

        window.google.accounts.id.initialize({
          client_id: effectiveClientId,
          nonce: config?.nonce,
          auto_select: false,
          callback: async ({ credential }) => {
            if (!active) return;
            setStatus('signing');
            setError('');
            try {
              const user = await authRequest('google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential }),
              });
              if (active) {
                rememberSession(user);
                callback.current(user.user_id);
              }
            } catch (e) {
              if (active) {
                setError(e.message || 'Google sign-in failed.');
                setStatus('error');
              }
            }
          },
        });

        if (button.current) {
          button.current.replaceChildren();
          window.google.accounts.id.renderButton(button.current, {
            theme: 'filled_blue',
            size: 'large',
            shape: 'pill',
            text: 'continue_with',
            width: 290,
          });
        }
        setStatus('ready');
      } catch (e) {
        if (active) {
          setError(e.message || 'Could not connect to workspace service.');
          setStatus('error');
        }
      }
    }

    init();
    return () => { active = false; };
  }, [attempt, restoringSession, customClientId]);

  const handleSaveCustomClientId = (e) => {
    e.preventDefault();
    const trimmed = customClientId.trim();
    if (trimmed) {
      localStorage.setItem('custom_google_client_id', trimmed);
      setCustomClientId(trimmed);
      setShowConfigModal(false);
      setAttempt(v => v + 1);
    }
  };

  const connected = status === 'ready' || status === 'unconfigured' || status === 'signing';

  return (
    <div className="studio-page">
      {/* Top Navigation */}
      <header className="studio-nav">
        <a className="studio-brand" href="#top" aria-label="Resume intelligence home">
          <span className="brand-symbol">↗</span>
          <span>resume<span className="brand-dot">.</span></span>
        </a>

        {/* Official UTHM Lockup */}
        <div className="university-lockup">
          <div className="university-logo">
            <img 
              src="/uthm-logo.png" 
              alt="Universiti Tun Hussein Onn Malaysia (UTHM)" 
              width="142" 
              height="48"
              loading="eager"
            />
          </div>
          <div className="university-text">
            <strong>UNIVERSITI TUN HUSSEIN ONN MALAYSIA</strong>
            <span>FSKTM • INTELLIGENT RESUME ANALYZER</span>
          </div>
        </div>

        <nav className="landing-nav" aria-label="Main navigation">
          <a className="nav-how" href="#how-it-works">How it works</a>
          <a className="nav-signin" href="#workspace">
            Your workspace <span>↗</span>
          </a>
        </nav>
      </header>

      {/* Hero Section */}
      <main id="top">
        <section className="studio-hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="live-dot" />
              <span>OFFICIAL PSM PROJECT • UTHM CAREER INTELLIGENCE</span>
            </div>

            <h1>
              Your potential.<br />
              On paper.<br />
              <span className="gradient-highlight">In focus.</span>
            </h1>

            <p className="hero-description">
              Tailored for UTHM undergraduates and graduates preparing for industrial training 
              and tech careers. Get deep ATS scoring, keyword gap diagnostics, and AI-driven career matching.
            </p>

            <div className="hero-tags">
              <span>✦ ATS Compatibility</span>
              <span>✦ UTHM Siswa Ready</span>
              <span>✦ Tech Career Discovery</span>
              <span>✦ AI Headshot Audit</span>
            </div>

            {/* Workspace Access Panel - Google Only */}
            <section className="signin-box" id="workspace" aria-labelledby="signin-title">
              <div className="signin-heading">
                <div>
                  <div className="signin-uthm-tag">
                    <img src="/uthm-logo.png" alt="UTHM" width="60" height="20" />
                    <span>UTHM STUDENT WORKSPACE</span>
                  </div>
                  <h2 id="signin-title">Sign in with Google</h2>
                </div>
                <span className="signin-arrow" aria-hidden="true">↗</span>
              </div>
              <p className="signin-lead">
                Use your official UTHM Siswa account or personal Google account to access your resume workspace.
              </p>

              <div className="workspace-entry-actions">
                <div className="google-button-container">
                  <div className="google-button" ref={button} hidden={status !== 'ready'} />

                  {status === 'loading' && (
                    <div className="auth-loading" role="status">
                      <span className="auth-spinner" />
                      <span>{restoringSession ? 'Checking your session…' : 'Connecting to workspace…'}</span>
                      <small>Waking up services, please wait a moment.</small>
                    </div>
                  )}

                  {status === 'signing' && (
                    <div className="auth-loading" role="status">
                      <span className="auth-spinner" />
                      <span>Verifying your Google account…</span>
                    </div>
                  )}

                  {status === 'unconfigured' && (
                    <div className="google-unconfigured-box">
                      <button 
                        type="button" 
                        className="google-pending" 
                        onClick={() => setShowConfigModal(true)}
                        title="Click to enter Google Client ID"
                      >
                        <GoogleMark />
                        <span>Sign in with Google</span>
                        <span className="config-chip">Setup Client ID</span>
                      </button>
                      <p className="auth-note">
                        Google sign-in is awaiting configuration. Click above to connect your Client ID.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Error Box & Retry */}
              {error && (
                <div className="auth-error" role="alert">
                  <strong>Let’s reconnect.</strong>
                  <p>{error}</p>
                  <div className="error-actions">
                    <button 
                      className="retry-button" 
                      onClick={() => { setError(''); setStatus('loading'); setAttempt(v => v + 1); }}
                    >
                      Retry Connection <span>↺</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Status Footer */}
              <div className="signin-meta">
                <span className={`connection-label ${connected ? 'is-connected' : ''}`}>
                  <i />
                  {connected 
                    ? 'Workspace connected' 
                    : status === 'error' 
                      ? 'Connection note' 
                      : 'Connecting securely…'}
                </span>
                <span className="signin-google-badge">Google-only sign-in</span>
              </div>
            </section>
          </div>

          {/* Hero 3D Scene / Art */}
          <div className="hero-art">
            <div className="art-index">
              <span>INTELLIGENT RESUME SYSTEM</span>
              <span>UTHM • FSKTM</span>
            </div>
            <Suspense fallback={<div className="resume-scene" />}>
              <ResumeScene />
            </Suspense>
            <div className="art-chip chip-top">
              <span>✦</span>
              <div>
                <strong>Designed for UTHM Students</strong>
                <small>Higher interview conversion & ATS pass rate.</small>
              </div>
            </div>
            <div className="art-chip chip-bottom">
              <span className="insight-icon">↗</span>
              <div>
                <strong>Job Market Alignment</strong>
                <small>Match skills against 25+ real IT roles.</small>
              </div>
            </div>
            <div className="art-caption">
              <span>STRUCTURE</span>
              <i />
              <span>SKILLS</span>
              <i />
              <span>CAREER FIT</span>
            </div>
          </div>
        </section>

        {/* How It Works Strip */}
        <section id="how-it-works" className="features-strip" aria-label="How it works">
          <div className="strip-intro">
            <span className="eyebrow">A CLEARER WAY FORWARD</span>
            <h2>Proven steps.<br />Higher callbacks.</h2>
            <p>From your first PDF draft to targeted graduate job opportunities.</p>
          </div>
          {[
            ['01', '↑', 'Upload & Extract', 'Submit your resume in PDF format. AI parses your structure, skills, and experience in seconds.'],
            ['02', '◎', 'Deep ATS Scoring', 'Benchmark against industry standards with itemized feedback on keywords, formatting, and impact.'],
            ['03', '↗', 'Targeted Job Matching', 'Compare directly against real IT job descriptions (Software Engineer, Data Scientist, DevOps).'],
          ].map(([n, icon, title, body]) => (
            <article key={n}>
              <div className="feature-top">
                <span className="feature-number">{n} /</span>
                <span className="feature-icon" aria-hidden="true">{icon}</span>
              </div>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </section>
      </main>

      {/* Google Client ID Modal */}
      {showConfigModal && (
        <div className="modal-backdrop" onClick={() => setShowConfigModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-lockup">
                <GoogleMark />
                <h3>Google OAuth Setup</h3>
              </div>
              <button 
                type="button" 
                className="modal-close-btn" 
                onClick={() => setShowConfigModal(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <p className="modal-desc">
              To enable Google One-Tap & Sign-In, provide your Google Cloud OAuth 2.0 Web Client ID:
            </p>
            <form onSubmit={handleSaveCustomClientId} className="modal-form">
              <label htmlFor="clientIdInput">Google Web Client ID:</label>
              <input
                id="clientIdInput"
                type="text"
                placeholder="e.g. 123456789-xxxx.apps.googleusercontent.com"
                value={customClientId}
                onChange={e => setCustomClientId(e.target.value)}
                autoFocus
              />
              <div className="modal-buttons">
                <button type="submit" className="btn-modal-save">
                  Save & Connect Google
                </button>
                {customClientId && (
                  <button 
                    type="button" 
                    className="btn-modal-clear"
                    onClick={() => {
                      localStorage.removeItem('custom_google_client_id');
                      setCustomClientId('');
                      setShowConfigModal(false);
                      setAttempt(v => v + 1);
                    }}
                  >
                    Reset
                  </button>
                )}
              </div>
            </form>
            <p className="modal-help">
              💡 <em>In Render: Add <code>GOOGLE_CLIENT_ID</code> to your service's Environment Variables.</em>
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="studio-footer">
        <div className="footer-left">
          <img src="/uthm-logo.png" alt="UTHM" width="80" height="26" />
          <span>Universiti Tun Hussein Onn Malaysia (UTHM) • Faculty of Computer Science & Information Technology (FSKTM)</span>
        </div>
        <a href="#top" className="footer-top-link">Back to top <span className="brand-dot">↑</span></a>
      </footer>
    </div>
  );
}
