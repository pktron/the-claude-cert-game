import { Link, useNavigate } from 'react-router-dom';
import { deck, domains } from '../content/deck';
import { deckCompletion, domainStats } from '../domain/progress';
import type { AppState } from '../storage/useAppState';

export function Home({ app }: { app: AppState }) {
  const { progress, session } = app;
  const navigate = useNavigate();
  const completion = deckCompletion(deck.questions, progress);
  const pct = Math.round(completion.ratio * 100);
  const stats = domainStats(deck.questions, progress, Date.now());
  const dueCount = stats.reduce((a, s) => a + s.due, 0);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning!';
    if (h < 18) return 'Good afternoon!';
    return 'Good evening!';
  };

  const canResume =
    session && !session.endedAt && session.cursor < session.queue.length && session.cursor > 0;

  return (
    <div className="home">
      <header className="home-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            🧠
          </span>
          <div>
            <div className="brand-name">The Claude Cert Game</div>
            <div className="brand-sub">Architect · Foundations</div>
          </div>
        </div>
        <Link to="/settings" className="icon-btn" aria-label="Settings">
          ⚙️
        </Link>
      </header>

      <section className="hero">
        <h1>{greeting()}</h1>
        <p className="hero-sub">Small steps. Big progress.</p>
      </section>

      <section className="progress-card card" aria-label="Overall progress">
        <div className="progress-card-head">
          <span>Your progress</span>
          <strong data-testid="overall-progress">{pct}%</strong>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="progress-card-foot">
          {completion.seen} of {completion.total} cards seen
          {progress.cardsCompleted > 0 && ` · ${progress.cardsCompleted} answered`}
        </div>
      </section>

      {canResume && (
        <button
          type="button"
          className="resume-card"
          onClick={() => navigate(`/session/${session!.config.mode}`)}
          data-testid="resume"
        >
          <div>
            <div className="resume-title">Resume your session</div>
            <div className="resume-sub">
              {session!.config.mode} · card {session!.cursor + 1} of {session!.queue.length}
            </div>
          </div>
          <span className="resume-go" aria-hidden="true">
            ›
          </span>
        </button>
      )}

      <h2 style={{ marginTop: 'var(--sp-6)', marginBottom: 'var(--sp-3)' }}>Choose a session</h2>

      <div className="session-list">
        <Link to="/session/discover" className="session-card session-purple" data-testid="start-discover">
          <span className="session-icon" aria-hidden="true">
            ⚡
          </span>
          <span className="session-body">
            <span className="session-name">Swipe &amp; Discover</span>
            <span className="session-meta">5–20 cards · core concepts</span>
          </span>
          <span className="session-go" aria-hidden="true">
            ›
          </span>
        </Link>

        <Link to="/session/challenge" className="session-card session-teal" data-testid="start-challenge">
          <span className="session-icon" aria-hidden="true">
            🎯
          </span>
          <span className="session-body">
            <span className="session-name">Challenge</span>
            <span className="session-meta">Certification-style, incl. multi-select</span>
          </span>
          <span className="session-go" aria-hidden="true">
            ›
          </span>
        </Link>

        <Link to="/review" className="session-card session-amber" data-testid="start-recall">
          <span className="session-icon" aria-hidden="true">
            🔁
          </span>
          <span className="session-body">
            <span className="session-name">Recall</span>
            <span className="session-meta">
              {dueCount > 0 ? `${dueCount} due for review` : 'Nothing due yet — review anyway'}
            </span>
          </span>
          <span className="session-go" aria-hidden="true">
            ›
          </span>
        </Link>
      </div>

      <h2 style={{ marginTop: 'var(--sp-6)', marginBottom: 'var(--sp-3)' }}>Domains</h2>
      <div className="domain-mini-grid">
        {domains.map((d) => {
          const s = stats.find((x) => x.domain === d.id);
          const p = s && s.accuracy != null ? Math.round(s.accuracy * 100) : 0;
          return (
            <Link key={d.id} to={`/stats`} className="domain-mini card">
              <div className="domain-mini-name">{d.name}</div>
              <div className="domain-mini-weight">{d.weight}% of exam</div>
              <div className="progress-track" style={{ height: 6, marginTop: 'var(--sp-2)' }}>
                <div className="progress-fill" style={{ width: `${p}%` }} />
              </div>
            </Link>
          );
        })}
      </div>

      <section className="soon-card card">
        <div className="soon-title">Coming soon</div>
        <div className="soon-list">
          <div>Architect · Professional (CCAR-P)</div>
          <div>Developer · Foundations (CCDV-F)</div>
        </div>
      </section>

      <p className="disclaimer">
        Practice questions authored from the official {deck.examCode} exam guide. These are study aids,
        not official exam items.
      </p>
    </div>
  );
}
