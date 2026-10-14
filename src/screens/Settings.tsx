import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { deckList, getDeckQuestions } from '../content/decks';
import { useSettings } from '../storage/useSettings';
import { useAllProgress } from '../storage/useAllProgress';
import { clearAll } from '../storage/persistence';
import { emptyProgress } from '../domain/progress';
import type { ProgressState } from '../domain/types';

export function Settings() {
  const { settings, setSettings } = useSettings();
  const { progressByDeck, setDeckProgress, resetDeck } = useAllProgress();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const toggle = (key: keyof typeof settings) => () => {
    setSettings((s) => ({ ...s, [key]: !s[key] }));
  };

  const onExport = () => {
    const blob = new Blob([JSON.stringify(progressByDeck, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'claude-cert-game-progress.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Record<string, ProgressState>;
        if (!parsed || typeof parsed !== 'object') throw new Error('bad file');
        for (const [deckId, p] of Object.entries(parsed)) {
          if (p && typeof p === 'object' && p.questions) setDeckProgress(deckId, { ...emptyProgress(), ...p });
        }
      } catch {
        alert('That file could not be read as a progress backup.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="settings">
      <h1>Settings</h1>

      <section className="card settings-group">
        <h3>Accessibility</h3>
        <Toggle
          label="Reduce motion"
          hint="Removes card animations and confetti."
          on={settings.reduceMotion}
          onToggle={toggle('reduceMotion')}
          testid="toggle-reduce-motion"
        />
        <Toggle
          label="Higher contrast"
          hint="Stronger borders and brighter secondary text."
          on={settings.highContrast}
          onToggle={toggle('highContrast')}
        />
        <Toggle
          label="Vibration"
          hint="Short buzz on answer (if your device supports it)."
          on={settings.haptics}
          onToggle={toggle('haptics')}
        />
        <Toggle
          label="Show swipe direction hints"
          hint="Keeps the swipe labels visible under each option."
          on={settings.showDirectionHints ?? true}
          onToggle={() =>
            setSettings((s) => ({ ...s, showDirectionHints: !(s.showDirectionHints ?? true) }))
          }
        />
      </section>

      <section className="card settings-group">
        <h3>Sessions</h3>
        <label className="field">
          Default session length
          <select
            value={settings.defaultSessionLength}
            onChange={(e) => setSettings((s) => ({ ...s, defaultSessionLength: Number(e.target.value) }))}
          >
            <option value={5}>5 cards</option>
            <option value={10}>10 cards</option>
            <option value={20}>20 cards</option>
          </select>
        </label>
      </section>

      <section className="card settings-group">
        <h3>Your certifications</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>
          Progress is stored per certification on this device only.
        </p>
        <div style={{ display: 'grid', gap: 'var(--sp-2)', marginTop: 'var(--sp-3)' }}>
          {deckList.map((d) => {
            const p = progressByDeck[d.deckId] ?? emptyProgress();
            return (
              <div key={d.deckId} className="deck-progress-row">
                <div className="deck-progress-info">
                  <span className="deck-progress-name">{d.shortName}</span>
                  <span className="deck-progress-sub">
                    {p.cardsCompleted} answered · {p.sessionsCompleted} sessions · {p.xpTotal} XP
                  </span>
                </div>
                <button
                  type="button"
                  className="deck-reset"
                  onClick={() => {
                    if (confirm(`Erase all ${d.shortName} progress? This cannot be undone.`)) {
                      resetDeck(d.deckId);
                    }
                  }}
                >
                  Reset
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card settings-group">
        <h3>Your data</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', marginTop: 'var(--sp-3)' }}>
          <button type="button" className="pill-btn ghost" onClick={onExport}>
            Export all progress
          </button>
          <button type="button" className="pill-btn ghost" onClick={() => fileRef.current?.click()}>
            Import progress
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])}
          />
          <button
            type="button"
            className="pill-btn ghost"
            onClick={() => {
              if (confirm('Erase all local progress for every certification? This cannot be undone.')) {
                clearAll();
                for (const d of deckList) setDeckProgress(d.deckId, emptyProgress());
              }
            }}
          >
            Reset everything
          </button>
        </div>
      </section>

      <section className="card settings-group">
        <h3>About</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>
          The Claude Cert Game. Questions are authored from the official Anthropic exam guides:{' '}
          {deckList
            .map((d) => `${d.examCode} (${getDeckQuestions(d.deckId).length} cards)`)
            .join(', ')}
          . Practice material only; these are not official exam items.
        </p>
      </section>

      <button type="button" className="pill-btn ghost" onClick={() => navigate('/c')} style={{ marginTop: 'var(--sp-4)' }}>
        ← Back to certifications
      </button>
    </div>
  );
}

function Toggle({
  label,
  hint,
  on,
  onToggle,
  testid,
}: {
  label: string;
  hint?: string;
  on: boolean;
  onToggle: () => void;
  testid?: string;
}) {
  return (
    <button
      type="button"
      className="toggle-row"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      data-testid={testid}
    >
      <span className="toggle-text">
        <span className="toggle-label">{label}</span>
        {hint && <span className="toggle-hint">{hint}</span>}
      </span>
      <span className={`toggle-switch ${on ? 'on' : ''}`} aria-hidden="true">
        <span className="toggle-knob" />
      </span>
    </button>
  );
}
