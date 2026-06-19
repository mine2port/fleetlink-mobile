// Écran d'accueil :
// - hero FleetLink (lien vers la plateforme web fleetlink.mine2port.eu)
// - bouton "Nouvelle inspection" / "Reprendre le brouillon"
// - liste des fiches archivées (renvoyer en WhatsApp / supprimer)

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar, FLEETLINK_WEB_URL } from '../components/AppBar';
import { useSheet } from '../lib/store';
import type { Sheet } from '../lib/types';
import { buildPdf } from '../lib/pdf';
import { sharePdf } from '../lib/share';
import { Toast, useToast } from '../components/Toast';

export function HomeScreen() {
  const nav = useNavigate();
  const { sheet, newSheet, listArchive, deleteArchived } = useSheet();
  const [archive, setArchive] = useState<Sheet[]>([]);
  const { msg, push } = useToast();

  const refresh = async () => setArchive(await listArchive());
  useEffect(() => { refresh(); }, []);

  const startNew = () => {
    // Confirme l'écrasement du brouillon s'il y a déjà des saisies.
    const hasDraft = !!(sheet.matricule || sheet.chauffeur || sheet.bilan);
    if (hasDraft) {
      if (!window.confirm("Un brouillon existe déjà. Démarrer une nouvelle inspection vide ?")) return;
    }
    newSheet();
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

  const openPlatform = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.open(FLEETLINK_WEB_URL, '_system');
  };

  const hasDraft = !!(sheet.matricule || sheet.chauffeur || sheet.bilan);

  return (
    <>
      <AppBar />
      <main className="screen">
        <div className="home-hero">
          <h2>Application État de Lieu</h2>
          <p>Inspection mécanique de votre camion benne — terrain & hors-ligne</p>
          <a href={FLEETLINK_WEB_URL} className="home-cta-link" onClick={openPlatform}>
            🌐 Ouvrir la plateforme FleetLink
          </a>
        </div>

        <div className="card">
          <h3 style={{ margin: 0, color: 'var(--navy)' }}>Démarrer une inspection</h3>
          <p className="muted" style={{ margin: '6px 0 12px' }}>
            Remplissez chaque écran de section. Vous pouvez sortir de l'app et revenir : votre saisie est gardée.
          </p>
          <div className="nav-buttons">
            <button className="btn primary" onClick={startNew}>+ Nouvelle inspection</button>
            {hasDraft && <button className="btn accent" onClick={resume}>Reprendre le brouillon</button>}
          </div>
        </div>

        <div className="card">
          <h3 style={{ margin: 0, color: 'var(--navy)' }}>Fiches archivées</h3>
          <p className="muted" style={{ margin: '6px 0 12px' }}>
            Les fiches terminées et exportées sont conservées sur ce téléphone. Vous pouvez les renvoyer.
          </p>
          {!archive.length ? (
            <div className="empty">Aucune fiche enregistrée pour l'instant.</div>
          ) : archive.map((s) => {
            const bilColor = s.bilan === 'APTE AU SERVICE' ? 'var(--good)' : s.bilan === 'IMMOBILISÉ' ? 'var(--bad)' : s.bilan ? 'var(--warn)' : 'var(--muted)';
            const np = (s.galleryPhotos || []).reduce((a, b) => a + b.length, 0)
              + Object.values(s.answers || {}).reduce((a, arr) => a + arr.reduce((c, x) => c + x.photos.length, 0), 0);
            return (
              <div key={s.id} className="saved-item">
                <div className="meta">
                  <b>
                    {s.matricule || '(sans matricule)'}
                    {' '}
                    {s.bilan && <span className="badge" style={{ background: bilColor }}>{s.bilan}</span>}
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
      </main>
      <Toast msg={msg} />
    </>
  );
}
