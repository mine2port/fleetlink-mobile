// Écran 7 — Ma Carte Pro virtuelle (fidèle maquette § 7)
// Recto : photo + nom + n° + société + zone + permis + valid
// Verso : QR de vérification publique + signature crypto

import { useEffect, useState } from 'react';
import { AppHeader } from '../components/AppHeader';
import { BottomNav } from '../components/BottomNav';
import { QrCode } from '../components/QrCode';
import { Toast, useToast } from '../components/Toast';
import { getCurrentUser, type ApiUser } from '../lib/api';
import { getPendingCount } from '../lib/sync-queue';

export function ProCardScreen() {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [pending, setPending] = useState(0);
  const { msg, push } = useToast();

  useEffect(() => {
    (async () => {
      setUser(await getCurrentUser());
      setPending(await getPendingCount());
    })();
  }, []);

  // Fallback démo si non connecté
  const card = {
    fullName: user?.fullName || 'Mamadou Camara',
    id: user?.id ? `FA-${String(user.id).slice(-3).padStart(3, '0')}` : 'FA-001',
    society: user?.tenantName || 'Trans Africa Connect',
    zone: 'Conakry · Boké · Sangarédi',
    hiredAt: '12/03/2023',
    permis: 'B + C + CE',
    validUntil: '31/12/2026',
  };
  const initial = card.fullName.charAt(0).toUpperCase();
  const qrValue = `https://fleetlink.mine2port.fr/v/${card.id}-2026`;

  const share = async () => {
    try {
      const mod = await import('@capacitor/share').catch(() => null as any);
      if (mod?.Share) {
        await mod.Share.share({
          title: 'Ma carte pro FleetLink',
          text: `${card.fullName} · Agent terrain #${card.id} · ${card.society}`,
          url: qrValue,
        });
        return;
      }
    } catch {}
    if (navigator.share) {
      navigator.share({ title: 'Carte pro FleetLink', text: card.fullName, url: qrValue });
    } else {
      push('Partage non supporté sur ce navigateur');
    }
  };

  const savePng = () => {
    push('💾 Export PNG à venir');
  };

  return (
    <div className="app-shell">
      <AppHeader
        variant="primary"
        title="🛡️ Ma Carte Pro"
        subtitle="Identifiant officiel · valide 2026"
        icons={<span onClick={share} style={{ cursor: 'pointer' }}>📤</span>}
      />

      <main className="app-content2" style={{ background: 'linear-gradient(180deg, var(--navy) 0%, var(--navy) 25%, var(--bg) 25%)' }}>
        {/* RECTO */}
        <div className="pro-card">
          <div className="pro-card-head">
            <div>
              <div className="label">FleetLink ID</div>
              <div className="name">{card.fullName}</div>
              <div className="role">Agent terrain · #{card.id}</div>
            </div>
            <div className="av-photo">{initial}</div>
          </div>
          <div className="pro-card-info">
            <div className="kv"><span>Société</span><strong>{card.society}</strong></div>
            <div className="kv"><span>Zone</span><strong>{card.zone}</strong></div>
            <div className="kv"><span>Embauché le</span><strong>{card.hiredAt}</strong></div>
            <div className="kv"><span>Permis</span><strong>{card.permis}</strong></div>
            <div className="kv"><span>Valide jusqu'au</span><strong>{card.validUntil}</strong></div>
          </div>
        </div>

        <div style={{ margin: '10px 0', textAlign: 'center', fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>
          ↕ Verso : QR de vérification publique
        </div>

        {/* VERSO */}
        <div className="pro-card back">
          <div className="label" style={{ textAlign: 'center', marginBottom: 10 }}>QR de vérification publique</div>
          <div className="qr-code-box">
            <QrCode value={qrValue} size={140} />
          </div>
          <div style={{ textAlign: 'center', fontSize: 11, marginTop: 14, opacity: .85, lineHeight: 1.6, position: 'relative', zIndex: 1 }}>
            Scannez pour vérifier l'identité<br />
            <strong style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
              fleetlink.mine2port.fr/v/{card.id}
            </strong>
          </div>
          <div style={{ textAlign: 'center', fontSize: 10, marginTop: 14, opacity: .7, position: 'relative', zIndex: 1 }}>
            Signature cryptographique RSA-2048<br />
            <code style={{ fontSize: 9 }}>a8f4...e2c</code>
          </div>
        </div>

        <div className="btn-row" style={{ marginTop: 16 }}>
          <button className="btn-cta btn-cta-out" style={{ flex: 1 }} onClick={share}>📤 Partager</button>
          <button className="btn-cta btn-cta-prim" style={{ flex: 1 }} onClick={savePng}>💾 PNG</button>
        </div>
      </main>

      <BottomNav pendingCount={pending} />
      <Toast msg={msg} />
    </div>
  );
}
