import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/session/discover', label: 'Study', icon: '📖' },
  { to: '/review', label: 'Review', icon: '🔁' },
  { to: '/stats', label: 'Stats', icon: '📊' },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.to === '/'}
          className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
        >
          <span className="nav-icon" aria-hidden="true">
            {t.icon}
          </span>
          <span className="nav-label">{t.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
