// ============================================================
// File de synchronisation des fiches uploadées vers FleetLink.
// Préserve l'offline-first : tant qu'on n'a pas de réseau,
// les fiches restent en local avec cloudStatus = PENDING.
// Au retour de connexion, flushQueue() pousse les fiches une à une.
// ============================================================

import { Preferences } from '@capacitor/preferences';
import type { Sheet } from './types';
import { buildPdf } from './pdf';
import { uploadSheet, isLoggedIn } from './api';

const QUEUE_KEY = 'fl_sync_queue';

type QueueEntry = {
  sheetId: number;
  attempts: number;
  enqueuedAt: string;
  lastErrorAt?: string;
  lastError?: string;
};

async function readKey(k: string): Promise<string | null> {
  try { return (await Preferences.get({ key: k })).value ?? null; }
  catch { return localStorage.getItem(k); }
}
async function writeKey(k: string, v: string): Promise<void> {
  try { await Preferences.set({ key: k, value: v }); }
  catch { localStorage.setItem(k, v); }
}

async function readQueue(): Promise<QueueEntry[]> {
  const raw = await readKey(QUEUE_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) as QueueEntry[]; } catch { return []; }
}
async function writeQueue(q: QueueEntry[]): Promise<void> {
  await writeKey(QUEUE_KEY, JSON.stringify(q));
}

export async function enqueueUpload(sheet: Sheet): Promise<void> {
  const q = await readQueue();
  if (q.find((e) => e.sheetId === sheet.id)) return; // déjà en file
  q.push({ sheetId: sheet.id, attempts: 0, enqueuedAt: new Date().toISOString() });
  await writeQueue(q);
}

export async function getPendingCount(): Promise<number> {
  return (await readQueue()).length;
}

// Charge la fiche depuis l'archive (clé partagée avec store.tsx).
const ARCHIVE_KEY = 'fl_eedl_sheets';
async function loadSheetFromArchive(id: number): Promise<Sheet | null> {
  const raw = await readKey(ARCHIVE_KEY);
  if (!raw) return null;
  try {
    const list = JSON.parse(raw) as Sheet[];
    return list.find((s) => s.id === id) || null;
  } catch { return null; }
}
async function updateSheetInArchive(updated: Sheet): Promise<void> {
  const raw = await readKey(ARCHIVE_KEY);
  if (!raw) return;
  try {
    const list = JSON.parse(raw) as Sheet[];
    const next = list.map((s) => (s.id === updated.id ? updated : s));
    await writeKey(ARCHIVE_KEY, JSON.stringify(next));
  } catch {}
}

// Tente de vider la file. Renvoie {sent, failed} pour info UI.
export async function flushQueue(): Promise<{ sent: number; failed: number }> {
  if (!(await isLoggedIn())) return { sent: 0, failed: 0 };
  if (!navigator.onLine) return { sent: 0, failed: 0 };

  const q = await readQueue();
  let sent = 0, failed = 0;
  const remaining: QueueEntry[] = [];

  for (const entry of q) {
    const sheet = await loadSheetFromArchive(entry.sheetId);
    if (!sheet) continue; // fiche supprimée localement, on l'écarte de la file
    try {
      const { blob } = await buildPdf(sheet);
      const res = await uploadSheet(sheet, blob);
      await updateSheetInArchive({
        ...sheet,
        cloudId: res.id,
        cloudStatus: 'SENT',
        cloudError: undefined,
      });
      sent++;
    } catch (err: any) {
      failed++;
      entry.attempts++;
      entry.lastErrorAt = new Date().toISOString();
      entry.lastError = err?.message || 'erreur inconnue';
      // on garde dans la file tant qu'on n'a pas dépassé 5 tentatives
      if (entry.attempts < 5) remaining.push(entry);
      await updateSheetInArchive({ ...sheet, cloudStatus: 'ERROR', cloudError: entry.lastError });
    }
  }
  await writeQueue(remaining);
  return { sent, failed };
}

// À appeler depuis App.tsx pour brancher le flush automatique au retour en ligne.
export function installAutoSync(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('online', () => {
    flushQueue().catch(() => { /* silencieux */ });
  });
  // Tentative initiale différée (laisse à l'app le temps de se monter)
  setTimeout(() => { flushQueue().catch(() => {}); }, 4000);
}
