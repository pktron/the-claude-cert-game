import { useCallback, useState } from 'react';
import { loadSettings, saveSettings, type Settings } from './persistence';

/** Global preferences. Shared by every certification, so this is not deck-scoped. */
export function useSettings() {
  const [settings, setSettingsState] = useState<Settings>(() => loadSettings());

  const setSettings = useCallback(
    (next: Settings | ((s: Settings) => Settings)) => {
      setSettingsState((prev) => {
        const value = typeof next === 'function' ? next(prev) : next;
        saveSettings(value);
        return value;
      });
    },
    [],
  );

  return { settings, setSettings };
}
