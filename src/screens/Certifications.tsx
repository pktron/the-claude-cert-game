import { Link, useNavigate } from 'react-router-dom';
import { deckList } from '../content/decks';
import { useAllProgress } from '../storage/useAllProgress';

/** Landing screen: choose which certification to study. */
export function Certifications() {
  const navigate = useNavigate();
  const { progressByDeck } = useAllProgress();
  const available = deckList.filter((d) => d.available);
  const planned = deckList.filter((d) => !d.available);

  return (
    <div className="certs">
      <header className="certs-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            🧠
          </span>
          <div>
            <div className="brand-name">The Claude Cert Game</div>
            <div className="brand-sub">Claude certification practice</div>
          </div>
        </div>
      </header>

      <h1>Choose a certification</h1>
      <p className="certs-sub">
        Swipe-to-learn practice cards, authored from the official Anthropic exam guides.
      </p>

      <div className="cert-list">
        {available.map((d) => {
          const p = progressByDeck[d.deckId];
          const seen = p ? Object.values(p.questions).filter((q) => q.attempts > 0).length : 0;
          const pct = d.questionCount > 0 ? Math.round((seen / d.questionCount) * 100) : 0;
          return (
            <Link key={d.deckId} to={`/c/${d.deckId}`} className="cert-card" data-testid={`cert-${d.deckId}`}>
              <div className="cert-top">
                <div>
                  <div className="cert-name">{d.shortName}</div>
                  <div className="cert-code">
                    {d.examCode} · {d.domains.length} domains · {d.questionCount} cards
                  </div>
                </div>
                <span className="cert-go" aria-hidden="true">
                  ›
                </span>
              </div>
              {pct > 0 && (
                <>
                  <div className="progress-track" style={{ marginTop: 'var(--sp-3)', height: 6 }}>
                    <div className="progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="cert-progress">{pct}% explored</div>
                </>
              )}
            </Link>
          );
        })}

        {planned.length > 0 && (
          <>
            <h2 className="cert-section">Coming soon</h2>
            {planned.map((d) => (
              <button
                key={d.deckId}
                type="button"
                className="cert-card cert-planned"
                onClick={() => navigate('/soon', { state: { deckId: d.deckId } })}
                data-testid={`cert-planned-${d.deckId}`}
              >
                <div className="cert-top">
                  <div>
                    <div className="cert-name">{d.shortName}</div>
                    <div className="cert-code">
                      {d.examCode} · {d.domains.length} domains · {d.objectiveCount} objectives
                    </div>
                  </div>
                  <span className="cert-badge">Planned</span>
                </div>
              </button>
            ))}
          </>
        )}
      </div>

      <p className="disclaimer">
        Practice questions authored from the official exam guides. These are study aids, not official
        exam items. Progress is stored on this device only.
      </p>
    </div>
  );
}
