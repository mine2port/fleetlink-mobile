// ============================================================
// Écran EDL EN LIGNE — complétion d'une inspection ASSIGNÉE depuis
// le bureau (Slice S6 backend LIVE), distinct du wizard local offline.
//
// Flux : ouvrir un EDL assigné -> start (IN_PROGRESS) -> saisir
// km / carburant / checklist par section / photos (presign + PUT MinIO)
// -> complete (verdict + dommages + signature agent + contradictoire).
//
// Offline-first préservé : si une action réseau échoue (hors-ligne),
// l'écran l'indique et l'agent peut réessayer ; le wizard local
// (HomeScreen / IdentificationScreen…) reste l'option 100 % hors-ligne.
// Palette agent vert opérationnel #10B981 (var --good).
// ============================================================

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { SignaturePad } from '../components/SignaturePad';
import { Toast, useToast } from '../components/Toast';
import { SECTIONS, ANSWER_TYPES, answerClass, isBadAnswer } from '../data/sections';
import { capturePhoto } from '../lib/photos';
import {
  getInspection,
  startInspection,
  progressInspection,
  uploadInspectionPhoto,
  completeInspection,
  type InspectionDetail,
  type InspectionChecklistItem,
  type InspectionVerdict,
  type InspectionPhoto,
} from '../lib/api';

// Clé d'un point de contrôle pour la checklist serveur.
const itemKey = (sectionId: string, idx: number) => `${sectionId}.${idx}`;

const VERDICTS: { value: InspectionVerdict; label: string; cls: 'bon' | 'moy' | 'mauv' }[] = [
  { value: 'APTE', label: 'APTE AU SERVICE', cls: 'bon' },
  { value: 'RESERVES', label: 'APTE AVEC RÉSERVES', cls: 'moy' },
  { value: 'IMMOBILISE', label: 'IMMOBILISÉ', cls: 'mauv' },
];

export function InspectionScreen() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const { msg, push } = useToast();

  const [insp, setInsp] = useState<InspectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // État de saisie local (synchronisé vers le serveur via progress/complete).
  const [mileageKm, setMileageKm] = useState('');
  const [fuelLevel, setFuelLevel] = useState('');
  // checklist[key] = { state, observation }
  const [checklist, setChecklist] = useState<Record<string, { state: string; observation: string }>>({});
  // photos téléversées : slot -> objectKey (référence serveur)
  const [photos, setPhotos] = useState<Record<string, InspectionPhoto>>({});
  const [agentSig, setAgentSig] = useState('');
  const [counterSig, setCounterSig] = useState('');
  const [verdict, setVerdict] = useState<InspectionVerdict | ''>('');
  const [damages, setDamages] = useState('');

  // Charge l'inspection (et la démarre si encore SCHEDULED).
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        let d = await getInspection(id);
        if (d.status === 'SCHEDULED') {
          try { d = await startInspection(id); } catch { /* on garde l'état chargé si start refusé */ }
        }
        if (!alive) return;
        setInsp(d);
        hydrateFromServer(d);
      } catch (e: any) {
        if (alive) setErr(e?.message || 'Impossible de charger cet EDL.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  function hydrateFromServer(d: InspectionDetail) {
    if (typeof d.mileageKm === 'number') setMileageKm(String(d.mileageKm));
    if (typeof d.fuelLevel === 'number') setFuelLevel(String(d.fuelLevel));
    if (d.verdict) setVerdict(d.verdict);
    // checklist serveur (array d'items) -> map locale
    if (Array.isArray(d.checklist)) {
      const next: Record<string, { state: string; observation: string }> = {};
      (d.checklist as InspectionChecklistItem[]).forEach((it) => {
        const key = it.itemId || (it.sectionId != null ? `${it.sectionId}.${it.label}` : it.label || '');
        if (key) next[String(key)] = { state: String(it.state || ''), observation: String(it.observation || '') };
      });
      setChecklist(next);
    }
    // photos serveur -> map par slot
    if (Array.isArray(d.photos)) {
      const next: Record<string, InspectionPhoto> = {};
      d.photos.forEach((p) => { if (p?.slot) next[p.slot] = p; });
      setPhotos(next);
    }
  }

  const isReadOnly = insp?.status === 'COMPLETED' || insp?.status === 'CANCELLED';

  // Sérialise la checklist locale au format serveur.
  const checklistPayload = useMemo<InspectionChecklistItem[]>(() => {
    const out: InspectionChecklistItem[] = [];
    for (const sec of SECTIONS) {
      sec.items.forEach((item, idx) => {
        const key = itemKey(sec.id, idx);
        const v = checklist[key];
        if (v && (v.state || v.observation)) {
          out.push({ sectionId: sec.id, itemId: key, label: item.label, state: v.state, observation: v.observation });
        }
      });
    }
    return out;
  }, [checklist]);

  const setItem = (key: string, patch: Partial<{ state: string; observation: string }>) =>
    setChecklist((c) => {
      const prev = c[key] || { state: '', observation: '' };
      return { ...c, [key]: { ...prev, ...patch } };
    });

  const captureFor = async (slot: string) => {
    if (isReadOnly || !insp) return;
    const dataUrl = await capturePhoto();
    if (!dataUrl) return;
    setBusy(true);
    try {
      const ref = await uploadInspectionPhoto(insp.id, slot, dataUrl);
      setPhotos((p) => ({ ...p, [slot]: ref }));
      push('📸 Photo envoyée');
    } catch (e: any) {
      push(`⛔ Upload photo échoué (${e?.message || 'réseau'})`);
    } finally {
      setBusy(false);
    }
  };

  const saveProgress = async () => {
    if (!insp || isReadOnly) return;
    setBusy(true);
    try {
      const payload: Parameters<typeof progressInspection>[1] = { checklist: checklistPayload, photos: Object.values(photos) };
      if (mileageKm.trim() !== '') payload.mileageKm = Number(mileageKm);
      if (fuelLevel.trim() !== '') payload.fuelLevel = Number(fuelLevel);
      // GPS best-effort (non bloquant)
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 4000 }));
        payload.locationLat = pos.coords.latitude;
        payload.locationLng = pos.coords.longitude;
      } catch { /* pas de GPS : on continue */ }
      const d = await progressInspection(insp.id, payload);
      setInsp(d);
      push('💾 Progression enregistrée');
    } catch (e: any) {
      push(`⛔ Sauvegarde échouée (${e?.message || 'réseau'})`);
    } finally {
      setBusy(false);
    }
  };

  const doComplete = async () => {
    if (!insp || isReadOnly) return;
    if (!verdict) { push('⛔ Choisis un verdict'); return; }
    if (!agentSig) { push('⛔ Signature agent requise'); return; }
    if (!window.confirm('Clôturer définitivement cet EDL ?')) return;
    setBusy(true);
    try {
      // On pousse d'abord la progression (km/carburant/checklist/photos) pour cohérence.
      await saveProgressSilent();
      const damageList = damages.trim()
        ? damages.split('\n').map((l) => l.trim()).filter(Boolean).map((label) => ({ label }))
        : [];
      const payload: Parameters<typeof completeInspection>[1] = {
        verdict,
        damages: damageList,
        agentSignatureBase64: agentSig,
      };
      if (counterSig) payload.counterSignatureBase64 = counterSig;
      if (mileageKm.trim() !== '') payload.mileageKm = Number(mileageKm);
      if (fuelLevel.trim() !== '') payload.fuelLevel = Number(fuelLevel);
      const d = await completeInspection(insp.id, payload);
      setInsp(d);
      push('✅ EDL clôturé et transmis');
      setTimeout(() => nav('/edl-list'), 900);
    } catch (e: any) {
      push(`⛔ Clôture échouée (${e?.message || 'réseau'})`);
    } finally {
      setBusy(false);
    }
  };

  // Variante silencieuse (utilisée avant complete, sans toast/GPS).
  const saveProgressSilent = async () => {
    if (!insp) return;
    const payload: Parameters<typeof progressInspection>[1] = { checklist: checklistPayload, photos: Object.values(photos) };
    if (mileageKm.trim() !== '') payload.mileageKm = Number(mileageKm);
    if (fuelLevel.trim() !== '') payload.fuelLevel = Number(fuelLevel);
    try { await progressInspection(insp.id, payload); } catch { /* non bloquant */ }
  };

  if (loading) {
    return (
      <div className="app-shell">
        <AppHeader variant="accent" title="EDL assigné" subtitle="Chargement…" onBack={() => nav('/edl-list')} />
        <main className="app-content2"><div className="empty-state"><span className="ic">⏳</span>Chargement de l'EDL…</div></main>
      </div>
    );
  }

  if (err || !insp) {
    return (
      <div className="app-shell">
        <AppHeader variant="accent" title="EDL assigné" subtitle="Erreur" onBack={() => nav('/edl-list')} />
        <main className="app-content2">
          <div className="m-card" style={{ background: 'rgba(192,39,26,.06)', border: '1px solid rgba(192,39,26,.25)' }}>
            <div style={{ fontWeight: 700, color: 'var(--bad)', marginBottom: 6 }}>⛔ {err || 'EDL introuvable'}</div>
            <div className="muted" style={{ fontSize: 12 }}>Vérifie ta connexion puis réessaie.</div>
          </div>
        </main>
      </div>
    );
  }

  const truckLabel = insp.truck
    ? `${insp.truck.registrationNumber || ''} ${insp.truck.brand || ''} ${insp.truck.model || ''}`.trim()
    : '—';

  return (
    <div className="app-shell">
      <AppHeader
        variant="accent"
        title={`EDL ${insp.type} en ligne`}
        subtitle={insp.contract?.reference ? `Contrat ${insp.contract.reference}` : 'EDL assigné'}
        onBack={() => nav('/edl-list')}
      />

      <main className="app-content2">
        {/* En-tête EDL : statut + camion + contrat (DONNÉES RÉELLES) */}
        <div className="m-card">
          <div className="m-card-title">
            🔗 EDL assigné
            <span className="count" style={{ background: insp.status === 'IN_PROGRESS' ? 'var(--good)' : 'var(--orange)', color: '#fff' }}>
              {insp.status}
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.8 }}>
            <div>🚚 Camion : <strong>{truckLabel}</strong></div>
            <div>📋 Contrat : <strong>{insp.contract?.reference || '—'}</strong></div>
            <div>🏢 Locataire : <strong>{insp.contract?.renterCompanyName || '—'}</strong></div>
            {insp.scheduledAt && <div>📅 Programmé : <strong>{new Date(insp.scheduledAt).toLocaleString('fr-FR')}</strong></div>}
          </div>
          {isReadOnly && (
            <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: 'var(--good)' }}>
              ✓ EDL clôturé — lecture seule
            </div>
          )}
        </div>

        {/* Kilométrage + carburant */}
        <div className="m-card">
          <div className="m-card-title">🛣️ Relevés</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="fld">
              <label>Kilométrage (km)</label>
              <input type="number" inputMode="numeric" value={mileageKm} disabled={isReadOnly}
                onChange={(e) => setMileageKm(e.target.value)} placeholder="ex : 124500" />
            </div>
            <div className="fld">
              <label>Carburant (%)</label>
              <input type="number" inputMode="numeric" min={0} max={100} value={fuelLevel} disabled={isReadOnly}
                onChange={(e) => setFuelLevel(e.target.value)} placeholder="0–100" />
            </div>
          </div>
        </div>

        {/* Checklist par section */}
        {SECTIONS.map((sec) => (
          <div key={sec.id} className="m-card section-card" style={{ background: sec.color }}>
            <div className="m-card-title">{sec.title}</div>
            {sec.items.map((item, idx) => {
              const key = itemKey(sec.id, idx);
              const v = checklist[key] || { state: '', observation: '' };
              const opts = ANSWER_TYPES[item.type] || ANSWER_TYPES.etat;
              const needPhoto = item.alwaysPhoto || isBadAnswer(item.type, v.state);
              const photoSlot = `chk-${key}`;
              const hasPhoto = !!photos[photoSlot];
              return (
                <div key={key} className="insp-block" style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{item.label}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                    {opts.map((o) => (
                      <button key={o.value} type="button" disabled={isReadOnly}
                        onClick={() => setItem(key, { state: o.value })}
                        className={`state ${answerClass(item.type, o.value)} ${v.state === o.value ? 'sel' : ''}`}
                        style={{
                          padding: '6px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                          border: v.state === o.value ? '2px solid var(--good)' : '1px solid #ddd',
                          background: v.state === o.value ? 'rgba(16,185,129,.12)' : '#fff',
                          cursor: isReadOnly ? 'default' : 'pointer',
                        }}>
                        {o.value}
                      </button>
                    ))}
                  </div>
                  {needPhoto && (
                    <button type="button" disabled={isReadOnly || busy} onClick={() => captureFor(photoSlot)}
                      style={{
                        fontSize: 11, fontWeight: 700, padding: '6px 10px', borderRadius: 6, border: 'none',
                        background: hasPhoto ? 'var(--good)' : 'var(--bad)', color: '#fff', marginBottom: 6,
                      }}>
                      {hasPhoto ? '✓ Photo envoyée — reprendre' : '📷 Photo obligatoire'}
                    </button>
                  )}
                  <input type="text" value={v.observation} disabled={isReadOnly}
                    onChange={(e) => setItem(key, { observation: e.target.value })}
                    placeholder={item.obsHint || 'Observation (optionnel)'}
                    style={{ width: '100%', fontSize: 12, padding: 8, borderRadius: 6, border: '1px solid #e3e3e3' }} />
                </div>
              );
            })}
          </div>
        ))}

        {/* Photos d'état des lieux générales */}
        <div className="m-card">
          <div className="m-card-title">📸 Photos d'état des lieux</div>
          <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
            Touche un emplacement pour prendre la photo (envoi direct au cloud).
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {['avant', 'arriere', 'gauche', 'droit', 'cabine', 'moteur'].map((slot) => {
              const has = !!photos[`gal-${slot}`];
              return (
                <button key={slot} type="button" disabled={isReadOnly || busy} onClick={() => captureFor(`gal-${slot}`)}
                  style={{
                    aspectRatio: '1', borderRadius: 8, border: has ? '2px solid var(--good)' : '1px dashed #bbb',
                    background: has ? 'rgba(16,185,129,.1)' : '#fafafa', fontSize: 11, fontWeight: 700,
                    color: has ? 'var(--good)' : 'var(--muted)', textTransform: 'capitalize',
                  }}>
                  {has ? '✓ ' : '＋ '}{slot}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dommages constatés (surtout au RETOUR) */}
        <div className="m-card">
          <div className="m-card-title">⚠️ Dommages constatés</div>
          <textarea value={damages} disabled={isReadOnly} onChange={(e) => setDamages(e.target.value)}
            placeholder="Un dommage par ligne (ex : Rayure portière droite)"
            rows={3} style={{ width: '100%', fontSize: 12, padding: 8, borderRadius: 6, border: '1px solid #e3e3e3' }} />
        </div>

        {/* Verdict */}
        <div className="m-card">
          <div className="m-card-title">🏁 Verdict</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {VERDICTS.map((vd) => (
              <button key={vd.value} type="button" disabled={isReadOnly}
                onClick={() => setVerdict(vd.value)}
                className={`state ${vd.cls}`}
                style={{
                  padding: '10px 12px', borderRadius: 8, fontWeight: 800, fontSize: 13,
                  border: verdict === vd.value ? '2px solid var(--good)' : '1px solid #ddd',
                  background: verdict === vd.value ? 'rgba(16,185,129,.12)' : '#fff',
                }}>
                {verdict === vd.value ? '● ' : '○ '}{vd.label}
              </button>
            ))}
          </div>
        </div>

        {/* Signatures contradictoires */}
        <div className="m-card">
          <div className="m-card-title">✍️ Signature agent (obligatoire)</div>
          {isReadOnly ? <div className="muted" style={{ fontSize: 12 }}>Signée.</div>
            : <SignaturePad value={agentSig} onChange={setAgentSig} />}
        </div>
        <div className="m-card">
          <div className="m-card-title">✍️ Signature contradictoire (propriétaire / locataire)</div>
          {isReadOnly ? <div className="muted" style={{ fontSize: 12 }}>—</div>
            : <SignaturePad value={counterSig} onChange={setCounterSig} />}
        </div>

        {/* Actions */}
        {!isReadOnly && (
          <>
            <button className="btn-cta btn-cta-out" onClick={saveProgress} disabled={busy}>
              💾 Enregistrer la progression
            </button>
            <button className="btn-cta btn-cta-prim" onClick={doComplete} disabled={busy} style={{ marginTop: 8 }}>
              ✅ Clôturer et transmettre
            </button>
          </>
        )}
      </main>

      <Toast msg={msg} />
    </div>
  );
}
