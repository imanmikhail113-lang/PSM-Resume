import React, { useState } from 'react';
import './index.css';

function Login({ onLoginSuccess }) {
  const [mode, setMode] = useState('login'); // 'login', 'register', 'forgot'
  const [forgotStep, setForgotStep] = useState(1);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (mode === 'login' || mode === 'register') {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const bodyPayload = mode === 'login' ? { email, password } : { username, email, password };
      
      try {
        const response = await fetch(`http://localhost:5000${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload)
        });
        
        const data = await response.json();
        
        if (response.ok) {
          // Store user_id in local storage
          localStorage.setItem('user_id', data.user_id);
          localStorage.setItem('user_email', email);
          localStorage.setItem('user_username', data.username || email.split('@')[0]);
          
          onLoginSuccess(data.user_id);
        } else {
          setError(data.message || 'Authentication failed');
        }
      } catch (err) {
        setError('Could not connect to server.');
      } finally {
        setLoading(false);
      }
    } else if (mode === 'forgot') {
      if (forgotStep === 1) {
        // Step 1: Verify Email
        try {
          const response = await fetch(`http://localhost:5000/api/auth/verify-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          });
          const data = await response.json();
          if (response.ok) {
            setForgotStep(2);
            setSuccess('Email verified. Please set your new password.');
          } else {
            setError(data.message || 'Email verification failed.');
          }
        } catch (err) {
          setError('Could not connect to server.');
        } finally {
          setLoading(false);
        }
      } else if (forgotStep === 2) {
        // Step 2: Reset Password
        if (newPassword !== confirmPassword) {
          setError('Passwords do not match.');
          setLoading(false);
          return;
        }
        if (!newPassword) {
          setError('Password cannot be empty.');
          setLoading(false);
          return;
        }
        try {
          const response = await fetch(`http://localhost:5000/api/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, new_password: newPassword })
          });
          const data = await response.json();
          if (response.ok) {
            setSuccess('Password reset successfully! Redirecting to login...');
            setTimeout(() => {
              setMode('login');
              setForgotStep(1);
              setPassword('');
              setNewPassword('');
              setConfirmPassword('');
              setSuccess(null);
            }, 3000);
          } else {
            setError(data.message || 'Failed to reset password.');
          }
        } catch (err) {
          setError('Could not connect to server.');
        } finally {
          setLoading(false);
        }
      }
    }
  };

  return (
    <div className="login-container">
      {/* Left Panel - Branding */}
      <div className="login-left-panel">
        <div className="branding-content">
          <img 
            src="/uthm_logo.png.png" 
            alt="UTHM Logo" 
            className="uthm-logo"
          />
          <h1 className="branding-title">Optimize Your Resume<br/>with Precision</h1>
          <p className="branding-subtitle">
            Built for IT students<br/>
            aiming for industry readiness
          </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="login-right-panel">
        <div className="login-form-wrapper">
          <h2 className="login-form-title">
            {mode === 'forgot' ? 'RESET PASSWORD' : 'SMART RESUME'}
          </h2>
          
          <form onSubmit={handleSubmit} className="login-form">
            {mode === 'forgot' && forgotStep === 2 ? (
              <>
                <div className="form-group">
                  <label htmlFor="reset-email">Email</label>
                  <input 
                    type="email" 
                    id="reset-email" 
                    value={email}
                    disabled
                    style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed', color: '#64748b' }}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="new-password">New Password</label>
                  <input 
                    type="password" 
                    id="new-password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required 
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="confirm-password">Confirm New Password</label>
                  <input 
                    type="password" 
                    id="confirm-password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required 
                  />
                </div>
              </>
            ) : (
              <>
                {mode === 'register' && (
                  <div className="form-group">
                    <label htmlFor="username">Username</label>
                    <input 
                      type="text" 
                      id="username" 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required 
                    />
                  </div>
                )}
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input 
                    type="email" 
                    id="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                  />
                </div>
                
                {mode !== 'forgot' && (
                  <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input 
                      type="password" 
                      id="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required 
                    />
                  </div>
                )}
              </>
            )}

            {error && <div className="error-banner" style={{marginBottom: '1rem'}}>{error}</div>}
            {success && <div className="success-banner" style={{marginBottom: '1rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '1rem', textAlign: 'center'}}>{success}</div>}

            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? 'Please wait...' : (
                mode === 'forgot' ? (forgotStep === 1 ? 'Verify Email' : 'Reset Password') : (mode === 'login' ? 'Login' : 'Register')
              )}
            </button>
          </form>

          <div className="login-links">
            {mode !== 'forgot' ? (
              <>
                <a 
                  href="#" 
                  className="forgot-password"
                  onClick={(e) => {
                    e.preventDefault();
                    setMode('forgot');
                    setForgotStep(1);
                    setError(null);
                    setSuccess(null);
                  }}
                >
                  Forgot Password?
                </a>
                <div className="register-link-container">
                  <span className="new-user-text">{mode === 'login' ? 'New user? ' : 'Already have an account? '}</span>
                  <a 
                    href="#" 
                    className="register-link"
                    onClick={(e) => {
                      e.preventDefault();
                      setMode(mode === 'login' ? 'register' : 'login');
                      setError(null);
                      setSuccess(null);
                    }}
                  >
                    {mode === 'login' ? 'Register here' : 'Login here'}
                  </a>
                </div>
              </>
            ) : (
              <a 
                href="#" 
                className="register-link"
                onClick={(e) => {
                  e.preventDefault();
                  setMode('login');
                  setForgotStep(1);
                  setError(null);
                  setSuccess(null);
                }}
              >
                Back to Login
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
