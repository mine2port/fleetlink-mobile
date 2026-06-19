// Écran d'accueil FleetLink :
// - hero FleetLink (lien vers la plateforme web fleetlink.mine2port.fr)
// - 2 onglets : EDL À FAIRE (DÉPART/RETOUR à démarrer) | TERMINÉS (archive)
// - démarrer un EDL DÉPART, ou démarrer un EDL RETOUR depuis un DÉPART archivé
// - compteur de sync (file d'attente cloud)

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar, FLEETLINK_WEB_URL } from '../components/AppBar';
import { useSheet } from '../lib/store';
import type { Sheet } from '../lib/types';
import { buildPdf } from '../lib/pdf';
import { sharePdf } from '../lib/share';
import { Toast, useToast } from '../components/Toast';
import { getPendingCount, flushQueue } from '../lib/sync-queue';
import { isLoggedIn, logout, getCurrentUser, type ApiUser } from '../lib/api';

export function HomeScreen() {
  const nav = useNavigate();
  const { sheet, newSheet, listArchive, deleteArchived, startReturnFromDepart } = useSheet();
  const [archive, setArchive] = useState<Sheet[]>([]);
  const [tab, setTab] = useState<'todo' | 'done'>('todo');
  const [pending, setPending] = useState(0);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [authed, setAuthed] = useState(false);
  const { msg, push } = useToast();

  const refresh = async () => {
    setArchive(await listArchive());
    setPending(await getPendingCount());
    setAuthed(await isLoggedIn());
    setUser(await getCurrentUser());
  };
  useEffect(() => { refresh(); }, []);

  const hasDraft = !!(sheet.matricule || sheet.chauffeur || sheet.bilan);

  const startNewDepart = () => {
    if (hasDraft) {
      if (!window.confirm("Un brouillon existe déjà. Démarrer un EDL DÉPART vide ?")) return;
    }
    newSheet('DEPART');
    nav('/identification');
  };

  const startReturnFor = (departSheet: Sheet) => {
    if (hasDraft) {
      if (!window.confirm("Un brouillon existe déjà. Démarrer l'EDL RETOUR pour ce camion ?")) return;
    }
    startReturnFromDepart(departSheet);
    push(`EDL RETOUR démarré · matricule ${departSheet.matricule || '?'}`);
    nav('/identification');
  };

  const resume = () => nav('/identification');

  const removeSheet = async (id: number) => {
    if (!window.confirm('Supprimer cette fiche archivée ?')) return;
    await deleteArchived(id);
    await refresh();
    push('Fiche supprimée');
  };

  const resend = async (s: Sheet) => {
    try {
      const { blob, filename, dataUrl } = await buildPdf(s);
      await sharePdf(blob, filename, dataUrl);
    } catch (e) {
      console.error(e);
      push('⛔ Erreur lors du partage');
    }
  };

  const trySync = async () => {
    if (!authed) { push('Connecte-toi pour synchroniser'); return; }
    if (!navigator.onLine) { push('📴 Hors-ligne — réessaie quand connecté'); return; }
    push('☁️ Synchronisation…');
    const { sent, failed } = await flushQueue();
    push(`☁️ ${sent} envoyée(s), ${failed} échec(s)`);
    await refresh();
  };

  const doLogout = async () => {
    if (!window.confirm('Se déconnecter ? (les fiches locales restent sur l\'appareil)')) return;
    await logout();
    await refresh();
    push('Déconnecté');
  };

  const openPlatform = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.open(FLEETLINK_WEB_URL, '_system');
  };

  // EDL DÉPART terminés (= candidats à un RETOUR)
  const departsDone = archive.filter((s) => s.kind === 'DEPART');

  return (
    <>
      <AppBar />
      <main className="screen">
        <div className="home-hero">
          <h2>FleetLink Terrain</h2>
          <p>États des lieux DÉPART & RETOUR — terrain & hors-ligne</p>
          <a href={FLEETLINK_WEB_URL} className="home-cta-link" onClick={openPlatform}>
            🌐 Ouvrir fleetlink.mine2port.fr
          </a>
        </div>

        {/* Bandeau auth + sync */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {authed && user ? (
              <>
                <b style={{ fontSize: 14 }}>{user.fullName}</b>
                <div className="mini muted">{user.tenantName || user.email} · {user.role}</div>
              </>
            ) : (
              <>
                <b style={{ fontSize: 14 }}>Mode local</b>
                <div className="mini muted">Non connecté — fiches sauvegardées sur le téléphone</div>
              </>
            )}
            {pending > 0 && (
              <div className="mini" style={{ color: 'var(--orange)', marginTop: 4 }}>
                ⏳ {pending} fiche(s) en attente de sync
              </div>
            )}
          </div>
          {authed ? (
            <>
              <button className="btn secondary" style={{ padding: '8px 12px', fontSize: 13 }} onClick={trySync}>
                ☁️ Sync {pending > 0 && <span className="sync-badge">{pending}</span>}
              </button>
              <button className="btn danger" style={{ padding: '8px 12px', fontSize: 13 }} onClick={doLogout}>↩</button>
            </>
          ) : (
            <button className="btn primary" style={{ padding: '8px 14px', fontSize: 13 }} onClick={() => nav('/login')}>
              Se connecter
            </button>
          )}
        </div>

        {/* Onglets */}
        <div className="tabs">
          <button className={`tab ${tab === 'todo' ? 'active' : ''}`} onClick={() => setTab('todo')}>
            📋 À faire
          </button>
          <button className={`tab ${tab === 'done' ? 'active' : ''}`} onClick={() => setTab('done')}>
            ✅ Terminés {archive.length > 0 && <span className="muted">({archive.length})</span>}
          </button>
        </div>

        {tab === 'todo' && (
          <>
            <div className="card">
              <h3 style={{ margin: 0, color: 'var(--navy)' }}>🆕 Démarrer un EDL DÉPART</h3>
              <p className="muted" style={{ margin: '6px 0 12px' }}>
                Le propriétaire remet le camion au locataire. Cet EDL servira de référence au RETOUR.
              </p>
              <div className="nav-buttons">
                <button className="btn primary" onClick={startNewDepart}>+ Nouvel EDL DÉPART</button>
                {hasDraft && <button className="btn accent" onClick={resume}>Reprendre le brouillon</button>}
              </div>
            </div>

            <div className="card">
              <h3 style={{ margin: 0, color: 'var(--navy)' }}>↩ Faire un EDL RETOUR</h3>
              <p className="muted" style={{ margin: '6px 0 12px' }}>
                Choisis l'EDL DÉPART correspondant. Le RETOUR sera pré-rempli (sociétés, camion) et comparé au DÉPART.
              </p>
              {!departsDone.length ? (
                <div className="empty">Aucun EDL DÉPART terminé. Démarre d'abord un EDL DÉPART.</div>
              ) : departsDone.map((s) => (
                <div key={s.id} className="saved-item">
                  <div className="meta">
                    <b>
                      {s.matricule || '(sans matricule)'} <span className="badge depart">DÉPART</span>
                    </b>
                    <div className="mini">{s.date || ''} · {s.chauffeur || '—'}</div>
                    <div className="mini">Du {s.savedAt}</div>
                  </div>
                  <button className="btn accent" style={{ padding: '8px 12px', fontSize: 14 }} onClick={() => startReturnFor(s)}>
                    + RETOUR
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'done' && (
          <div className="card">
            <h3 style={{ margin: 0, color: 'var(--navy)' }}>Fiches archivées</h3>
            <p className="muted" style={{ margin: '6px 0 12px' }}>
              Les fiches terminées sont conservées sur ce téléphone. Tu peux les renvoyer ou les pousser au cloud.
            </p>
            {!archive.length ? (
              <div className="empty">Aucune fiche enregistrée pour l'instant.</div>
            ) : archive.map((s) => {
              const bilColor = s.bilan === 'APTE AU SERVICE' ? 'var(--good)' : s.bilan === 'IMMOBILISÉ' ? 'var(--bad)' : s.bilan ? 'var(--warn)' : 'var(--muted)';
              const np = (s.galleryPhotos || []).reduce((a, b) => a + b.length, 0)
                + Object.values(s.answers || {}).reduce((a, arr) => a + arr.reduce((c, x) => c + x.photos.length, 0), 0);
              const kind = s.kind || 'DEPART';
              return (
                <div key={s.id} className="saved-item">
                  <div className="meta">
                    <b>
                      {s.matricule || '(sans matricule)'}
                      {' '}
                      <span className={`badge ${kind === 'RETOUR' ? 'retour' : 'depart'}`}>{kind}</span>
                      {' '}
                      {s.bilan && <span className="badge" style={{ background: bilColor }}>{s.bilan}</span>}
                      {' '}
                      {s.cloudStatus === 'SENT' && <span className="badge" style={{ background: 'var(--good)' }}>☁ Sync</span>}
                      {s.cloudStatus === 'PENDING' && <span className="badge" style={{ background: 'var(--warn)' }}>⏳ Pending</span>}
                      {s.cloudStatus === 'ERROR' && <span className="badge" style={{ background: 'var(--bad)' }}>⛔ Erreur</span>}
                    </b>
                    <div className="mini">{s.date || ''} · {s.chauffeur || '—'} · 📷 {np}</div>
                    <div className="mini">Enregistré le {s.savedAt}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn primary" style={{ padding: '8px 12px', fontSize: 14 }} onClick={() => resend(s)}>↗ Partager</button>
                    <button className="btn danger" style={{ padding: '8px 12px', fontSize: 14 }} onClick={() => removeSheet(s.id)}>✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Toast msg={msg} />
    </>
  );
}
