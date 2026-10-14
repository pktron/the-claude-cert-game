import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Direction, Question, SessionCard, SessionMode } from '../domain/types';
import { useDeck } from '../content/DeckContext';
import { getQuestion, domainName } from '../content/decks';
import { createSession, currentQuestionId, isSessionComplete, makeCard } from '../domain/session';
import { gradeAnswer } from '../domain/grade';
import { recordAnswer, flagQuestion } from '../domain/progress';
import { letterMap, presentationRows } from '../domain/presentation';
import { xpForAnswer, updateStreak, milestoneReached } from '../domain/scoring';
import type { AppState } from '../storage/useAppState';
import { SwipeCard } from '../components/SwipeCard';
import { FeedbackPanel } from '../components/FeedbackPanel';
import { useReducedMotion, haptic } from '../hooks/useReducedMotion';
import { Link } from 'react-router-dom';

const LENGTHS: Record<SessionMode, number[]> = {
  discover: [5, 10, 20],
  challenge: [5, 10, 20],
  recall: [5, 10, 20],
};

export function SessionScreen({ app }: { app: AppState }) {
  const { mode } = useParams<{ mode: SessionMode }>();
  const sessionMode = (mode ?? 'discover') as SessionMode;
  const { meta, questions } = useDeck();
  const deckId = meta.deckId;
  const qOf = (id: string) => getQuestion(deckId, id);
  const navigate = useNavigate();
  const { progress, setProgress, session, setSession, settings } = app;
  const reduceMotion = useReducedMotion(settings);
  const [milestone, setMilestone] = useState<number | null>(null);
  const [showLengthPicker, setShowLengthPicker] = useState(false);

  // Start (or resume) a session for this mode.
  // A completed session is left intact so the Summary screen can report on it;
  // the Summary's "Continue" action clears it, which triggers a fresh build.
  useEffect(() => {
    if (session && session.config.mode === sessionMode) return; // resume or finished
    const now = Date.now();
    const len = settings.defaultSessionLength || 10;
    const fresh = createSession(questions, progress, { mode: sessionMode, targetLength: len }, now);
    setSession(fresh);
  }, [sessionMode, session, setSession, progress, settings.defaultSessionLength]);

  const qid = session ? currentQuestionId(session) : null;
  const question: Question | null = qid ? (qOf(qid) ?? null) : null;

  // Build/refresh the presentation card for the current question.
  // Derived (not stored during render) so the direction assignment stays stable
  // across re-renders without a render-phase side effect.
  const card: SessionCard | null = useMemo(() => {
    if (!session || !question) return null;
    const existing = session.cards[question.id];
    if (existing) return existing;
    return makeCard(question, `${session.id}:${question.id}:1`);
  }, [session, question]);

  // Persist the derived card so it survives a reload / resume.
  useEffect(() => {
    if (!session || !question || !card) return;    if (session.cards[question.id]) return;
    setSession((s) => (s ? { ...s, cards: { ...s.cards, [question.id]: card } } : s));
  }, [session, question, card, setSession]);

  // The card's display order (and therefore its letters) is re-randomised per
  // presentation; the feedback screen reuses the same seed so the letter the
  // learner tapped is the letter they see again.
  const presentationSeed = session && question
    ? `${session.id}:${question.id}:${Object.keys(session.cards).length}`
    : '';
  const cardLetters = useMemo(
    () =>
      question && card
        ? letterMap(
            presentationRows(
              question.options.map((o) => o.id),
              card.directionAssignment,
              presentationSeed,
              question.type === 'multiple',
            ),
          )
        : {},
    [question, card, presentationSeed],
  );

  const commit = useCallback(
    (selectedOptionIds: string[]) => {
      if (!session || !question || !card || card.committed) return;
      const correct = gradeAnswer(question, selectedOptionIds);
      const now = Date.now();
      const xp = xpForAnswer(correct, question.options.length);
      const streak = updateStreak(session.streak, session.bestStreak, correct);

      setSession((s) => {
        if (!s) return s;
        const committedCard: SessionCard = {
          ...card,
          committed: true,
          selectedOptionIds,
          correct,
        };
        return {
          ...s,
          cards: { ...s.cards, [question.id]: committedCard },
          answered: s.answered + 1,
          correctTotal: s.correctTotal + (correct ? 1 : 0),
          streak: streak.streak,
          bestStreak: streak.bestStreak,
          xp: s.xp + xp,
        };
      });

      const beforeTotal = Object.values(progress.questions).reduce((a, q) => a + q.correctCount, 0);
      setProgress((p) => recordAnswer(p, question, correct, {}, now, xp, streak.streak, streak.bestStreak));
      haptic(correct ? 18 : [8, 40, 8], settings.haptics);

      const afterTotal = beforeTotal + (correct ? 1 : 0);
      setMilestone(milestoneReached(afterTotal, beforeTotal));
    },
    [session, question, card, setSession, setProgress, progress, settings.haptics],
  );

  const onSwipe = useCallback(
    (dir: Direction) => {
      if (!card) return;
      const optionId = card.directionAssignment[dir];
      if (optionId) commit([optionId]);
    },
    [card, commit],
  );

  const onTapSelect = useCallback(
    (optionId: string) => {
      if (!card || !question || card.committed) return;
      if (question.type === 'multiple') {
        // Toggle selection; committing happens via the Submit button.
        setSession((s) => {
          if (!s) return s;
          const cur = s.cards[question.id];
          if (!cur) return s;
          const has = cur.selectedOptionIds.includes(optionId);
          const next = has
            ? cur.selectedOptionIds.filter((x) => x !== optionId)
            : [...cur.selectedOptionIds, optionId];
          return { ...s, cards: { ...s.cards, [question.id]: { ...cur, selectedOptionIds: next } } };
        });
      } else {
        // Tap parity with swipe for single-answer.
        commit([optionId]);
      }
    },
    [card, question, setSession, commit],
  );

  const onTryAgain = useCallback(() => {
    if (!session || !question) return;
    const next = makeCard(question, `${session.id}:${question.id}:${Date.now()}`);
    setSession((s) => (s ? { ...s, cards: { ...s.cards, [question.id]: next } } : s));
  }, [session, question, setSession]);

  const onContinue = useCallback(() => {
    setSession((s) => {
      if (!s) return s;
      const nextCursor = s.cursor + 1;
      if (nextCursor >= s.queue.length) {
        return { ...s, cursor: nextCursor, endedAt: Date.now() };
      }
      return { ...s, cursor: nextCursor };
    });
    setMilestone(null);
  }, [setSession]);

  const onFlag = useCallback(() => {
    if (!question) return;
    setProgress((p) => flagQuestion(p, question.id, Date.now()));
  }, [question, setProgress]);

  // Redirect to summary when THIS mode's queue is exhausted.
  // Guarded so repeated renders do not count the same finished session twice.
  const countedSession = useRef<string | null>(null);
  useEffect(() => {
    if (session && session.config.mode === sessionMode && isSessionComplete(session)) {
      if (countedSession.current !== session.id) {
        countedSession.current = session.id;
        setProgress((p) => ({ ...p, sessionsCompleted: p.sessionsCompleted + 1 }));
      }
      navigate(`/c/${deckId}/summary/${sessionMode}`, { replace: true });
    }
  }, [session, navigate, setProgress, sessionMode]);

  if (showLengthPicker || !question || !card || !session) {
    return (
      <SessionSetup
        mode={sessionMode}
        lengths={LENGTHS[sessionMode]}
        onPick={(len) => {
          const fresh = createSession(questions, progress, { mode: sessionMode, targetLength: len }, Date.now());
          setSession(fresh);
          setShowLengthPicker(false);
        }}
        onBack={() => navigate(`/c/${deckId}`)}
      />
    );
  }

  const total = session.queue.length;
  const index = session.cursor + 1;

  return (
    <div className="session-screen">
      <header className="session-header">
        <Link to={`/c/${deckId}`} className="back-btn" aria-label="Exit session">
          ←
        </Link>
        <div className="session-title">
          <div className="session-domain">{domainName(deckId, question.domain)}</div>
          <div className="session-count" data-testid="card-counter">
            {index}/{total}
          </div>
        </div>
        <div className="session-xp" data-testid="session-xp">
          ⭐ {session.xp}
        </div>
      </header>

      <div className="progress-track" style={{ marginBottom: 'var(--sp-4)' }}>
        <div className="progress-fill" style={{ width: `${(index / total) * 100}%` }} />
      </div>

      {milestone && (
        <div className="milestone-banner" role="status">
          🎉 {milestone} correct answers — nice work!
        </div>
      )}

      {card.committed ? (
        <FeedbackPanel
          question={question}
          correct={card.correct === true}
          committedIds={card.selectedOptionIds}
          letters={cardLetters}
          reduceMotion={reduceMotion}
          soundOn={settings.sound}
          flagged={!!progress.flagged[question.id]}
          onFlag={onFlag}
          onContinue={onContinue}
          onTryAgain={question.type === 'single' ? onTryAgain : undefined}
        />
      ) : (
        <>
          <SwipeCard
            question={question}
            presentationSeed={presentationSeed}
            directionAssignment={card.directionAssignment}
            selectedOptionIds={card.selectedOptionIds}
            revealed={false}
            committedIds={[]}
            reduceMotion={reduceMotion}
            showDirectionHints={settings.showDirectionHints ?? true}
            onSwipe={onSwipe}
            onTapSelect={onTapSelect}
            multi={question.type === 'multiple'}
          />

          {question.type === 'multiple' && (
            <button
              type="button"
              className="pill-btn primary"
              style={{ marginTop: 'var(--sp-4)' }}
              disabled={card.selectedOptionIds.length === 0}
              data-testid="submit-multi"
              onClick={() => commit(card.selectedOptionIds)}
            >
              Submit {card.selectedOptionIds.length} selected
            </button>
          )}
        </>
      )}
    </div>
  );
}

function SessionSetup({
  mode,
  lengths,
  onPick,
  onBack,
}: {
  mode: SessionMode;
  lengths: number[];
  onPick: (n: number) => void;
  onBack: () => void;
}) {
  const titles: Record<SessionMode, { title: string; blurb: string; emoji: string }> = {
    discover: {
      title: 'Swipe & Discover',
      blurb: 'Quick concept cards. Swipe toward the answer that feels right.',
      emoji: '🃏',
    },
    challenge: {
      title: 'Challenge',
      blurb: 'Certification-style questions, including select-all-that-apply.',
      emoji: '🎯',
    },
    recall: {
      title: 'Recall',
      blurb: 'Bring back what you have not seen in a while, and anything you missed.',
      emoji: '🔁',
    },
  };
  const t = titles[mode];

  return (
    <div className="setup">
      <button type="button" className="back-btn setup-back" onClick={onBack} aria-label="Go back">
        ←
      </button>
      <div className="setup-emoji" aria-hidden="true">
        {t.emoji}
      </div>
      <h1>{t.title}</h1>
      <p style={{ color: 'var(--text-muted)', marginTop: 'var(--sp-2)' }}>{t.blurb}</p>

      <div style={{ marginTop: 'var(--sp-6)', display: 'grid', gap: 'var(--sp-3)' }}>
        {lengths.map((n) => (
          <button key={n} type="button" className="pill-btn session-len" onClick={() => onPick(n)}>
            <strong>{n} cards</strong>
            <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
              {n === 5 ? '~5 min · quick' : n === 10 ? '~10 min · standard' : '~20 min · extended'}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
