import { NavLink, useLocation } from 'react-router-dom';

/**
 * Tab bar for the certification layout. Links are relative so they stay inside
 * /c/:deckId, which the router resolves against the current route.
 */
const TABS = [
  { to: '.', label: 'Home', icon: '🏠', end: true },
  { to: 'session/discover', label: 'Study', icon: '📖' },
  { to: 'review', label: 'Review', icon: '🔁' },
  { to: 'stats', label: 'Stats', icon: '📊' },
];

export function BottomNav() {
  const { pathname } = useLocation();
  const atCertRoot = /^\/c\/[^/]+\/?$/.test(pathname);

  return (
    <nav className="bottom-nav" aria-label="Primary">
      {TABS.map((t) => (
        <NavLink
          key={t.label}
          to={t.to}
          end={t.end}
          className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
        >
          <span className="nav-icon" aria-hidden="true">
            {t.icon}
          </span>
          <span className="nav-label">{t.label}</span>
        </NavLink>
      ))}
      <NavLink to="/c" className={`nav-tab ${atCertRoot ? '' : 'nav-switch'}`}>
        <span className="nav-icon" aria-hidden="true">
          ⇄
        </span>
        <span className="nav-label">Certs</span>
      </NavLink>
    </nav>
  );
}
