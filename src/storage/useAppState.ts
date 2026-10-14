import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ProgressState, SessionState } from '../domain/types';
import { emptyProgress } from '../domain/progress';
import {
  loadProgress,
  saveProgress,
  loadSession,
  saveSession,
  loadSettings,
  saveSettings,
  type Settings,
} from './persistence';

/**
 * Settings are global; progress and the in-flight session are per certification.
 * `deckId` may change when the learner switches decks, which reloads from storage.
 */
export function useAppState(deckId: string) {
  const [progress, setProgressState] = useState<ProgressState>(() => loadProgress(deckId));
  const [session, setSessionState] = useState<SessionState | null>(() => loadSession(deckId));
  const [settings, setSettingsState] = useState<Settings>(() => loadSettings());

  // Switching certifications: load that deck's saved state.
  useEffect(() => {
    setProgressState(loadProgress(deckId));
    setSessionState(loadSession(deckId));
  }, [deckId]);

  const setProgress = useCallback(
    (next: ProgressState | ((p: ProgressState) => ProgressState)) => {
      setProgressState((prev) => {
        const value = typeof next === 'function' ? next(prev) : next;
        saveProgress(deckId, value);
        return value;
      });
    },
    [deckId],
  );

  const setSession = useCallback(
    (next: SessionState | null | ((s: SessionState) => SessionState)) => {
      setSessionState((prev) => {
        const value = typeof next === 'function' ? (prev ? next(prev) : prev) : next;
        saveSession(deckId, value);
        return value;
      });
    },
    [deckId],
  );

  const setSettings = useCallback((next: Settings | ((s: Settings) => Settings)) => {
    setSettingsState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      saveSettings(value);
      return value;
    });
  }, []);

  // Cross-tab sync so a refresh or second tab stays consistent.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key === progressKeyFor(deckId)) setProgressState(loadProgress(deckId));
      if (e.key === sessionKeyFor(deckId)) setSessionState(loadSession(deckId));
      if (e.key === 'ccg:settings') setSettingsState(loadSettings());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [deckId]);

  const resetProgress = useCallback(() => {
    setProgressState(emptyProgress());
    saveProgress(deckId, emptyProgress());
  }, [deckId]);

  return useMemo(
    () => ({ deckId, progress, setProgress, session, setSession, settings, setSettings, resetProgress }),
    [deckId, progress, setProgress, session, setSession, settings, setSettings, resetProgress],
  );
}

function progressKeyFor(deckId: string) {
  return `ccg:progress:${deckId}`;
}
function sessionKeyFor(deckId: string) {
  return `ccg:session:${deckId}`;
}

export type AppState = ReturnType<typeof useAppState>;
