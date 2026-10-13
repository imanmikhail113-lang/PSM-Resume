import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Workspace encountered a render error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#070b14',
            color: '#f8fafc',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              maxWidth: '520px',
              padding: '2.5rem',
              backgroundColor: '#0f172a',
              borderRadius: '16px',
              border: '1px solid rgba(255, 52, 75, 0.3)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                margin: '0 auto 1.5rem',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 52, 75, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ff344b',
                fontSize: '1.75rem',
              }}
            >
              ⚠
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.75rem', color: '#f8fafc' }}>
              Display Recovery
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.75rem' }}>
              The workspace encountered an unexpected display issue while loading your view. You can reload the page or return to the sign-in screen.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                  padding: '0.7rem 1.4rem',
                  borderRadius: '10px',
                  backgroundColor: '#ff344b',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'opacity 0.2s',
                }}
              >
                Reload Workspace
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  padding: '0.7rem 1.4rem',
                  borderRadius: '10px',
                  backgroundColor: 'transparent',
                  color: '#cbd5e1',
                  border: '1px solid #334155',
                  fontWeight: 500,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                Return to Sign In
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
