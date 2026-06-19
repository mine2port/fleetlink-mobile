// Écran 8 — Mon Planning (fidèle maquette § 8)
// Vue semaine + EDL placés + congés + stats + récompense mois

import { useEffect, useMemo, useState } from 'react';
import { AppHeader } from '../components/AppHeader';
import { BottomNav } from '../components/BottomNav';
import { Toast, useToast } from '../components/Toast';
import { useSheet } from '../lib/store';
import type { Sheet } from '../lib/types';
import { getPendingCount } from '../lib/sync-queue';

const DAYS = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'];

export function PlanningScreen() {
  const { listArchive } = useSheet();
  const [archive, setArchive] = useState<Sheet[]>([]);
  const [pending, setPending] = useState(0);
  const [weekOffset, setWeekOffset] = useState(0); // 0 = semaine actuelle
  const { msg, push } = useToast();

  useEffect(() => {
    (async () => {
      setArchive(await listArchive());
      setPending(await getPendingCount());
    })();
  }, []);

  // Calcule le lundi de la semaine cible
  const weekStart = useMemo(() => {
    const d = new Date();
    const day = d.getDay() || 7; // 0=dim → 7
    d.setDate(d.getDate() - day + 1 + weekOffset * 7);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [weekOffset]);

  const weekDays = useMemo(() => {
    return DAYS.map((dow, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      const events = archive.filter((s) => s.date === iso);
      return {
        dow,
        date: d,
        iso,
        dateLabel: d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        events,
      };
    });
  }, [weekStart, archive]);

  const today = new Date().toISOString().slice(0, 10);
  const weekNum = Math.ceil(((weekStart.getTime() - new Date(weekStart.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7);
  const monthLabel = weekStart.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  const totalEvents = weekDays.reduce((a, d) => a + d.events.length, 0);
  const charge = totalEvents * 5; // estimation heuristique 5h par EDL

  return (
    <div className="app-shell">
      <AppHeader
        variant="dark"
        title="📅 Mon Planning"
        subtitle={`Semaine ${weekNum} · ${monthLabel}`}
        icons={
          <>
            <span onClick={() => setWeekOffset((o) => o - 1)} style={{ cursor: 'pointer' }}>◀</span>
            <span onClick={() => setWeekOffset((o) => o + 1)} style={{ cursor: 'pointer' }}>▶</span>
          </>
        }
      />

      <main className="app-content2">
        <div className="planning-mini">
          {weekDays.map((d) => {
            const isToday = d.iso === today;
            return (
              <div key={d.iso} className={`planning-day ${isToday ? 'today' : ''}`}>
                <div className="dow">{d.dow} {isToday && 'AUJOURD\'HUI'}</div>
                <div className="date">{d.dateLabel}</div>
                {d.events.length === 0 ? (
                  <div className="empty">Aucun EDL programmé</div>
                ) : (
                  d.events.map((e) => (
                    <div key={e.id} className={`ev ${e.kind === 'RETOUR' ? 'return' : ''}`}>
                      {e.kind === 'RETOUR' ? '📥' : '📤'} {e.kind} · {e.matricule || '?'}
                      {e.chauffeur && ` · ${e.chauffeur}`}
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>

        <div className="m-card" style={{ marginTop: 14 }}>
          <div className="m-card-title">📈 Stats semaine</div>
          <div className="m-stat-row" style={{ marginBottom: 0 }}>
            <div className="m-stat">
              <div className="v">{totalEvents}</div>
              <div className="l">EDL réalisés</div>
            </div>
            <div className="m-stat">
              <div className="v">~{charge}h</div>
              <div className="l">Charge estimée</div>
            </div>
          </div>
        </div>

        <div className="m-card">
          <div className="m-card-title">🏖 Demande de congé / indisponibilité</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
            Demander une absence à votre Fleet Manager — minimum 7 jours à l'avance.
          </div>
          <button
            className="btn-cta btn-cta-out"
            onClick={() => push('🏖 Demande de congé — fonctionnalité à venir (backend EDL)')}
          >
            + Nouvelle demande
          </button>
        </div>

        {totalEvents >= 5 && (
          <div className="m-card" style={{ background: 'linear-gradient(135deg, var(--navy), var(--navy-soft))', color: '#fff' }}>
            <div className="m-card-title" style={{ color: 'rgba(255,255,255,.85)' }}>⭐ Performance</div>
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>
              <div>🏆 <strong>Top agent semaine</strong> ({totalEvents} EDL réalisés)</div>
              <div style={{ marginTop: 6, fontSize: 11, opacity: .85 }}>
                Continuez sur cette lancée !
              </div>
            </div>
          </div>
        )}
      </main>

      <BottomNav pendingCount={pending} />
      <Toast msg={msg} />
    </div>
  );
}
