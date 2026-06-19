// Écran 2 — Mes EDL (fidèle maquette § 2)
// Tabs : À FAIRE / EN COURS / FAITS / SYNC
// Cards EDL avec type-badge, contrat, camion, lieu, heure
// File de sync visible

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { BottomNav } from '../components/BottomNav';
import { useSheet } from '../lib/store';
import type { Sheet } from '../lib/types';
import { Toast, useToast } from '../components/Toast';
import { getPendingCount, flushQueue } from '../lib/sync-queue';
import { isLoggedIn, probeEdlBackend, type EdlServerStatus } from '../lib/api';

type TabKey = 'todo' | 'inprogress' | 'done' | 'sync';

export function EDLListScreen() {
  const nav = useNavigate();
  const { sheet, listArchive, newSheet, startReturnFromDepart } = useSheet();
  const [archive, setArchive] = useState<Sheet[]>([]);
  const [pending, setPending] = useState(0);
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<TabKey>('todo');
  const [edlServer, setEdlServer] = useState<EdlServerStatus>('UNAUTHENTICATED');
  const { msg, push } = useToast();

  const refresh = async () => {
    setArchive(await listArchive());
    setPending(await getPendingCount());
    const logged = await isLoggedIn();
    setAuthed(logged);
    if (logged) setEdlServer(await probeEdlBackend());
  };
  useEffect(() => { refresh(); }, []);

  const hasDraft = !!(sheet.matricule || sheet.chauffeur || sheet.bilan);
  const departsDone = archive.filter((s) => s.kind === 'DEPART' && s.bilan);
  const done = archive.filter((s) => !!s.bilan);
  const pendingSync = archive.filter((s) => s.cloudStatus === 'PENDING' || s.cloudStatus === 'ERROR');

  const counts: Record<TabKey, number> = {
    todo: departsDone.length,
    inprogress: hasDraft ? 1 : 0,
    done: done.length,
    sync: pendingSync.length,
  };

  const startReturnFor = (departSheet: Sheet) => {
    if (hasDraft) {
      if (!window.confirm("Un brouillon existe déjà. Démarrer l'EDL RETOUR pour ce camion ?")) return;
    }
    startReturnFromDepart(departSheet);
    push(`EDL RETOUR démarré · ${departSheet.matricule || '?'}`);
    nav('/identification');
  };

  const startNewDepart = () => {
    newSheet('DEPART');
    nav('/identification');
  };

  const forceSync = async () => {
    if (!authed) { push('Connecte-toi pour synchroniser'); return; }
    if (!navigator.onLine) { push('📴 Hors-ligne — réessaie quand connecté'); return; }
    push('☁️ Synchronisation…');
    const { sent, failed } = await flushQueue();
    push(`☁️ ${sent} envoyée(s), ${failed} échec(s)`);
    await refresh();
  };

  return (
    <div className="app-shell">
      <AppHeader
        variant="primary"
        title="📋 Mes EDL"
        subtitle={`${done.length} ce mois · ${archive.length} cumul`}
        icons={<span>🔍</span>}
      />

      <div className="edl-tabs">
        <button className={tab === 'todo' ? 'active' : ''} onClick={() => setTab('todo')}>
          À FAIRE ({counts.todo})
        </button>
        <button className={tab === 'inprogress' ? 'active' : ''} onClick={() => setTab('inprogress')}>
          EN COURS ({counts.inprogress})
        </button>
        <button className={tab === 'done' ? 'active' : ''} onClick={() => setTab('done')}>
          FAITS ({counts.done})
        </button>
        <button className={tab === 'sync' ? 'active' : ''} onClick={() => setTab('sync')}>
          SYNC ⏳ ({counts.sync})
        </button>
      </div>

      <main className="app-content2">
        {authed && edlServer === 'NOT_LIVED' && (
          <div className="m-card" style={{ background: 'rgba(232,162,60,.08)', border: '1px solid rgba(232,162,60,.3)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--orange)', marginBottom: 4 }}>
              ⚙️ API EDL en cours de livraison côté serveur
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>
              Les EDL assignés depuis le bureau ne sont pas encore récupérables. Tu peux quand même
              créer un EDL DÉPART/RETOUR en local — il sera envoyé automatiquement dès que
              la synchronisation sera disponible (file en attente : {pending}).
            </div>
          </div>
        )}
        {tab === 'todo' && (
          <>
            <div className="m-card">
              <div className="m-card-title">↩ EDL RETOUR à faire <span className="count">{departsDone.length}</span></div>
              {departsDone.length === 0 ? (
                <div className="empty-state">
                  <span className="ic">📋</span>
                  Aucun EDL DÉPART en attente de retour.<br />
                  Termine d'abord un EDL DÉPART pour pouvoir faire son RETOUR.
                </div>
              ) : (
                departsDone.map((s) => (
                  <div key={s.id} className="m-edl" style={{ background: '#fff', padding: 14, borderRadius: 12, marginBottom: 10 }}>
                    <div style={{ flex: 1 }}>
                      <span className="type-badge return">RETOUR à faire</span>
                      <strong style={{ fontSize: 14, marginTop: 4 }}>{s.matricule || '(sans matricule)'}</strong>
                      <span>{s.chauffeur || '—'}</span>
                      <div style={{ marginTop: 6, fontSize: 11 }}>📋 DÉPART du {s.date}</div>
                      {s.contractId && <div style={{ fontSize: 11 }}>🔗 Contrat {s.contractId}</div>}
                    </div>
                    <button onClick={() => startReturnFor(s)} style={{ background: 'var(--orange)', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 6, fontSize: 10, fontWeight: 700, alignSelf: 'center' }}>
                      DÉMARRER
                    </button>
                  </div>
                ))
              )}
            </div>
            <button className="btn-cta btn-cta-prim" onClick={startNewDepart}>
              + Nouvel EDL DÉPART
            </button>
          </>
        )}

        {tab === 'inprogress' && (
          hasDraft ? (
            <div className="m-edl error" style={{ background: '#fff', padding: 14, borderRadius: 12 }}>
              <div style={{ flex: 1 }}>
                <span className={`type-badge ${sheet.kind === 'RETOUR' ? 'return' : 'depart'}`}>{sheet.kind || 'DÉPART'} · BROUILLON</span>
                <strong style={{ fontSize: 14, marginTop: 4 }}>{sheet.matricule || '(sans matricule)'}</strong>
                <span>{sheet.chauffeur || '—'}</span>
                <div style={{ marginTop: 6, fontSize: 11 }}>📅 {sheet.date}</div>
              </div>
              <button onClick={() => nav('/identification')} style={{ background: 'var(--good)', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 6, fontSize: 10, fontWeight: 700, alignSelf: 'center' }}>
                REPRENDRE
              </button>
            </div>
          ) : (
            <div className="empty-state">
              <span className="ic">⏸</span>
              Aucun EDL en cours.
            </div>
          )
        )}

        {tab === 'done' && (
          done.length === 0 ? (
            <div className="empty-state">
              <span className="ic">✓</span>
              Aucun EDL terminé.
            </div>
          ) : (
            done.map((s) => {
              const verdictCls = s.bilan === 'APTE AU SERVICE' ? 'good' : s.bilan === 'IMMOBILISÉ' ? 'error' : 'warn';
              return (
                <div key={s.id} className={`m-edl ${verdictCls === 'good' ? '' : verdictCls}`} style={{ background: '#fff', padding: 14, borderRadius: 12, marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <span className={`type-badge ${s.kind === 'RETOUR' ? 'return' : 'depart'}`}>{s.kind || 'DÉPART'}</span>
                    <strong style={{ fontSize: 14, marginTop: 4 }}>{s.matricule || '(sans matricule)'}</strong>
                    <span>{s.bilan} · {s.chauffeur || '—'}</span>
                    <div style={{ marginTop: 6, fontSize: 11 }}>{s.date}</div>
                  </div>
                  <div className="time" style={{ fontSize: 18 }}>
                    {s.cloudStatus === 'SENT' ? '☁' : s.cloudStatus === 'PENDING' ? '⏳' : s.cloudStatus === 'ERROR' ? '⛔' : '·'}
                  </div>
                </div>
              );
            })
          )
        )}

        {tab === 'sync' && (
          <>
            {pendingSync.length === 0 ? (
              <div className="empty-state">
                <span className="ic">☁</span>
                Aucun EDL en attente de synchronisation.
              </div>
            ) : (
              <>
                <div className="sync-queue">
                  <strong>⏳ {pendingSync.length} EDL en attente</strong>
                  {pendingSync.map((s) => (
                    <div key={s.id} className="item">
                      <span>{s.matricule || 'sans matricule'} ({s.kind})</span>
                      <span>{s.date}</span>
                    </div>
                  ))}
                </div>
                <button className="btn-cta btn-cta-prim" onClick={forceSync} disabled={!authed}>
                  📡 Forcer la synchronisation
                </button>
                {!authed && (
                  <div className="muted" style={{ textAlign: 'center', marginTop: 10, fontSize: 12 }}>
                    Connecte-toi pour synchroniser
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      <button className="fab-add" onClick={startNewDepart} aria-label="Nouvel EDL">+</button>
      <BottomNav pendingCount={pending} />
      <Toast msg={msg} />
    </div>
  );
}
