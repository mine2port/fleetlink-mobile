// Écran 1 — Accueil agent (fidèle maquette agent-terrain-fleetlink.html § 1)
// Header success vert pétrole + avatar + notifs + offline banner
// 2 stats (EDL aujourd'hui / À faire maintenant)
// Card "Prochain EDL" CTA + List EDL aujourd'hui + Récents
// Bottom nav 5 onglets

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { BottomNav } from '../components/BottomNav';
import { useSheet } from '../lib/store';
import type { Sheet } from '../lib/types';
import { Toast, useToast } from '../components/Toast';
import { getPendingCount } from '../lib/sync-queue';
import { isLoggedIn, getCurrentUser, type ApiUser } from '../lib/api';

export function HomeScreen() {
  const nav = useNavigate();
  const { sheet, newSheet, listArchive } = useSheet();
  const [archive, setArchive] = useState<Sheet[]>([]);
  const [pending, setPending] = useState(0);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [authed, setAuthed] = useState(false);
  const { msg, push } = useToast();

  const refresh = async () => {
    setArchive(await listArchive());
    setPending(await getPendingCount());
    setAuthed(await isLoggedIn());
    setUser(await getCurrentUser());
  };
  useEffect(() => { refresh(); }, []);

  const hasDraft = !!(sheet.matricule || sheet.chauffeur || sheet.bilan);
  const userInitial = (user?.fullName || 'M').charAt(0).toUpperCase();
  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  const startNewDepart = () => {
    if (hasDraft) {
      if (!window.confirm("Un brouillon existe déjà. Démarrer un EDL DÉPART vide ?")) return;
    }
    newSheet('DEPART');
    nav('/identification');
  };

  // Filtres : DÉPARTS en attente (= ceux à compléter) + récents (5 derniers tous types)
  const departsToDo = archive.filter((s) => s.kind === 'DEPART' && !s.bilan);
  const todayCount = departsToDo.length + (hasDraft ? 1 : 0);
  const recents = archive.slice(0, 3);

  return (
    <div className="app-shell">
      <AppHeader
        variant="success"
        avatar={userInitial}
        title={user?.fullName ? `Bonjour ${user.fullName.split(' ')[0]}` : 'Bonjour Agent'}
        subtitle={`Agent terrain · ${today}`}
        icons={
          <>
            <span style={{ position: 'relative' }}>
              🔔
              {pending > 0 && <span className="badge-mini">{pending}</span>}
            </span>
            <span style={{ fontSize: 16 }}>{authed ? '📡' : '📵'}</span>
          </>
        }
      />

      {pending > 0 && (
        <div className="offline-banner">📵 {pending} action(s) en attente de sync</div>
      )}

      <main className="app-content2">
        <div className="m-stat-row">
          <div className="m-stat feat">
            <div className="v">{todayCount}</div>
            <div className="l">EDL aujourd'hui</div>
          </div>
          <div className="m-stat accent">
            <div className="v">{hasDraft ? 1 : 0}</div>
            <div className="l">À faire maintenant</div>
          </div>
        </div>

        {hasDraft ? (
          <div className="m-card">
            <div className="m-card-title">⏰ Brouillon en cours <span className="count warn">EN COURS</span></div>
            <div style={{ background: 'rgba(232,162,60,.08)', borderRadius: 10, padding: 14, border: '1px solid rgba(232,162,60,.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <span className="type-badge" style={{ background: sheet.kind === 'RETOUR' ? 'rgba(184,92,0,.12)' : 'rgba(15,94,94,.12)', color: sheet.kind === 'RETOUR' ? 'var(--orange)' : 'var(--navy)', padding: '3px 8px', borderRadius: 99, fontSize: 9, fontWeight: 700 }}>
                    {sheet.kind || 'DÉPART'}
                  </span>
                  <div style={{ fontWeight: 800, fontSize: 13, marginTop: 4 }}>
                    {sheet.matricule || 'Sans matricule'}
                  </div>
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, color: 'var(--orange)', fontSize: 14 }}>
                  {sheet.date || '—'}
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                <div>📋 Contrat : <strong>{sheet.contractId || '—'}</strong></div>
                <div>🚚 Camion : <strong>{sheet.matricule || '—'}</strong></div>
                <div>👤 Chauffeur : <strong>{sheet.chauffeur || '—'}</strong></div>
              </div>
              <button className="btn-cta" style={{ marginTop: 12 }} onClick={() => nav('/identification')}>
                ▶ Reprendre le brouillon
              </button>
            </div>
          </div>
        ) : (
          <div className="m-card">
            <div className="m-card-title">🆕 Démarrer un EDL</div>
            <p className="muted" style={{ fontSize: 12, margin: '6px 0 12px' }}>
              Le propriétaire remet le camion au locataire. Cet EDL servira de référence au RETOUR.
            </p>
            <button className="btn-cta btn-cta-prim" onClick={startNewDepart}>
              + Nouvel EDL DÉPART
            </button>
          </div>
        )}

        <div className="m-card">
          <div className="m-card-title">
            📋 EDL aujourd'hui
            <span className="count">{departsToDo.length}</span>
          </div>
          {departsToDo.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 12px' }}>
              <span className="ic">✓</span>
              Aucun EDL en attente
            </div>
          ) : (
            departsToDo.slice(0, 3).map((s) => (
              <div key={s.id} className="m-edl warn" onClick={() => nav('/identification')} style={{ cursor: 'pointer' }}>
                <div style={{ flex: 1 }}>
                  <span className="type-badge depart">DÉPART</span>
                  <strong>{s.matricule || '(sans matricule)'}</strong>
                  <span>{s.chauffeur || '—'}</span>
                </div>
                <div className="time">{s.date?.slice(5) || ''}</div>
              </div>
            ))
          )}
        </div>

        <div className="m-card">
          <div className="m-card-title">✅ EDL réalisés récents <span className="count">{recents.length}</span></div>
          {recents.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 12px' }}>
              <span className="ic">📋</span>
              Aucun EDL terminé pour l'instant
            </div>
          ) : (
            recents.map((s) => {
              const verdict = s.bilan === 'APTE AU SERVICE' ? '✓' : s.bilan === 'IMMOBILISÉ' ? '⛔' : s.bilan ? '⚠' : '—';
              return (
                <div key={s.id} className="m-edl muted">
                  <div style={{ flex: 1 }}>
                    <span className={`type-badge ${s.kind === 'RETOUR' ? 'return' : 'depart'}`}>{s.kind || 'DÉPART'}</span>
                    <strong>{s.matricule || '(sans matricule)'}</strong>
                    <span>{s.date} · {s.bilan || 'En cours'}</span>
                  </div>
                  <div className="time">{verdict}</div>
                </div>
              );
            })
          )}
        </div>

        {!authed && (
          <div className="m-card" style={{ textAlign: 'center', background: 'rgba(15,94,94,.04)' }}>
            <div style={{ fontSize: 13, marginBottom: 10, color: 'var(--muted)' }}>
              Mode local — fiches sauvegardées sur le téléphone uniquement
            </div>
            <button className="btn-cta btn-cta-out" onClick={() => nav('/login')}>
              🔐 Se connecter au cloud FleetLink
            </button>
          </div>
        )}
      </main>

      <BottomNav pendingCount={pending} />
      <Toast msg={msg} />
    </div>
  );
}
