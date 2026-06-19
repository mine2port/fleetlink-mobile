// Écran 10 — Galerie de 12 photos obligatoires (état des lieux + détails).
// Chaque vue de la liste GALLERY_PHOTOS doit avoir AU MOINS 1 photo.

import { useState } from 'react';
import { AppBar } from '../components/AppBar';
import { ProgressBar } from '../components/ProgressBar';
import { NavButtons } from '../components/NavButtons';
import { PhotoPicker } from '../components/PhotoPicker';
import { GALLERY_PHOTOS } from '../data/sections';
import { useSheet } from '../lib/store';
import { Toast, useToast } from '../components/Toast';

export function PhotosScreen() {
  const { sheet, addGalleryPhoto, removeGalleryPhoto } = useSheet();
  const [showErrors, setShowErrors] = useState(false);
  const { msg, push } = useToast();

  const validate = (): boolean => {
    const missing = GALLERY_PHOTOS.filter((_, i) => (sheet.galleryPhotos[i] || []).length === 0);
    if (missing.length) {
      setShowErrors(true);
      push(`⛔ Photos manquantes : ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '…' : ''}`);
      // Scroll au premier manquant
      const firstIdx = GALLERY_PHOTOS.findIndex((_, i) => (sheet.galleryPhotos[i] || []).length === 0);
      const el = document.getElementById(`photo_${firstIdx}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    return true;
  };

  return (
    <>
      <AppBar subtitle="Photos obligatoires" />
      <ProgressBar step="photos" />
      <main className="screen">
        <h2>Photos de l'état des lieux</h2>
        <p className="muted">12 prises de vue obligatoires. Les 4 premières servent à constater l'état général.</p>
        <div className="card">
          {GALLERY_PHOTOS.map((label, idx) => {
            const photos = sheet.galleryPhotos[idx] || [];
            const missing = showErrors && photos.length === 0;
            return (
              <div key={idx} id={`photo_${idx}`} className={`item ${missing ? 'err-state' : ''}`} style={{ background: 'rgba(255,255,255,0.7)' }}>
                <div className="item-label">{label}<span className="req"> *</span></div>
                <PhotoPicker
                  photos={photos}
                  onAdd={(d) => addGalleryPhoto(idx, d)}
                  onRemove={(i) => removeGalleryPhoto(idx, i)}
                  required
                  missing={missing}
                  label="Prendre / choisir"
                />
              </div>
            );
          })}
        </div>
        <NavButtons currentStep="photos" onNext={validate} />
      </main>
      <Toast msg={msg} />
    </>
  );
}
