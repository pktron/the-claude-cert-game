import type { ProgressState, SessionState } from '../domain/types';
import { emptyProgress, PROGRESS_VERSION } from '../domain/progress';

const PROGRESS_KEY = 'ccg:progress';
const SESSION_KEY = 'ccg:session';
const SETTINGS_KEY = 'ccg:settings';

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

/** Load progress, guarding against corrupt or older-version data. */
export function loadProgress(): ProgressState {
  const data = safeParse<ProgressState>(localStorage.getItem(PROGRESS_KEY));
  if (!data || typeof data !== 'object') return emptyProgress();
  if (data.version !== PROGRESS_VERSION) {
    // Future: add migrations here. For now, a version mismatch is safer to drop
    // than to misinterpret, but we preserve nothing to lose in the MVP.
    return { ...emptyProgress(), ...data, version: PROGRESS_VERSION };
  }
  return { ...emptyProgress(), ...data, questions: data.questions ?? {}, flagged: data.flagged ?? {} };
}

export function saveProgress(progress: ProgressState): void {
  safeWrite(PROGRESS_KEY, progress);
}

export function loadSession(): SessionState | null {
  return safeParse<SessionState>(localStorage.getItem(SESSION_KEY));
}

export function saveSession(session: SessionState | null): void {
  if (session === null) localStorage.removeItem(SESSION_KEY);
  else safeWrite(SESSION_KEY, session);
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
  localStorage.removeItem(PROGRESS_KEY);
  localStorage.removeItem(SESSION_KEY);
}
