import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadProgress,
  saveProgress,
  loadSession,
  saveSession,
  loadSettings,
  saveSettings,
  defaultSettings,
  clearAll,
} from './persistence';
import { emptyProgress } from '../domain/progress';
import { deckList } from '../content/decks';

const DECK = deckList[0].deckId;
const OTHER = deckList.find((d) => d.deckId !== DECK)!.deckId;

beforeEach(() => {
  localStorage.clear();
});

describe('persistence', () => {
  it('round-trips progress through localStorage (survives a reload)', () => {
    const p = emptyProgress();
    p.xpTotal = 120;
    p.cardsCompleted = 12;
    saveProgress(DECK, p);
    const loaded = loadProgress(DECK);
    expect(loaded.xpTotal).toBe(120);
    expect(loaded.cardsCompleted).toBe(12);
  });

  it('returns empty progress when nothing is stored', () => {
    expect(loadProgress(DECK).xpTotal).toBe(0);
  });

  it('recovers from corrupt JSON without throwing', () => {
    localStorage.setItem(`ccg:progress:${DECK}`, '{not json');
    expect(loadProgress(DECK).xpTotal).toBe(0);
  });

  it('preserves flags and per-question state', () => {
    const p = emptyProgress();
    p.flagged = { abc: { at: 1, note: 'x' } };
    saveProgress(DECK, p);
    const l = loadProgress(DECK);
    expect(l.flagged.abc.note).toBe('x');
  });

  it('keeps each certification progress separate', () => {
    const a = emptyProgress();
    a.xpTotal = 500;
    saveProgress(DECK, a);
    // A different certification must not see it.
    expect(loadProgress(OTHER).xpTotal).toBe(0);

    const b = emptyProgress();
    b.xpTotal = 7;
    saveProgress(OTHER, b);
    expect(loadProgress(DECK).xpTotal).toBe(500);
    expect(loadProgress(OTHER).xpTotal).toBe(7);
  });

  it('keeps each certification session separate', () => {
    saveSession(DECK, { id: 'a', cursor: 3 } as never);
    expect(loadSession(DECK)?.id).toBe('a');
    expect(loadSession(OTHER)).toBeNull();
    saveSession(DECK, null);
    expect(loadSession(DECK)).toBeNull();
  });

  it('merges settings over defaults', () => {
    saveSettings({ ...defaultSettings, reduceMotion: true });
    const s = loadSettings();
    expect(s.reduceMotion).toBe(true);
    expect(s.defaultSessionLength).toBe(defaultSettings.defaultSessionLength);
  });

  it('clears every certification but leaves settings alone', () => {
    saveProgress(DECK, emptyProgress());
    saveProgress(OTHER, emptyProgress());
    saveSession(DECK, { id: 'x' } as never);
    saveSettings({ ...defaultSettings, reduceMotion: true });

    clearAll();

    expect(loadProgress(DECK).xpTotal).toBe(0);
    expect(loadProgress(OTHER).xpTotal).toBe(0);
    expect(loadSession(DECK)).toBeNull();
    // Settings are global, not per deck, so they survive.
    expect(loadSettings().reduceMotion).toBe(true);
  });
});
