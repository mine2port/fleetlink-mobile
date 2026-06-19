// Écran 11 — Bilan général + réparations à prévoir + nom du contrôleur + signature tactile.

import { useState } from 'react';
import { AppBar } from '../components/AppBar';
import { ProgressBar } from '../components/ProgressBar';
import { NavButtons } from '../components/NavButtons';
import { SignaturePad } from '../components/SignaturePad';
import { BILAN_OPTIONS } from '../data/sections';
import { useSheet } from '../lib/store';
import { Toast, useToast } from '../components/Toast';

export function BilanScreen() {
  const { sheet, setBilan, setRepairs, setControleur, setSignature } = useSheet();
  const [showErrors, setShowErrors] = useState(false);
  const { msg, push } = useToast();

  const validate = (): boolean => {
    const errs: string[] = [];
    if (!sheet.bilan) errs.push('Bilan');
    if (!sheet.controleur) errs.push('Contrôleur');
    if (!sheet.signature) errs.push('Signature');
    if (errs.length) {
      setShowErrors(true);
      push(`⛔ Champs obligatoires : ${errs.join(', ')}`);
      return false;
    }
    return true;
  };

  return (
    <>
      <AppBar subtitle="Bilan & Signature" />
      <ProgressBar step="bilan" />
      <main className="screen">
        <h2>Bilan & Signature</h2>

        <div className="card">
          <div className="section-title">📋 Bilan général *</div>
          <div className="bilan-row" id="fld_bilan" style={{ outline: showErrors && !sheet.bilan ? '2px solid var(--bad)' : undefined }}>
            {BILAN_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                className={`bilan-btn ${sheet.bilan === o.value ? 'selected ' + o.cls : ''}`}
                onClick={() => setBilan(o.value)}
              >
                {o.value}
              </button>
            ))}
          </div>
          <div className="fld" style={{ marginTop: 14 }}>
            <label>Réparations à prévoir</label>
            <textarea
              rows={4}
              value={sheet.repairs}
              onChange={(e) => setRepairs(e.target.value)}
              placeholder="Décrivez les travaux à effectuer (facultatif)"
            />
          </div>
        </div>

        <div className="card">
          <div className="section-title">✍️ Contrôleur + signature</div>
          <div className={`fld ${showErrors && !sheet.controleur ? 'err' : ''}`} id="fld_controleur">
            <label>Nom du contrôleur *</label>
            <input
              value={sheet.controleur}
              onChange={(e) => setControleur(e.target.value)}
              placeholder="Nom + prénom"
            />
          </div>
          <label>Signature *</label>
          <SignaturePad value={sheet.signature} onChange={setSignature} error={showErrors && !sheet.signature} />
          <p className="muted" style={{ marginTop: 6 }}>
            Signez avec votre doigt directement sur l'écran. Cette signature s'imprimera dans le PDF
            sur le cadre "Locataire".
          </p>
        </div>

        <NavButtons currentStep="bilan" onNext={validate} />
      </main>
      <Toast msg={msg} />
    </>
  );
}
