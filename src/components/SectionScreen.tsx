// Écran générique d'inspection d'une section (réutilisé pour les 7 sections).
// Affiche tous les items d'une section :
//   - libellé + obligation photo
//   - boutons d'état (2 ou 3 selon le type)
//   - champ "observation"
//   - bouton "📸 Photo" déclenchant l'appareil photo natif
//   - vignettes des photos prises (suppression possible)
// La photo devient obligatoire si la réponse est négative (`bad: true`) OU si `alwaysPhoto: true`.

import { useEffect, useMemo, useState } from 'react';
import { AppBar } from './AppBar';
import { ProgressBar } from './ProgressBar';
import { NavButtons } from './NavButtons';
import { PhotoPicker } from './PhotoPicker';
import { ANSWER_TYPES, isBadAnswer, type Section } from '../data/sections';
import { useSheet } from '../lib/store';
import { Toast, useToast } from './Toast';

export function SectionScreen({ section }: { section: Section }) {
  const { sheet, setItem, addItemPhoto, removeItemPhoto } = useSheet();
  const answers = sheet.answers[section.id] || [];
  const [showErrors, setShowErrors] = useState(false);
  const { msg, push } = useToast();

  // Calcule par item si une photo est requise et manquante.
  const missing = useMemo(() => answers.map((a, idx) => {
    const def = section.items[idx];
    const stateMissing = !a.state;
    const photoMissing = (def.alwaysPhoto || isBadAnswer(def.type, a.state)) && a.photos.length === 0;
    return { stateMissing, photoMissing };
  }), [answers, section]);

  // Si l'utilisateur sortait et revenait, on remet showErrors à false.
  useEffect(() => setShowErrors(false), [section.id]);

  const validate = (): boolean => {
    const hasError = missing.some((m) => m.stateMissing || m.photoMissing);
    if (hasError) {
      setShowErrors(true);
      push('⛔ Complétez les états et les photos obligatoires.');
      // scroll vers le premier item en erreur
      const first = missing.findIndex((m) => m.stateMissing || m.photoMissing);
      const el = document.getElementById(`item_${section.id}_${first}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    return true;
  };

  return (
    <>
      <AppBar subtitle={section.title} />
      <ProgressBar step={section.id} />
      <main className="screen">
        <h2>{section.title}</h2>
        <div className="card section-card" style={{ background: section.color }}>
          {section.items.map((item, idx) => {
            const opts = ANSWER_TYPES[item.type] || ANSWER_TYPES.etat;
            const ans = answers[idx];
            const photoNeeded = item.alwaysPhoto || isBadAnswer(item.type, ans.state);
            const photoMissing = photoNeeded && ans.photos.length === 0;
            const stateErr = showErrors && (missing[idx].stateMissing || missing[idx].photoMissing);

            return (
              <div
                key={idx}
                id={`item_${section.id}_${idx}`}
                className={`item ${stateErr ? 'err-state' : ''}`}
              >
                <div className="item-label">
                  {item.label}
                  {item.alwaysPhoto && <span className="photo-tag">PHOTO</span>}
                  <span className="req"> *</span>
                </div>
                <div className={`answers ${opts.length === 2 ? 'two' : ''}`}>
                  {opts.map((o) => (
                    <button
                      type="button"
                      key={o.value}
                      className={`answer-btn ${ans.state === o.value ? 'selected ' + o.cls : ''}`}
                      onClick={() => setItem(section.id, idx, { state: o.value })}
                    >
                      {o.value}
                    </button>
                  ))}
                </div>
                <div className="obs">
                  <input
                    type="text"
                    placeholder={item.obsHint || 'Observation (facultatif)'}
                    value={ans.obs}
                    onChange={(e) => setItem(section.id, idx, { obs: e.target.value })}
                  />
                </div>
                {photoNeeded && (
                  <PhotoPicker
                    photos={ans.photos}
                    onAdd={(d) => addItemPhoto(section.id, idx, d)}
                    onRemove={(i) => removeItemPhoto(section.id, idx, i)}
                    required
                    missing={photoMissing}
                  />
                )}
              </div>
            );
          })}
        </div>
        <NavButtons currentStep={section.id} onNext={validate} />
      </main>
      <Toast msg={msg} />
    </>
  );
}
