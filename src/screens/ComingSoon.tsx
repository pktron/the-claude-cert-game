import { Link, useLocation } from 'react-router-dom';
import { getDeckMeta, deckList } from '../content/decks';

/**
 * Shown for a certification whose question bank has not been authored yet.
 * "Coming soon" is derived from the deck registry, never hardcoded.
 */
export function ComingSoon({ deckId }: { deckId?: string }) {
  const fromState = (useLocation().state as { deckId?: string } | null)?.deckId;
  const id = deckId ?? fromState;
  const meta = id ? getDeckMeta(id) : undefined;

  const others = deckList.filter((d) => d.deckId !== id);

  return (
    <div className="coming">
      <div className="coming-emoji" aria-hidden="true">
        🗺️
      </div>
      <h1>{meta ? `${meta.shortName} is coming soon` : 'Coming soon'}</h1>
      <p style={{ color: 'var(--text-muted)', marginTop: 'var(--sp-3)' }}>
        {meta
          ? `We are authoring the question bank for ${meta.examCode} from its official exam guide, using the same process as the foundations deck.`
          : 'This certification has not been added yet.'}
      </p>

      {meta && (
        <div className="card coming-card">
          <div className="coming-row">
            <div>
              <div className="coming-name">{meta.domains.length} domains</div>
              <div className="coming-code">
                {meta.objectiveCount} objectives · {meta.items} exam items
              </div>
            </div>
            <span className="coming-badge">Planned</span>
          </div>
          <div className="coming-domains">
            {meta.domains.map((d) => (
              <span key={d.id} className="coming-domain">
                {d.name} <em>{d.weight}%</em>
              </span>
            ))}
          </div>
        </div>
      )}

      {others.length > 0 && (
        <>
          <h2 className="cert-section">Your other certifications</h2>
          <div className="cert-list">
            {others
              .filter((d) => d.available)
              .map((d) => (
                <Link key={d.deckId} to={`/c/${d.deckId}`} className="cert-card">
                  <div className="cert-top">
                    <div>
                      <div className="cert-name">{d.shortName}</div>
                      <div className="cert-code">
                        {d.examCode} · {d.questionCount} cards
                      </div>
                    </div>
                    <span className="cert-go" aria-hidden="true">
                      ›
                    </span>
                  </div>
                </Link>
              ))}
          </div>
        </>
      )}

      <Link to="/c" className="pill-btn primary" style={{ marginTop: 'var(--sp-6)' }}>
        ← All certifications
      </Link>
    </div>
  );
}
