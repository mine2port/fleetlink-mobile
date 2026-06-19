// Écran 12 — Récapitulatif + export PDF + partage WhatsApp + archivage.
// Effectue la validation globale, et propose 3 actions :
//   - 📄 Voir l'aperçu PDF
//   - 📤 Partager (déclenche la feuille de partage Android → WhatsApp)
//   - 💾 Enregistrer la fiche dans l'archive locale

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar } from '../components/AppBar';
import { ProgressBar } from '../components/ProgressBar';
import { useSheet } from '../lib/store';
import { Toast, useToast } from '../components/Toast';
import { SECTIONS, GALLERY_PHOTOS, answerClass, isBadAnswer } from '../data/sections';
import { buildPdf } from '../lib/pdf';
import { sharePdf } from '../lib/share';

export function RecapScreen() {
  const { sheet, archiveSheet, newSheet } = useSheet();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const { msg, push } = useToast();

  // Compteurs visibles (transparence sur l'état de la fiche).
  const totalPhotos =
    (sheet.galleryPhotos || []).reduce((a, b) => a + b.length, 0)
    + Object.values(sheet.answers || {}).reduce((a, arr) => a + arr.reduce((c, x) => c + x.photos.length, 0), 0);
  const missingStates = Object.entries(sheet.answers).reduce((acc, [, arr]) => acc + arr.filter((a) => !a.state).length, 0);

  // Validation globale (tout ce que le PDF doit avoir).
  function validateAll(): string[] {
    const errors: string[] = [];
    // Entreprises
    if (!sheet.sender.name) errors.push('Entreprise expéditrice manquante');
    if (!sheet.sender.representative) errors.push('Représentant expéditrice manquant');
    if (!sheet.receiver.name) errors.push('Entreprise réceptrice manquante');
    if (!sheet.receiver.representative) errors.push('Représentant réceptrice manquant');
    // Identification camion
    (['matricule', 'parc', 'km', 'hmot', 'date', 'chauffeur'] as const).forEach((k) => {
      if (!sheet[k]) errors.push(`Champ "${k}" manquant`);
    });
    // États
    for (const sec of SECTIONS) {
      const arr = sheet.answers[sec.id] || [];
      arr.forEach((a, idx) => {
        const item = sec.items[idx];
        if (!a.state) errors.push(`${sec.title} : "${item.label}" sans état`);
        const needPhoto = item.alwaysPhoto || isBadAnswer(item.type, a.state);
        if (needPhoto && a.photos.length === 0) errors.push(`${sec.title} : photo obligatoire pour "${item.label}"`);
      });
    }
    // Galerie 12 photos
    GALLERY_PHOTOS.forEach((label, i) => {
      if ((sheet.galleryPhotos[i] || []).length === 0) errors.push(`Photo manquante : ${label}`);
    });
    // Bilan + contrôleur + signature
    if (!sheet.bilan) errors.push('Bilan manquant');
    if (!sheet.controleur) errors.push('Contrôleur manquant');
    if (!sheet.signature) errors.push('Signature manquante');
    return errors;
  }

  const doShare = async () => {
    const errs = validateAll();
    if (errs.length) {
      push(`⛔ ${errs.length} point(s) à compléter (voir liste ci-dessous).`);
      return;
    }
    setBusy(true);
    try {
      await archiveSheet();
      const { blob, filename, dataUrl } = await buildPdf(sheet);
      await sharePdf(blob, filename, dataUrl);
      push('✅ PDF généré et partagé');
    } catch (e) {
      console.error(e);
      push('⛔ Erreur lors de la génération PDF');
    } finally {
      setBusy(false);
    }
  };

  const doSaveOnly = async () => {
    setBusy(true);
    try { await archiveSheet(); push('💾 Fiche enregistrée dans l\'archive'); }
    catch { push('⛔ Échec de l\'enregistrement'); }
    finally { setBusy(false); }
  };

  const doPreviewPdf = async () => {
    setBusy(true);
    try {
      const { blob } = await buildPdf(sheet);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      console.error(e);
      push('⛔ Erreur génération PDF');
    } finally { setBusy(false); }
  };

  const doNew = () => {
    if (!window.confirm('Vider la fiche et démarrer une nouvelle inspection ?')) return;
    newSheet();
    nav('/');
  };

  const errors = validateAll();

  return (
    <>
      <AppBar subtitle="Récapitulatif & Export" />
      <ProgressBar step="recap" />
      <main className="screen">
        <h2>Récapitulatif</h2>

        <div className="card">
          <div className="section-title">📦 Synthèse</div>
          <div className="recap-row"><span><b>Expéditrice</b></span><span className="muted center">{sheet.sender.name || '—'}</span></div>
          <div className="recap-row"><span><b>Réceptrice</b></span><span className="muted center">{sheet.receiver.name || '—'}</span></div>
          <div className="recap-row"><span><b>Camion</b></span><span className="muted center">{sheet.matricule || '—'}</span></div>
          <div className="recap-row"><span><b>Chauffeur</b></span><span className="muted center">{sheet.chauffeur || '—'}</span></div>
          <div className="recap-row"><span><b>Bilan</b></span><span className={`state ${sheet.bilan === 'APTE AU SERVICE' ? 'bon' : sheet.bilan === 'IMMOBILISÉ' ? 'mauv' : sheet.bilan ? 'moy' : ''}`}>{sheet.bilan || 'À FAIRE'}</span></div>
          <div className="recap-row"><span><b>Photos prises</b></span><span className="muted center">{totalPhotos}</span></div>
          <div className="recap-row"><span><b>États non cochés</b></span><span className="muted center">{missingStates}</span></div>
        </div>

        {/* Détail par section (lecture seule) */}
        {SECTIONS.map((sec) => (
          <div key={sec.id} className="card section-card" style={{ background: sec.color }}>
            <div className="section-title">{sec.title}</div>
            {(sheet.answers[sec.id] || []).map((a, idx) => (
              <div key={idx} className="recap-row">
                <span>{sec.items[idx].label}</span>
                <span className={`state ${answerClass(sec.items[idx].type, a.state) || ''}`}>{a.state || '—'}</span>
              </div>
            ))}
          </div>
        ))}

        {/* Erreurs bloquantes */}
        {errors.length > 0 && (
          <div className="card" style={{ background: '#FFF1EF', borderColor: 'var(--bad)' }}>
            <div className="section-title" style={{ color: 'var(--bad)' }}>⛔ {errors.length} point(s) à compléter</div>
            <ul style={{ paddingLeft: 18, margin: 0 }}>
              {errors.slice(0, 12).map((e, i) => <li key={i} style={{ fontSize: 14 }}>{e}</li>)}
              {errors.length > 12 && <li style={{ fontSize: 14 }}>… et {errors.length - 12} autre(s)</li>}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="card">
          <div className="section-title">📤 Actions</div>
          <div style={{ display: 'grid', gap: 10 }}>
            <button className="btn primary" onClick={doPreviewPdf} disabled={busy}>📄 Aperçu PDF</button>
            <button className="btn accent" onClick={doShare} disabled={busy || errors.length > 0}>
              📲 Partager (WhatsApp / autres)
            </button>
            <button className="btn secondary" onClick={doSaveOnly} disabled={busy}>💾 Enregistrer dans l'archive</button>
            <button className="btn secondary" onClick={() => nav('/identification')}>◂ Modifier</button>
            <button className="btn danger" onClick={doNew} disabled={busy}>+ Nouvelle inspection (vider)</button>
          </div>
        </div>
      </main>
      <Toast msg={msg} />
    </>
  );
}
