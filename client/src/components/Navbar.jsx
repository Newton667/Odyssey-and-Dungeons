import { NavLink, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const links = [
  { to: '/', label: 'Home' },
  { to: '/characters', label: 'Characters' },
  { to: '/campaigns', label: 'Campaigns' },
  { to: '/spells', label: 'Spells' },
  { to: '/equipment', label: 'Equipment' },
  { to: '/homebrew', label: 'Homebrewer' },
];

export default function Navbar() {
  const { currentVars, preset } = useTheme();
  const gold = currentVars['--gold'] || '#c9a227';
  const navBg = currentVars['--nav-bg'] || '#0d0800';
  const border = currentVars['--border'] || '#5c3d1e';
  const textDim = currentVars['--text-dim'] || '#a08060';
  const bgCard = currentVars['--bg-card'] || '#231a0e';
  const location = useLocation();

  const lastCharId = localStorage.getItem('ond-last-character');
  const onCharSheet = location.pathname.startsWith('/characters/') && !location.pathname.endsWith('/new');

  return (
    <nav style={{
      background: navBg,
      borderBottom: `2px solid ${border}`,
      // clamp: 2.5vw resolves to exactly 32px at 1280 and shrinks below that, so
      // wide screens are unchanged while narrow ones stop pushing "Settings" past
      // the right edge. The nav is a sibling of <Routes>, NOT inside `.page`, so it
      // overflowed the document rather than being clipped by `.page`'s overflow-x.
      padding: '0 clamp(12px, 2.5vw, 32px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      height: '72px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(12px, 2.5vw, 32px)', minWidth: 0 }}>
        <span style={{ fontFamily: 'Cinzel, serif', color: gold, fontWeight: 700, letterSpacing: '2px', lineHeight: 1.1 }}>
          <span style={{ fontSize: '26px', whiteSpace: 'nowrap' }}>⚔ OND</span>
          <span className="nav-wordmark" style={{ display: 'block', fontSize: '11px', letterSpacing: '3px', opacity: 0.7, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Odyssey &amp; Dragons</span>
        </span>
        {/* minWidth 0 + overflowX auto: the row shrinks and scrolls internally instead of
            letting its nowrap children spill out and paint over the Settings link. */}
        <div className="nav-links" style={{ display: 'flex', gap: '4px', minWidth: 0, overflowX: 'auto' }}>
          {links.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className="nav-link"
              style={({ isActive }) => ({
                padding: '10px clamp(9px, 1.40625vw, 18px)',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: 500,
                color: isActive ? gold : textDim,
                background: isActive ? `${bgCard}` : 'transparent',
                transition: 'all 0.15s',
                textDecoration: 'none',
              })}
            >
              {label}
            </NavLink>
          ))}
          {/* Quick-return to last character */}
          {lastCharId && !onCharSheet && (
            <NavLink
              to={`/characters/${lastCharId}`}
              className="nav-link nav-mysheet"
              style={{
                padding: '10px clamp(9px, 1.40625vw, 18px)',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: 600,
                color: gold,
                background: 'transparent',
                border: `1px solid ${gold}40`,
                transition: 'all 0.15s',
                textDecoration: 'none',
              }}
            >
              My Sheet
            </NavLink>
          )}
        </div>
      </div>

      <NavLink
        to="/settings"
        className="nav-link"
        style={({ isActive }) => ({
          flexShrink: 0,
          padding: '10px clamp(8px, 1.25vw, 16px)',
          borderRadius: '6px',
          fontSize: '16px',
          color: isActive ? gold : textDim,
          background: isActive ? bgCard : 'transparent',
          border: `1px solid ${isActive ? border : 'transparent'}`,
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          transition: 'all 0.15s',
        })}
      >
        ⚙ Settings
      </NavLink>
    </nav>
  );
}
