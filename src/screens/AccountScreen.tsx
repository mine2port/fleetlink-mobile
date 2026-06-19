// Écran 9 — Mon Compte (fidèle maquette § 9)
// Profil + stats + mode hors-ligne + paramètres + sécurité + à propos + déconnexion

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { BottomNav } from '../components/BottomNav';
import { Toast, useToast } from '../components/Toast';
import { useSheet } from '../lib/store';
import { getPendingCount, flushQueue } from '../lib/sync-queue';
import { isLoggedIn, logout, getCurrentUser, type ApiUser } from '../lib/api';

const SETTINGS_KEY = 'fl_settings';

interface AppSettings {
  photoQuality: 'low' | 'high';
  sounds: boolean;
  haptic: boolean;
  pushNotif: boolean;
  autoSyncCellular: boolean;
  language: string;
  biometric: boolean;
  pin: boolean;
  autoLogoutMin: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  photoQuality: 'high',
  sounds: true,
  haptic: true,
  pushNotif: true,
  autoSyncCellular: false,
  language: 'fr',
  biometric: true,
  pin: true,
  autoLogoutMin: 15,
};

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_SETTINGS;
}
function saveSettings(s: AppSettings) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch {}
}

export function AccountScreen() {
  const nav = useNavigate();
  const { listArchive } = useSheet();
  const [user, setUser] = useState<ApiUser | null>(null);
  const [authed, setAuthed] = useState(false);
  const [pending, setPending] = useState(0);
  const [archiveCount, setArchiveCount] = useState(0);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const { msg, push } = useToast();

  const refresh = async () => {
    setUser(await getCurrentUser());
    setAuthed(await isLoggedIn());
    setPending(await getPendingCount());
    const arch = await listArchive();
    setArchiveCount(arch.length);
  };
  useEffect(() => {
    refresh();
    setSettings(loadSettings());
  }, []);

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    saveSettings(next);
  };

  const doLogout = async () => {
    if (!window.confirm('Se déconnecter ? (les fiches locales restent sur l\'appareil)')) return;
    await logout();
    await refresh();
    push('Déconnecté');
  };

  const forceSync = async () => {
    if (!authed) { push('Connecte-toi pour synchroniser'); return; }
    if (!navigator.onLine) { push('📴 Hors-ligne'); return; }
    push('☁️ Synchronisation…');
    const { sent, failed } = await flushQueue();
    push(`☁️ ${sent} envoyée(s), ${failed} échec(s)`);
    await refresh();
  };

  const name = user?.fullName || 'Agent local';
  const initial = name.charAt(0).toUpperCase();
  const society = user?.tenantName || 'Mode local';
  const role = user?.role || 'Agent terrain';

  // Stats : mois en cours
  const thisMonth = new Date().toISOString().slice(0, 7);
  const [monthCount, setMonthCount] = useState(0);
  useEffect(() => {
    (async () => {
      const arch = await listArchive();
      setMonthCount(arch.filter((s) => s.date?.startsWith(thisMonth)).length);
    })();
  }, [thisMonth]);

  return (
    <div className="app-shell">
      <AppHeader
        variant="dark"
        title="👤 Mon Compte"
        subtitle={`${name}${user?.id ? ` · #${String(user.id).slice(-4)}` : ''}`}
        icons={<span>⚙️</span>}
      />

      <main className="app-content2">
        {/* Profil */}
        <div className="m-card" style={{ textAlign: 'center', padding: 20 }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--good), #059669)',
            color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
            fontSize: 34, fontWeight: 800,
          }}>{initial}</div>
          <strong style={{ fontSize: 16 }}>{name}</strong>
          <div style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 14px' }}>
            {role} · {society}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-around', paddingTop: 14, borderTop: '1px solid #f1f4f3', fontSize: 11 }}>
            <div>
              <strong style={{ display: 'block', fontSize: 18, color: 'var(--navy)' }}>{monthCount}</strong>
              <div style={{ color: 'var(--muted)' }}>EDL mois</div>
            </div>
            <div>
              <strong style={{ display: 'block', fontSize: 18, color: 'var(--navy)' }}>{archiveCount}</strong>
              <div style={{ color: 'var(--muted)' }}>EDL cumul</div>
            </div>
            <div>
              <strong style={{ display: 'block', fontSize: 18, color: 'var(--good)' }}>—</strong>
              <div style={{ color: 'var(--muted)' }}>Note moy.</div>
            </div>
          </div>
        </div>

        {/* Mode hors-ligne */}
        <div className="m-card">
          <div className="m-card-title">
            📡 Mode hors-ligne
            {pending > 0 && <span className="count warn">{pending} EN ATTENTE</span>}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
            Les EDL réalisés sans connexion sont sauvegardés localement et synchronisés au prochain retour réseau.
          </div>
          {pending > 0 && (
            <div className="sync-queue">
              <strong>📥 File de synchronisation</strong>
              <div className="item">
                <span>{pending} fiche(s) en attente</span>
              </div>
            </div>
          )}
          <button className="btn-cta btn-cta-prim" onClick={forceSync} disabled={!authed}>
            📡 {authed ? 'Synchroniser maintenant' : 'Connectez-vous pour synchroniser'}
          </button>
        </div>

        {/* Paramètres */}
        <div className="m-card">
          <div className="m-card-title">⚙️ Paramètres app</div>
          <div className="profile-row">
            <div>
              <div className="lbl">Qualité photo EDL</div>
              <div className="val">{settings.photoQuality === 'high' ? 'Haute (1080p)' : 'Basse (720p)'}</div>
            </div>
            <button
              style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer' }}
              onClick={() => updateSetting('photoQuality', settings.photoQuality === 'high' ? 'low' : 'high')}
            >
              ⇄
            </button>
          </div>
          <div className="profile-row">
            <div className="lbl">Sons d'événements</div>
            <label className="toggle-mini">
              <input type="checkbox" checked={settings.sounds} onChange={(e) => updateSetting('sounds', e.target.checked)} />
              <span className="slider" />
            </label>
          </div>
          <div className="profile-row">
            <div className="lbl">Vibration tactile</div>
            <label className="toggle-mini">
              <input type="checkbox" checked={settings.haptic} onChange={(e) => updateSetting('haptic', e.target.checked)} />
              <span className="slider" />
            </label>
          </div>
          <div className="profile-row">
            <div className="lbl">Notifications push EDL</div>
            <label className="toggle-mini">
              <input type="checkbox" checked={settings.pushNotif} onChange={(e) => updateSetting('pushNotif', e.target.checked)} />
              <span className="slider" />
            </label>
          </div>
          <div className="profile-row">
            <div>
              <div className="lbl">Auto-sync réseau cellulaire</div>
              <div style={{ fontSize: 10, color: 'var(--warn)' }}>⚠ Conso data</div>
            </div>
            <label className="toggle-mini">
              <input type="checkbox" checked={settings.autoSyncCellular} onChange={(e) => updateSetting('autoSyncCellular', e.target.checked)} />
              <span className="slider" />
            </label>
          </div>
          <div className="profile-row">
            <div>
              <div className="lbl">Langue</div>
              <div className="val">Français</div>
            </div>
            <span style={{ color: 'var(--muted)' }}>▾</span>
          </div>
        </div>

        {/* Sécurité */}
        <div className="m-card">
          <div className="m-card-title">🔐 Sécurité</div>
          <div className="profile-row">
            <div className="lbl">Empreinte digitale</div>
            <label className="toggle-mini">
              <input type="checkbox" checked={settings.biometric} onChange={(e) => updateSetting('biometric', e.target.checked)} />
              <span className="slider" />
            </label>
          </div>
          <div className="profile-row">
            <div className="lbl">Code PIN à 4 chiffres</div>
            <label className="toggle-mini">
              <input type="checkbox" checked={settings.pin} onChange={(e) => updateSetting('pin', e.target.checked)} />
              <span className="slider" />
            </label>
          </div>
          <div className="profile-row">
            <div>
              <div className="lbl">Auto-déconnexion</div>
              <div className="val">{settings.autoLogoutMin} min inactivité</div>
            </div>
            <span style={{ color: 'var(--muted)' }}>▾</span>
          </div>
        </div>

        {/* À propos */}
        <div className="m-card">
          <div className="m-card-title">ℹ️ À propos</div>
          <div className="profile-row">
            <div className="lbl">Version app</div>
            <div className="val">FleetLink v1.2.4</div>
          </div>
          <div className="profile-row">
            <div className="lbl">Dernière mise à jour</div>
            <div className="val">{new Date().toLocaleDateString('fr-FR')}</div>
          </div>
          <div className="profile-row">
            <div className="lbl">Stockage utilisé</div>
            <div className="val">{archiveCount} fiche(s)</div>
          </div>
          <div className="profile-row" onClick={() => window.open('https://fleetlink.mine2port.eu/legal', '_blank')} style={{ cursor: 'pointer' }}>
            <div className="lbl">CGU + Confidentialité</div>
            <div>→</div>
          </div>
        </div>

        {/* Déconnexion */}
        {authed ? (
          <button className="btn-cta btn-cta-danger" onClick={doLogout}>
            🚪 Déconnexion
          </button>
        ) : (
          <button className="btn-cta btn-cta-prim" onClick={() => nav('/login')}>
            🔐 Se connecter au cloud
          </button>
        )}
      </main>

      <BottomNav pendingCount={pending} />
      <Toast msg={msg} />
    </div>
  );
}
