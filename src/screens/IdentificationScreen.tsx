// Écran 1 — Identification : sociétés (propriétaire / locataire) + camion.
// L'état des lieux FleetLink se fait CONTRADICTOIREMENT entre 2 sociétés :
//   - Le PROPRIÉTAIRE / BAILLEUR (loue le camion via FleetLink)
//   - Le LOCATAIRE / PRENEUR (reçoit, contrôle ou restitue le camion)
// Ces 2 blocs apparaissent en haut du PDF + dans le bloc signatures en bas du PDF.
// Sélecteur kind (DÉPART/RETOUR) en tête : configure le sens de l'EDL.

import { useState } from 'react';
import { AppBar } from '../components/AppBar';
import { ProgressBar } from '../components/ProgressBar';
import { NavButtons } from '../components/NavButtons';
import { useSheet } from '../lib/store';
import { Toast, useToast } from '../components/Toast';

type Field = {
  key: 'matricule' | 'parc' | 'km' | 'hmot' | 'date' | 'chauffeur';
  label: string;
  type?: string;
  placeholder?: string;
};

const TRUCK_FIELDS: Field[] = [
  { key: 'matricule', label: 'Matricule', placeholder: 'Ex : ABC-1234' },
  { key: 'parc',      label: 'N° de parc', placeholder: 'Ex : P-042' },
  { key: 'km',        label: 'Kilométrage', type: 'number', placeholder: 'Ex : 235480' },
  { key: 'hmot',      label: 'Heures moteur', type: 'number', placeholder: 'Ex : 4892' },
  { key: 'date',      label: 'Date du contrôle', type: 'date' },
  { key: 'chauffeur', label: 'Chauffeur', placeholder: 'Nom + prénom' },
];

export function IdentificationScreen() {
  const { sheet, setIdent, setCompany, setKind } = useSheet();
  const [showErrors, setShowErrors] = useState(false);
  const { msg, push } = useToast();

  const isRetour = sheet.kind === 'RETOUR';

  const validate = (): boolean => {
    const missingCo: string[] = [];
    if (!sheet.sender.name) missingCo.push('Société propriétaire');
    if (!sheet.sender.representative) missingCo.push('Représentant propriétaire');
    if (!sheet.receiver.name) missingCo.push('Société locataire');
    if (!sheet.receiver.representative) missingCo.push('Représentant locataire');
    const missingTruck = TRUCK_FIELDS.filter((f) => !sheet[f.key]).map((f) => f.label);
    const all = [...missingCo, ...missingTruck];
    if (all.length) {
      setShowErrors(true);
      push(`⛔ ${all.length} champ(s) obligatoire(s) : ${all.slice(0, 3).join(', ')}${all.length > 3 ? '…' : ''}`);
      return false;
    }
    return true;
  };

  return (
    <>
      <AppBar subtitle="Identification" />
      <ProgressBar step="identification" />
      <main className="screen">
        <h2>Identification</h2>

        {/* --- Sélecteur kind (DÉPART / RETOUR) --- */}
        <div className="card">
          <div className="section-title">📋 Sens de l'état des lieux</div>
          <div className="answers two" style={{ marginTop: 4 }}>
            <button
              type="button"
              className={`answer-btn ${!isRetour ? 'selected bon' : ''}`}
              onClick={() => setKind('DEPART')}
            >
              🚛 DÉPART<br/><small style={{ fontSize: 11, fontWeight: 500 }}>remise au locataire</small>
            </button>
            <button
              type="button"
              className={`answer-btn ${isRetour ? 'selected moy' : ''}`}
              onClick={() => setKind('RETOUR')}
            >
              ↩️ RETOUR<br/><small style={{ fontSize: 11, fontWeight: 500 }}>restitution au propriétaire</small>
            </button>
          </div>
          {isRetour && sheet.departSnapshot && (
            <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
              Comparé à l'EDL DÉPART du {sheet.departSnapshot.date || '—'} · km départ : <b>{sheet.departSnapshot.km || '—'}</b>
            </div>
          )}
        </div>

        {/* --- Bloc Parties : Société propriétaire / bailleur --- */}
        <div className="card">
          <div className="section-title">
            🏢 PROPRIÉTAIRE / BAILLEUR <span style={{ color: 'var(--muted)', fontWeight: 500, fontSize: 13 }}>(loue le camion)</span>
          </div>
          <div className={`fld ${showErrors && !sheet.sender.name ? 'err' : ''}`}>
            <label>Raison sociale *</label>
            <input
              value={sheet.sender.name}
              onChange={(e) => setCompany('sender', 'name', e.target.value)}
              placeholder="Ex : Trans Africa Connect SA"
            />
          </div>
          <div className={`fld ${showErrors && !sheet.sender.representative ? 'err' : ''}`}>
            <label>Représentant qui {isRetour ? 'récupère' : 'remet'} *</label>
            <input
              value={sheet.sender.representative}
              onChange={(e) => setCompany('sender', 'representative', e.target.value)}
              placeholder={isRetour ? 'Personne qui réceptionne le camion en restitution' : 'Personne qui remet le camion au locataire'}
            />
          </div>
          <div className="fld">
            <label>Téléphone</label>
            <input
              type="tel"
              value={sheet.sender.phone}
              onChange={(e) => setCompany('sender', 'phone', e.target.value)}
              placeholder="+224 ..."
            />
          </div>
          <div className="fld">
            <label>Lieu {isRetour ? 'de restitution' : 'de remise'}</label>
            <input
              value={sheet.sender.place}
              onChange={(e) => setCompany('sender', 'place', e.target.value)}
              placeholder="Ex : Atelier Conakry / Site mine X"
            />
          </div>
        </div>

        {/* --- Bloc Parties : Société locataire / preneur --- */}
        <div className="card">
          <div className="section-title">
            🏛️ LOCATAIRE / PRENEUR <span style={{ color: 'var(--muted)', fontWeight: 500, fontSize: 13 }}>({isRetour ? 'qui restitue' : 'qui reçoit et contrôle'})</span>
          </div>
          <div className={`fld ${showErrors && !sheet.receiver.name ? 'err' : ''}`}>
            <label>Raison sociale *</label>
            <input
              value={sheet.receiver.name}
              onChange={(e) => setCompany('receiver', 'name', e.target.value)}
              placeholder="Ex : SOTRAMINE SARL"
            />
          </div>
          <div className={`fld ${showErrors && !sheet.receiver.representative ? 'err' : ''}`}>
            <label>Représentant qui {isRetour ? 'restitue' : 'reçoit'} *</label>
            <input
              value={sheet.receiver.representative}
              onChange={(e) => setCompany('receiver', 'representative', e.target.value)}
              placeholder="Nom + prénom du locataire"
            />
          </div>
          <div className="fld">
            <label>Téléphone</label>
            <input
              type="tel"
              value={sheet.receiver.phone}
              onChange={(e) => setCompany('receiver', 'phone', e.target.value)}
              placeholder="+224 ..."
            />
          </div>
          <div className="fld">
            <label>Lieu {isRetour ? 'de restitution' : 'de réception'}</label>
            <input
              value={sheet.receiver.place}
              onChange={(e) => setCompany('receiver', 'place', e.target.value)}
              placeholder="Ex : Chantier / Atelier / Port"
            />
          </div>
        </div>

        {/* --- Bloc Camion --- */}
        <div className="card">
          <div className="section-title">🚛 Identification du camion</div>
          {TRUCK_FIELDS.map((f) => (
            <div key={f.key} className={`fld ${showErrors && !sheet[f.key] ? 'err' : ''}`} id={`fld_${f.key}`}>
              <label>{f.label} *</label>
              <input
                type={f.type || 'text'}
                value={sheet[f.key] as string}
                onChange={(e) => setIdent(f.key, e.target.value)}
                placeholder={f.placeholder}
                inputMode={f.type === 'number' ? 'numeric' : undefined}
              />
            </div>
          ))}
        </div>

        <NavButtons currentStep="identification" onNext={validate} />
      </main>
      <Toast msg={msg} />
    </>
  );
}
