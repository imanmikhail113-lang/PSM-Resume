import React, { useEffect } from 'react';

export default function HelpManualModal({ isOpen, onClose }) {
  const PDF_URL = '/Resume%20Analyzer%20Manual%20Guide.pdf';

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="pdf-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-modal-title"
    >
      <div
        className="pdf-modal-window"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pdf-modal-header">
          <div className="pdf-modal-header-left">
            <div className="pdf-modal-icon-badge" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
            <div>
              <div className="pdf-modal-title-row">
                <h3 id="pdf-modal-title" className="pdf-modal-title">Resume Analyzer Manual Guide</h3>
                <span className="pdf-modal-badge">PDF Guide</span>
              </div>
              <p className="pdf-modal-subtitle">Official User Guide & Walkthrough</p>
            </div>
          </div>

          <div className="pdf-modal-header-actions">
            <a
              href={PDF_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="pdf-modal-btn"
              title="Open PDF in a new tab"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              <span>Open in New Tab</span>
            </a>
            <a
              href={PDF_URL}
              download="Resume Analyzer Manual Guide.pdf"
              className="pdf-modal-btn"
              title="Download PDF file"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Download</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="pdf-modal-close-btn"
              aria-label="Close user manual modal"
              title="Close (Esc)"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <div className="pdf-modal-body">
          <iframe
            src={`${PDF_URL}#toolbar=1&navpanes=1&view=FitH`}
            title="Resume Analyzer Manual Guide"
            className="pdf-iframe-viewer"
          />
        </div>
      </div>
    </div>
  );
}
