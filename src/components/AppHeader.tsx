// AppHeader dégradé maquette FleetLink — variantes success/accent/primary/dark
// Utilisé sur tous les écrans hors wizard
import { type ReactNode } from 'react';

type Variant = 'success' | 'accent' | 'primary' | 'dark';

interface Props {
  variant?: Variant;
  avatar?: string;        // initiale dans le rond
  title: string;
  subtitle?: string;
  icons?: ReactNode;       // notif, settings...
  onBack?: () => void;     // si défini, affiche flèche retour
}

export function AppHeader({ variant = 'success', avatar, title, subtitle, icons, onBack }: Props) {
  const cls = variant === 'success' ? '' : variant;
  return (
    <header className={`app-header2 ${cls}`}>
      {onBack && (
        <button className="back-btn" onClick={onBack} aria-label="Retour" type="button" style={{ background: 'none', border: 'none', color: '#fff' }}>
          ←
        </button>
      )}
      {avatar && <div className="av">{avatar}</div>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {icons && <div className="icons">{icons}</div>}
    </header>
  );
}
