import { useState } from 'react';
import type { Question } from '../domain/types';

interface Props {
  question: Question;
  correct: boolean;
  committedIds: string[];
  reduceMotion: boolean;
  soundOn: boolean;
  onContinue: () => void;
  onTryAgain?: () => void;
  onFlag: () => void;
  flagged: boolean;
}

export function FeedbackPanel({
  question,
  correct,
  committedIds,
  reduceMotion,
  onContinue,
  onTryAgain,
  onFlag,
  flagged,
}: Props) {
  const [showDeep, setShowDeep] = useState(false);
  const [showAllWhy, setShowAllWhy] = useState(false);

  const correctIds = question.options.filter((o) => o.isCorrect).map((o) => o.id);
  const wrongPicked = committedIds.filter((id) => !correctIds.includes(id));
  const missed = correctIds.filter((id) => !committedIds.includes(id));

  const opt = (id: string) => question.options.find((o) => o.id === id)!;

  return (
    <div
      className={`feedback ${correct ? 'is-correct' : 'is-incorrect'}`}
      role="status"
      aria-live="polite"
      data-testid="feedback"
      data-correct={correct}
    >
      {!reduceMotion && (
        <div className="confetti" aria-hidden="true">
          {Array.from({ length: 14 }).map((_, i) => (
            <span key={i} className="confetti-bit" style={{ ['--i' as string]: i }} />
          ))}
        </div>
      )}

      <div className="feedback-badge" aria-hidden="true">
        {correct ? '✓' : '✕'}
      </div>

      <h2 className="feedback-title" data-testid="feedback-title">
        {correct ? (question.type === 'multiple' ? 'All correct!' : "Correct!") : 'Not quite!'}
      </h2>
      <p className="feedback-sub">
        {correct
          ? "That's right! 🎉"
          : "Let's learn from it — this is a common trap."}
      </p>

      {/* What you picked */}
      {committedIds.length > 0 && (
        <div className="picked-box">
          <div className="picked-head">
            <span
              className="picked-icon"
              style={{
                background: correct ? 'var(--success)' : 'var(--danger)',
              }}
              aria-hidden="true"
            >
              {correct ? '✓' : '✕'}
            </span>
            <div>
              <div className="picked-label">Your answer</div>
              <div className="picked-text">
                {committedIds.map((id) => opt(id).text).join(' + ')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Missed correct answers - wording differs for single vs multiple-response */}
      {missed.length > 0 && (
        <div className="missed-box">
          <div className="missed-head">
            <span className="picked-icon" style={{ background: 'var(--success)' }} aria-hidden="true">
              ✓
            </span>
            <div>
              <div className="picked-label">
                {question.type === 'multiple' ? 'Also correct' : 'The correct answer'}
              </div>
              <div className="picked-text">{missed.map((id) => opt(id).text).join(' + ')}</div>
            </div>
          </div>
        </div>
      )}

      {/* Why this is correct */}
      <section className="fb-section">
        <h3>Why this is correct</h3>
        <p className="fb-body">{question.explanation.correct}</p>
      </section>

      {/* Why the wrong pick is wrong - the misconception */}
      {wrongPicked.length > 0 && (
        <section className="fb-section">
          <h3>Why your pick was wrong</h3>
          {wrongPicked.map((id) => (
            <p key={id} className="fb-body">
              <strong>{opt(id).text}</strong> — {question.explanation.whyWrong[id]}
            </p>
          ))}
        </section>
      )}

      {/* Why the other distractors are wrong (expandable, per spec) */}
      {question.options.filter((o) => !o.isCorrect && !wrongPicked.includes(o.id)).length > 0 && (
        <section className="fb-section">
          <button
            type="button"
            className="expand-btn"
            aria-expanded={showAllWhy}
            onClick={() => setShowAllWhy((s) => !s)}
          >
            {showAllWhy ? 'Hide why the others are wrong' : 'Why are the other options wrong?'}
          </button>
          {showAllWhy && (
            <div data-testid="why-all">
              {question.options
                .filter((o) => !o.isCorrect && !wrongPicked.includes(o.id))
                .map((o) => (
                  <p key={o.id} className="fb-body">
                    <strong>{o.text}</strong> — {question.explanation.whyWrong[o.id]}
                  </p>
                ))}
            </div>
          )}
        </section>
      )}

      {/* Analogy */}
      {question.explanation.analogy && (
        <div className="analogy-box">
          <span className="analogy-bulb" aria-hidden="true">
            💡
          </span>
          <p>{question.explanation.analogy}</p>
        </div>
      )}

      {/* Takeaway */}
      <div className="takeaway-box">
        <span className="takeaway-label">Key takeaway</span>
        <p>{question.explanation.takeaway}</p>
      </div>

      {/* Optional deep dive */}
      {question.explanation.deepDive && (
        <section className="fb-section">
          <button
            type="button"
            className="expand-btn"
            aria-expanded={showDeep}
            onClick={() => setShowDeep((s) => !s)}
          >
            {showDeep ? 'Hide details' : 'Show more detail'}
          </button>
          {showDeep && <p className="fb-body">{question.explanation.deepDive}</p>}
        </section>
      )}

      {/* Confidence - optional, non-blocking */}
      <ConfidenceRow questionId={question.id} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', marginTop: 'var(--sp-5)' }}>
        {!correct && onTryAgain && (
          <button type="button" className="pill-btn secondary" onClick={onTryAgain}>
            Try again
          </button>
        )}
        <button type="button" className="pill-btn primary" onClick={onContinue} data-testid="continue">
          Continue
        </button>
        <button type="button" className="pill-btn ghost" onClick={onFlag} data-testid="flag">
          {flagged ? '⚑ Flagged for review' : '⚐ Report / flag this question'}
        </button>
      </div>

      <p style={{ marginTop: 'var(--sp-4)', fontSize: 'var(--fs-xs)', color: 'var(--text-dim)', textAlign: 'center' }}>
        Source: {question.source.section} · practice question, not an official exam item
      </p>
    </div>
  );
}

/** Lightweight, optional confidence capture that never blocks progress. */
function ConfidenceRow({ questionId }: { questionId: string }) {
  const [value, setValue] = useState<'confident' | 'unsure' | null>(null);
  if (value) return null;
  return (
    <div className="confidence-row">
      <span className="confidence-label">How did that feel?</span>
      <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
        <button
          type="button"
          className="chip"
          onClick={() => setValue('confident')}
          aria-label="Mark as confident"
          data-qid={questionId}
        >
          👍 Confident
        </button>
        <button
          type="button"
          className="chip"
          onClick={() => setValue('unsure')}
          aria-label="Mark as a guess"
          data-qid={questionId}
        >
          🤔 Was a guess
        </button>
      </div>
    </div>
  );
}
