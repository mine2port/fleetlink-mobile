// Écran 1 — Identification : entreprises (expéditrice / réceptrice) + camion.
// L'état de lieu se fait CONTRADICTOIREMENT entre 2 entreprises :
//   - L'entreprise qui REMET le camion (expéditrice)
//   - L'entreprise qui REÇOIT et contrôle le camion (réceptrice)
// Ces 2 blocs apparaissent en haut du PDF + dans le bloc signatures en bas du PDF.

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
  const { sheet, setIdent, setCompany } = useSheet();
  const [showErrors, setShowErrors] = useState(false);
  const { msg, push } = useToast();

  const validate = (): boolean => {
    const missingCo: string[] = [];
    if (!sheet.sender.name) missingCo.push('Entreprise expéditrice');
    if (!sheet.sender.representative) missingCo.push('Représentant expéditrice');
    if (!sheet.receiver.name) missingCo.push('Entreprise réceptrice');
    if (!sheet.receiver.representative) missingCo.push('Représentant réceptrice');
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

        {/* --- Bloc Parties : Entreprise expéditrice --- */}
        <div className="card">
          <div className="section-title">
            🏢 Entreprise EXPÉDITRICE <span style={{ color: 'var(--muted)', fontWeight: 500, fontSize: 13 }}>(qui remet le camion)</span>
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
            <label>Représentant qui remet *</label>
            <input
              value={sheet.sender.representative}
              onChange={(e) => setCompany('sender', 'representative', e.target.value)}
              placeholder="Nom + prénom de la personne qui remet le camion"
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
            <label>Lieu de remise</label>
            <input
              value={sheet.sender.place}
              onChange={(e) => setCompany('sender', 'place', e.target.value)}
              placeholder="Ex : Atelier Conakry / Site mine X"
            />
          </div>
        </div>

        {/* --- Bloc Parties : Entreprise réceptrice --- */}
        <div className="card">
          <div className="section-title">
            🏛️ Entreprise RÉCEPTRICE <span style={{ color: 'var(--muted)', fontWeight: 500, fontSize: 13 }}>(qui reçoit et contrôle)</span>
          </div>
          <div className={`fld ${showErrors && !sheet.receiver.name ? 'err' : ''}`}>
            <label>Raison sociale *</label>
            <input
              value={sheet.receiver.name}
              onChange={(e) => setCompany('receiver', 'name', e.target.value)}
              placeholder="Ex : FleetLink SAS"
            />
          </div>
          <div className={`fld ${showErrors && !sheet.receiver.representative ? 'err' : ''}`}>
            <label>Représentant qui reçoit *</label>
            <input
              value={sheet.receiver.representative}
              onChange={(e) => setCompany('receiver', 'representative', e.target.value)}
              placeholder="Nom + prénom du contrôleur"
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
            <label>Lieu de réception</label>
            <input
              value={sheet.receiver.place}
              onChange={(e) => setCompany('receiver', 'place', e.target.value)}
              placeholder="Ex : Parc FleetLink — Port autonome"
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
