// Bottom navigation 5 onglets — fidèle maquette agent-terrain-fleetlink.html
// Onglets : Accueil / EDL / Planning / Carte Pro / Compte
import { useLocation, useNavigate } from 'react-router-dom';

type NavKey = 'home' | 'edl' | 'planning' | 'carte' | 'compte';

interface Props {
  pendingCount?: number;
}

const ITEMS: { key: NavKey; path: string; icon: string; label: string }[] = [
  { key: 'home', path: '/', icon: '🏠', label: 'Accueil' },
  { key: 'edl', path: '/edl-list', icon: '📋', label: 'EDL' },
  { key: 'planning', path: '/planning', icon: '📅', label: 'Planning' },
  { key: 'carte', path: '/carte', icon: '🛡️', label: 'Carte' },
  { key: 'compte', path: '/compte', icon: '👤', label: 'Compte' },
];

export function BottomNav({ pendingCount = 0 }: Props) {
  const nav = useNavigate();
  const loc = useLocation();

  const isActive = (path: string): boolean => {
    if (path === '/') return loc.pathname === '/';
    return loc.pathname === path || loc.pathname.startsWith(path + '/');
  };

  return (
    <nav className="bottom-nav" role="navigation" aria-label="Navigation principale">
      {ITEMS.map((item) => (
        <button
          key={item.key}
          className={`bottom-nav-item ${isActive(item.path) ? 'active' : ''}`}
          onClick={() => nav(item.path)}
          type="button"
        >
          <span className="ic">{item.icon}</span>
          {item.label}
          {item.key === 'edl' && pendingCount > 0 && (
            <span className="pill-mini">{pendingCount > 9 ? '9+' : pendingCount}</span>
          )}
        </button>
      ))}
    </nav>
  );
}
