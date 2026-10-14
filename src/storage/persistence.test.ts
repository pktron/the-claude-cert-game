import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadProgress,
  saveProgress,
  loadSession,
  saveSession,
  loadSettings,
  saveSettings,
  exportProgress,
  importProgress,
  defaultSettings,
} from './persistence';
import { emptyProgress } from '../domain/progress';

beforeEach(() => {
  localStorage.clear();
});

describe('persistence', () => {
  it('round-trips progress through localStorage (survives a reload)', () => {
    const p = emptyProgress();
    p.xpTotal = 120;
    p.cardsCompleted = 12;
    saveProgress(p);
    const loaded = loadProgress();
    expect(loaded.xpTotal).toBe(120);
    expect(loaded.cardsCompleted).toBe(12);
  });

  it('returns empty progress when nothing is stored', () => {
    expect(loadProgress().xpTotal).toBe(0);
  });

  it('recovers from corrupt JSON without throwing', () => {
    localStorage.setItem('ccg:progress', '{not json');
    expect(loadProgress().xpTotal).toBe(0);
  });

  it('preserves flags and per-question state', () => {
    const p = emptyProgress();
    p.flagged = { abc: { at: 1, note: 'x' } };
    p.questions = { z: { ...emptyProgress().questions.z } };
    saveProgress(p);
    const l = loadProgress();
    expect(l.flagged.abc.note).toBe('x');
    expect(l.questions).toBeDefined();
  });

  it('saves and clears the active session', () => {
    const s = { id: 's1', cursor: 3 } as never;
    saveSession(s);
    expect(loadSession()?.id).toBe('s1');
    saveSession(null);
    expect(loadSession()).toBeNull();
  });

  it('merges settings over defaults', () => {
    saveSettings({ ...defaultSettings, reduceMotion: true });
    const s = loadSettings();
    expect(s.reduceMotion).toBe(true);
    expect(s.defaultSessionLength).toBe(defaultSettings.defaultSessionLength);
  });

  it('exports and imports progress', () => {
    const p = emptyProgress();
    p.xpTotal = 77;
    const json = exportProgress(p);
    const back = importProgress(json);
    expect(back?.xpTotal).toBe(77);
  });

  it('rejects a non-progress import', () => {
    expect(importProgress('{"hello":1}')).toBeNull();
    expect(importProgress('nope')).toBeNull();
  });
});
