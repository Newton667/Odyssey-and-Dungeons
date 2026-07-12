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
      padding: '0 32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: '72px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        <span style={{ fontFamily: 'Cinzel, serif', color: gold, fontWeight: 700, letterSpacing: '2px', lineHeight: 1.1 }}>
          <span style={{ fontSize: '26px' }}>⚔ OND</span>
          <span style={{ display: 'block', fontSize: '11px', letterSpacing: '3px', opacity: 0.7, textTransform: 'uppercase' }}>Odyssey & Dragons</span>
        </span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {links.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className="nav-link"
              style={({ isActive }) => ({
                padding: '10px 18px',
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
              className="nav-link"
              style={{
                padding: '10px 18px',
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
          padding: '10px 16px',
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
