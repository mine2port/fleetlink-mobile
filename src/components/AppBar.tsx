// Barre d'en-tête commune à toutes les vues, avec :
// - logo FleetLink (clique = retour accueil)
// - lien vers la plateforme web fleetlink.mine2port.fr (ouvre en navigateur externe)

import { useNavigate } from 'react-router-dom';

// URL de la plateforme principale FleetLink (peut être surchargée par variable d'env si besoin).
export const FLEETLINK_WEB_URL = 'https://fleetlink.mine2port.fr';

export function AppBar({ subtitle }: { subtitle?: string }) {
  const nav = useNavigate();
  // Sur Android, on cherche à ouvrir l'URL dans le navigateur du système plutôt que dans la WebView.
  const openFleetLink = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    try {
      const mod = await import('@capacitor/app').catch(() => null as any);
      window.open(FLEETLINK_WEB_URL, '_system');
      void mod;
    } catch {
      window.open(FLEETLINK_WEB_URL, '_blank');
    }
  };

  return (
    <header className="appbar">
      <img
        className="logo"
        src="/logo-fleetlink.svg"
        alt="FleetLink"
        onClick={() => nav('/')}
      />
      <div className="titles">
        <h1>FleetLink · État de Lieu</h1>
        {subtitle && <small>{subtitle}</small>}
      </div>
      <a className="web-link" href={FLEETLINK_WEB_URL} onClick={openFleetLink}>
        Plateforme ↗
      </a>
    </header>
  );
}
