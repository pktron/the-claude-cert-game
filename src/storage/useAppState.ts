import { useCallback, useEffect, useState } from 'react';
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

/** Progress + session + settings, persisted to localStorage on every change. */
export function useAppState() {
  const [progress, setProgressState] = useState<ProgressState>(() => loadProgress());
  const [session, setSessionState] = useState<SessionState | null>(() => loadSession());
  const [settings, setSettingsState] = useState<Settings>(() => loadSettings());

  const setProgress = useCallback((next: ProgressState | ((p: ProgressState) => ProgressState)) => {
    setProgressState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      saveProgress(value);
      return value;
    });
  }, []);

  const setSession = useCallback((next: SessionState | null | ((s: SessionState) => SessionState)) => {
    setSessionState((prev) => {
      const value = typeof next === 'function' ? (prev ? next(prev) : prev) : next;
      saveSession(value);
      return value;
    });
  }, []);

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
      if (e.key === 'ccg:progress') setProgressState(loadProgress());
      if (e.key === 'ccg:session') setSessionState(loadSession());
      if (e.key === 'ccg:settings') setSettingsState(loadSettings());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const resetProgress = useCallback(() => {
    setProgressState(emptyProgress());
    saveProgress(emptyProgress());
  }, []);

  return { progress, setProgress, session, setSession, settings, setSettings, resetProgress };
}

export type AppState = ReturnType<typeof useAppState>;
