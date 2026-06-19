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
import { ANSWER_TYPES, answerClass, isBadAnswer, type Section } from '../data/sections';
import { useSheet } from '../lib/store';
import { Toast, useToast } from './Toast';
import type { CompareVerdict } from '../lib/types';

export function SectionScreen({ section }: { section: Section }) {
  const { sheet, setItem, setCompareVerdict, addItemPhoto, removeItemPhoto } = useSheet();
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

        {/* Bloc comparatif DÉPART vs RETOUR (uniquement pour EDL RETOUR) */}
        {sheet.kind === 'RETOUR' && sheet.departSnapshot && (
          <div className="card compare-section">
            <h3>📋 Comparatif DÉPART vs RETOUR</h3>
            <p className="muted" style={{ marginTop: 0, fontSize: 12 }}>
              Pour chaque point, marque le verdict : <b>OK</b> identique · <b>Diff</b> changement non préjudiciable · <b>Dommage</b> dégradation à la charge du locataire.
            </p>
            <div className="compare-row head">
              <div>Point de contrôle</div>
              <div className="center">DÉPART</div>
              <div className="center">RETOUR</div>
              <div className="center">Verdict</div>
            </div>
            {section.items.map((it, idx) => {
              const depAns = sheet.departSnapshot?.answers[section.id]?.[idx]?.state || '—';
              const retAns = answers[idx]?.state || '—';
              const verdict: CompareVerdict = (sheet.compare?.[section.id]?.[idx] || '') as CompareVerdict;
              const depCls = answerClass(it.type, depAns);
              const retCls = answerClass(it.type, retAns);
              return (
                <div key={`cmp-${idx}`} className="compare-row">
                  <div>{it.label}</div>
                  <div className="center"><span className={`state ${depCls}`}>{depAns}</span></div>
                  <div className="center"><span className={`state ${retCls}`}>{retAns}</span></div>
                  <div className="verdict">
                    <button
                      type="button"
                      className={verdict === 'OK' ? 'sel ok' : ''}
                      onClick={() => setCompareVerdict(section.id, idx, 'OK')}
                    >OK</button>
                    <button
                      type="button"
                      className={verdict === 'DIFFERENCE' ? 'sel diff' : ''}
                      onClick={() => setCompareVerdict(section.id, idx, 'DIFFERENCE')}
                    >Diff</button>
                    <button
                      type="button"
                      className={verdict === 'DOMMAGE' ? 'sel dom' : ''}
                      onClick={() => setCompareVerdict(section.id, idx, 'DOMMAGE')}
                    >Dommage</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

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
