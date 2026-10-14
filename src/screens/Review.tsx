import { Link } from 'react-router-dom';
import { questions } from '../content/deck';
import { domainStats, weakConcepts } from '../domain/progress';
import { humanizeConcept } from '../domain/labels';
import type { AppState } from '../storage/useAppState';

export function Review({ app }: { app: AppState }) {
  const { progress } = app;
  const now = Date.now();
  const stats = domainStats(questions, progress, now);
  const dueTotal = stats.reduce((a, s) => a + s.due, 0);
  const weak = weakConcepts(questions, progress);
  const unseen = questions.filter((q) => (progress.questions[q.id]?.attempts ?? 0) === 0).length;

  return (
    <div className="review">
      <h1>Review</h1>
      <p style={{ color: 'var(--text-muted)', marginTop: 'var(--sp-2)' }}>
        Recall brings back what you have not seen in a while, plus anything you missed.
      </p>

      <section className="card recall-hero">
        <div className="recall-count">{dueTotal}</div>
        <div className="recall-label">
          {dueTotal > 0 ? 'cards due for review' : 'cards due right now'}
        </div>
        <Link to="/session/recall" className="pill-btn primary" data-testid="start-recall-cta">
          Start recall
        </Link>
        <p className="recall-note">
          {dueTotal > 0
            ? `A recall session also mixes in ${unseen} card${unseen === 1 ? '' : 's'} you have not seen yet.`
            : 'Nothing is overdue - a recall session will introduce new cards and start scheduling them.'}
        </p>
      </section>

      <div className="review-grid">
        <div className="card review-tile">
          <div className="review-num">{unseen}</div>
          <div className="review-cap">not seen yet</div>
        </div>
        <div className="card review-tile">
          <div className="review-num">{Object.keys(progress.flagged).length}</div>
          <div className="review-cap">flagged by you</div>
        </div>
      </div>

      {weak.length > 0 && (
        <>
          <h3 className="summary-section">Weakest concepts</h3>
          <div className="weak-list">
            {weak.slice(0, 6).map((w) => (
              <div key={w.concept} className="weak-row card">
                <span className="weak-concept">{humanizeConcept(w.concept)}</span>
                <span className="weak-acc">{Math.round(w.accuracy * 100)}%</span>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="disclaimer">
        Answer wrong and it returns tomorrow. Answer right across sessions and the gap widens.
      </p>
    </div>
  );
}
