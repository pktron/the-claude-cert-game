import { Link } from 'react-router-dom';

export function ComingSoon() {
  return (
    <div className="coming">
      <div className="coming-emoji" aria-hidden="true">
        🗺️
      </div>
      <h1>Coming soon</h1>
      <p style={{ color: 'var(--text-muted)', marginTop: 'var(--sp-3)' }}>
        We are adding the other two Claude certifications. Their question banks will be authored the
        same way — grounded in the official exam guides, with adaptive 2/3/4-option items.
      </p>

      <div className="card coming-card">
        <div className="coming-row">
          <div>
            <div className="coming-name">Architect · Professional</div>
            <div className="coming-code">CCAR-P · 7 domains</div>
          </div>
          <span className="coming-badge">Planned</span>
        </div>
        <div className="coming-row">
          <div>
            <div className="coming-name">Developer · Foundations</div>
            <div className="coming-code">CCDV-F · 8 domains</div>
          </div>
          <span className="coming-badge">Planned</span>
        </div>
      </div>

      <Link to="/" className="pill-btn primary" style={{ marginTop: 'var(--sp-6)' }}>
        ← Back to studying
      </Link>
    </div>
  );
}
