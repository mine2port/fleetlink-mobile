// ============================================================
// Écran de connexion FleetLink — couche cloud.
// Mode normal : email + mot de passe vers /auth/login.
// MODE TEST : "Accès rapide" liste les comptes /dev/accounts et
// permet un magic-login en 1 clic (calqué sur la page web).
// ============================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, listDevAccounts, magicLogin, type DevAccount } from '../lib/api';

const ROLE_LABEL: Record<DevAccount['role'], string> = {
  SUPER_ADMIN: 'Super admin FleetLink',
  SUPER_ADMIN_FLEETLINK: 'Super admin FleetLink',
  ADMIN_TENANT: 'Admin société',
  FLEET_MANAGER: 'Gestionnaire flotte',
  FIELD_AGENT: 'Agent terrain',
};

export function LoginScreen({ onAuthenticated }: { onAuthenticated: () => void }) {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // MODE TEST
  const [devAccounts, setDevAccounts] = useState<DevAccount[] | null>(null);
  const [devLoading, setDevLoading] = useState(false);

  // Tentative discrète : si /dev/accounts répond 200, on affiche le panneau.
  useEffect(() => {
    setDevLoading(true);
    listDevAccounts()
      .then((list) => setDevAccounts(list.length > 0 ? list : null))
      .catch(() => setDevAccounts(null))
      .finally(() => setDevLoading(false));
  }, []);

  async function doLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      await login(email.trim(), password);
      onAuthenticated();
      nav('/', { replace: true });
    } catch (e: any) {
      setErr(e?.message || 'Connexion impossible. Vérifie tes identifiants.');
    } finally {
      setLoading(false);
    }
  }

  async function doMagic(acc: DevAccount) {
    setLoading(true);
    setErr(null);
    try {
      await magicLogin(acc.id);
      onAuthenticated();
      nav('/', { replace: true });
    } catch (e: any) {
      setErr(e?.message || 'Magic-login impossible.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <h2>FleetLink Terrain</h2>
        <p className="login-sub">App agent — états des lieux DÉPART / RETOUR</p>

        <form onSubmit={doLogin} className="gap-12">
          <div className="fld">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="agent@societe.com" autoComplete="email" required />
          </div>
          <div className="fld">
            <label>Mot de passe</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password" required />
          </div>
          {err && <div className="muted" style={{ color: 'var(--bad)' }}>{err}</div>}
          <button type="submit" className="btn primary" disabled={loading}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        {/* Panneau Mode Test : visible uniquement si /dev/accounts répond */}
        {devLoading && (
          <div className="muted center" style={{ marginTop: 16 }}>Détection mode test…</div>
        )}
        {devAccounts && (
          <div className="quick-zone">
            <h4>⚡ Accès rapide (mode test)</h4>
            <div className="muted" style={{ marginBottom: 8 }}>
              1 clic = magic-login sans mot de passe — disponible quand l'API expose <code>/dev/accounts</code>.
            </div>
            <div className="quick-acc-list">
              {devAccounts.map((acc) => (
                <button key={acc.email} type="button" onClick={() => doMagic(acc)} disabled={loading}>
                  <b>{acc.fullName}</b>
                  <span className="muted" style={{ marginLeft: 6 }}>· {ROLE_LABEL[acc.role]}</span>
                  <br/>
                  <span className="muted" style={{ fontSize: 11 }}>{acc.email}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="center muted" style={{ marginTop: 16, fontSize: 11 }}>
          fleetlink.mine2port.fr — fork rebrandé Mine2Port - État de Lieu
        </div>
      </div>
    </div>
  );
}
