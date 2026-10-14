import type { ProgressState, SessionState } from '../domain/types';
import { emptyProgress, PROGRESS_VERSION } from '../domain/progress';

const SETTINGS_KEY = 'ccg:settings';

/**
 * Progress and the active session are stored per certification, so studying
 * CCAR-P never touches the learner's CCAR-F history. Settings stay global.
 */
const progressKey = (deckId: string) => `ccg:progress:${deckId}`;
const sessionKey = (deckId: string) => `ccg:session:${deckId}`;

export interface Settings {
  reduceMotion: boolean;
  highContrast: boolean;
  sound: boolean;
  haptics: boolean;
  defaultSessionLength: number;
  showDirectionHints: boolean;
}

export const defaultSettings: Settings = {
  reduceMotion: false,
  highContrast: false,
  sound: false,
  haptics: true,
  defaultSessionLength: 10,
  showDirectionHints: true,
};

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** Load progress for a certification, guarding against corrupt or older-version data. */
export function loadProgress(deckId: string): ProgressState {
  const data = safeParse<ProgressState>(localStorage.getItem(progressKey(deckId)));
  if (!data || typeof data !== 'object') return emptyProgress();
  if (data.version !== PROGRESS_VERSION) {
    return { ...emptyProgress(), ...data, version: PROGRESS_VERSION };
  }
  return { ...emptyProgress(), ...data, questions: data.questions ?? {}, flagged: data.flagged ?? {} };
}

export function saveProgress(deckId: string, progress: ProgressState): void {
  safeWrite(progressKey(deckId), progress);
}

export function loadSession(deckId: string): SessionState | null {
  return safeParse<SessionState>(localStorage.getItem(sessionKey(deckId)));
}

export function saveSession(deckId: string, session: SessionState | null): void {
  if (session === null) localStorage.removeItem(sessionKey(deckId));
  else safeWrite(sessionKey(deckId), session);
}

export function loadSettings(): Settings {
  const data = safeParse<Partial<Settings>>(localStorage.getItem(SETTINGS_KEY));
  return { ...defaultSettings, ...(data ?? {}) };
}

export function saveSettings(settings: Settings): void {
  safeWrite(SETTINGS_KEY, settings);
}

/** Export progress as a downloadable JSON backup. */
export function exportProgress(progress: ProgressState): string {
  return JSON.stringify(progress, null, 2);
}

export function importProgress(json: string): ProgressState | null {
  const data = safeParse<ProgressState>(json);
  if (!data || typeof data !== 'object' || !data.questions) return null;
  return { ...emptyProgress(), ...data, version: PROGRESS_VERSION };
}

export function clearAll(): void {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('ccg:progress:') || key.startsWith('ccg:session:')) {
      localStorage.removeItem(key);
    }
  }
}
