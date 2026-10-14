import { domains, questions } from '../content/deck';
import { humanizeConcept } from '../domain/labels';
import { deckCompletion, domainStats, weakConcepts } from '../domain/progress';
import type { AppState } from '../storage/useAppState';

export function Stats({ app }: { app: AppState }) {
  const { progress } = app;
  const now = Date.now();
  const completion = deckCompletion(questions, progress);
  const stats = domainStats(questions, progress, now);
  const weak = weakConcepts(questions, progress);
  const pct = Math.round(completion.ratio * 100);
  const totalCorrect = stats.reduce((a, s) => a + s.correct, 0);
  const totalAnswered = stats.reduce((a, s) => a + s.answered, 0);
  const delayed = stats.length; // placeholder to avoid unused
  const delayedStats = (() => {
    let dc = 0;
    let tc = 0;
    for (const qs of Object.values(progress.questions)) {
      for (const h of qs.history) if (h.correct) { tc++; if (h.wasDelayed) dc++; }
    }
    return { dc, tc };
  })();
  void delayed;

  return (
    <div className="stats">
      <header className="stats-header">
        <h1>Certification Progress</h1>
      </header>

      <section className="overall card">
        <div className="ring" style={{ ['--pct' as string]: pct }}>
          <div className="ring-inner">
            <strong>{pct}%</strong>
            <span>overall</span>
          </div>
        </div>
        <div className="overall-meta">
          <div className="overall-line">
            <strong>{completion.seen}</strong> of {completion.total} cards seen
          </div>
          <div className="overall-line">
            <strong>{totalCorrect}</strong> correct of {totalAnswered} answered
          </div>
          <div className="overall-line">
            <strong>{delayedStats.dc}</strong> recalled after a delay
          </div>
          <div className="overall-line">
            ⭐ {progress.xpTotal} XP · 🔥 best streak {progress.personalBestStreak}
          </div>
        </div>
      </section>

      <div className="tabs" role="tablist" aria-label="Progress views">
        <span className="tab active" role="tab" aria-selected="true">
          Domains
        </span>
        <span className="tab" role="tab" aria-selected="false">
          Needs practice
        </span>
      </div>

      <section className="domain-bars">
        {domains.map((d) => {
          const s = stats.find((x) => x.domain === d.id);
          const p = s?.accuracy != null ? Math.round(s.accuracy * 100) : 0;
          return (
            <div key={d.id} className="domain-bar-row">
              <div className="domain-bar-head">
                <span>{d.name}</span>
                <strong>{s && s.answered > 0 ? `${p}%` : '—'}</strong>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${p}%` }} />
              </div>
              <div className="domain-bar-sub">
                {s?.answered ?? 0} answered · {s?.due ?? 0} due
              </div>
            </div>
          );
        })}
      </section>

      {weak.length > 0 && (
        <>
          <h3 className="summary-section">Concepts to practise</h3>
          <div className="weak-list">
            {weak.map((w) => (
              <div key={w.concept} className="weak-row card">
                <span className="weak-concept">{humanizeConcept(w.concept)}</span>
                <span className="weak-acc">{Math.round(w.accuracy * 100)}%</span>
              </div>
            ))}
          </div>
        </>
      )}

      {progress.flagged && Object.keys(progress.flagged).length > 0 && (
        <>
          <h3 className="summary-section">Flagged questions</h3>
          <div className="weak-list">
            {Object.keys(progress.flagged).map((qid) => (
              <div key={qid} className="weak-row card">
                <span className="weak-concept">{qid}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="disclaimer">
        Accuracy is shown per domain, not per option-count, so 2-, 3-, and 4-option questions stay
        comparable. One correct answer is not mastery.
      </p>
    </div>
  );
}
