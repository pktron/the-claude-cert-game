import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDeck } from '../content/DeckContext';
import { getQuestion } from '../content/decks';
import type { AppState } from '../storage/useAppState';

export function Summary({ app }: { app: AppState }) {
  const { session, setSession } = app;
  const { meta } = useDeck();
  const deckId = meta.deckId;
  const navigate = useNavigate();
  const { mode } = useParams();

  if (!session) {
    return (
      <div className="summary">
        <h2>No session yet</h2>
        <Link to={`/c/${deckId}`} className="pill-btn primary" style={{ marginTop: 'var(--sp-4)' }}>
          Back home
        </Link>
      </div>
    );
  }

  const total = session.queue.length;
  const gotRight = session.correctTotal;
  const minutes = session.endedAt ? Math.max(1, Math.round((session.endedAt - session.startedAt) / 60000)) : 0;

  // Per-domain accuracy for this session.
  const perDomain = meta.domains.map((d) => {
    let answered = 0;
    let correct = 0;
    for (const qid of session.queue) {
      const q = getQuestion(deckId, qid);
      if (q?.domain !== d.id) continue;
      const card = session.cards[qid];
      if (card?.committed) {
        answered += 1;
        if (card.correct) correct += 1;
      }
    }
    return { ...d, answered, correct, pct: answered ? Math.round((correct / answered) * 100) : 0 };
  });
  const touched = perDomain.filter((d) => d.answered > 0);

  return (
    <div className="summary">
      <div className="trophy" aria-hidden="true">
        🏆
      </div>
      <h1 data-testid="summary-title">Session complete!</h1>
      <p className="summary-sub" data-testid="summary-line">
        You got {gotRight} out of {total} correct. 🎉
      </p>

      <div className="stat-tiles">
        <div className="stat-tile card">
          <div className="stat-label">Streak</div>
          <div className="stat-value" data-testid="summary-streak">
            🔥 {session.bestStreak}
          </div>
          <div className="stat-sub">best: {app.progress.personalBestStreak}</div>
        </div>
        <div className="stat-tile card">
          <div className="stat-label">XP earned</div>
          <div className="stat-value" data-testid="summary-xp">
            ⭐ +{session.xp}
          </div>
          <div className="stat-sub">total {app.progress.xpTotal}</div>
        </div>
        <div className="stat-tile card">
          <div className="stat-label">Time</div>
          <div className="stat-value">⏱ {minutes}m</div>
          <div className="stat-sub">{mode ?? session.config.mode}</div>
        </div>
      </div>

      {touched.length > 0 && (
        <>
          <h3 className="summary-section">Performance by domain</h3>
          <div className="domain-bars">
            {touched.map((d) => (
              <div key={d.id} className="domain-bar-row">
                <div className="domain-bar-head">
                  <span>{d.name}</span>
                  <strong>{d.pct}%</strong>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${d.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="summary-actions">
        <button
          type="button"
          className="pill-btn purple"
          onClick={() => {
            // Clear the finished session so the next visit builds a fresh queue.
            setSession(null);
            navigate(`/c/${deckId}/session/${session.config.mode}`);
          }}
          data-testid="summary-again"
        >
          Continue
        </button>
        <Link to={`/c/${deckId}/review`} className="pill-btn secondary">
          Review missed questions
        </Link>
        <Link to={`/c/${deckId}/stats`} className="pill-btn ghost">
          See your progress
        </Link>
      </div>

      <p className="disclaimer" style={{ marginTop: 'var(--sp-6)' }}>
        An incorrect answer just means it comes back sooner. Missed a day? Nothing resets.
      </p>
    </div>
  );
}
