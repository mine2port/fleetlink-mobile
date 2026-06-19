// ============================================================
// Client HTTP minimal vers l'API FleetLink (fleetlink.mine2port.eu).
// Hors-ligne d'abord : aucune route n'est appelée tant que l'agent
// n'a pas explicitement déclenché un login ou une sync — l'app
// continue de fonctionner en local sans réseau.
//
// Lot 126.2 : host corrigé .fr -> .eu (le CDC projetait mine2port.fr,
// mais le backend est déployé en prod LIVE sur mine2port.eu).
// ============================================================

import { Preferences } from '@capacitor/preferences';
import type { Sheet } from './types';

export const API_BASE = 'https://fleetlink.mine2port.eu/api/v1';

const TOKEN_KEY = 'fl_access_token';
const REFRESH_KEY = 'fl_refresh_token';
const USER_KEY = 'fl_current_user';

// ----- Types -----
export type ApiUser = {
  id: string;
  email: string;
  fullName: string;
  role: 'SUPER_ADMIN' | 'SUPER_ADMIN_FLEETLINK' | 'ADMIN_TENANT' | 'FLEET_MANAGER' | 'FIELD_AGENT';
  tenantId?: string;
  tenantName?: string;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: ApiUser;
};

export type DevAccount = {
  email: string;
  role: ApiUser['role'];
  fullName: string;
};

export type AssignedSheet = {
  id: string;             // id côté serveur
  contractId: string;
  kind: 'DEPART' | 'RETOUR';
  truckPlate?: string;
  scheduledFor?: string;  // ISO date
  status: 'PENDING' | 'DONE';
  // Pour un RETOUR : id de la fiche DÉPART correspondante côté serveur
  relatedDepartId?: string;
};

// ----- Stockage tokens -----
async function setKey(k: string, v: string | null): Promise<void> {
  try {
    if (v === null) {
      await Preferences.remove({ key: k });
    } else {
      await Preferences.set({ key: k, value: v });
    }
  } catch {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  }
}
async function getKey(k: string): Promise<string | null> {
  try {
    const r = await Preferences.get({ key: k });
    return r.value ?? null;
  } catch {
    return localStorage.getItem(k);
  }
}

export async function getAccessToken(): Promise<string | null> { return getKey(TOKEN_KEY); }
export async function getCurrentUser(): Promise<ApiUser | null> {
  const raw = await getKey(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as ApiUser; } catch { return null; }
}
export async function isLoggedIn(): Promise<boolean> { return (await getAccessToken()) !== null; }
export async function logout(): Promise<void> {
  await setKey(TOKEN_KEY, null);
  await setKey(REFRESH_KEY, null);
  await setKey(USER_KEY, null);
}

// ----- Fetch avec auth + refresh -----
async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  const headers = new Headers(init.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (res.status === 401) {
    // Tentative de refresh
    const ok = await tryRefresh();
    if (ok) {
      const t2 = await getAccessToken();
      if (t2) headers.set('Authorization', `Bearer ${t2}`);
      return fetch(`${API_BASE}${path}`, { ...init, headers });
    }
  }
  return res;
}

async function tryRefresh(): Promise<boolean> {
  const rt = await getKey(REFRESH_KEY);
  if (!rt) return false;
  try {
    const r = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rt }),
    });
    if (!r.ok) return false;
    const data = (await r.json()) as { accessToken: string; refreshToken?: string };
    await setKey(TOKEN_KEY, data.accessToken);
    if (data.refreshToken) await setKey(REFRESH_KEY, data.refreshToken);
    return true;
  } catch { return false; }
}

// ----- Endpoints -----
export async function login(email: string, password: string): Promise<LoginResponse> {
  const r = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw new Error(`Login échoué (${r.status})`);
  const data = (await r.json()) as LoginResponse;
  await setKey(TOKEN_KEY, data.accessToken);
  await setKey(REFRESH_KEY, data.refreshToken);
  await setKey(USER_KEY, JSON.stringify(data.user));
  return data;
}

// MODE TEST : récupère la liste des comptes de démo (endpoint /dev/accounts).
// Tolère les 2 formats de réponse : array direct OU { items: [...] }.
export async function listDevAccounts(): Promise<DevAccount[]> {
  try {
    const r = await fetch(`${API_BASE}/dev/accounts`);
    if (!r.ok) return [];
    const data = await r.json();
    if (Array.isArray(data)) return data as DevAccount[];
    if (data && Array.isArray((data as any).items)) return (data as any).items as DevAccount[];
    return [];
  } catch { return []; }
}

// MODE TEST : magic-login pour un compte de démo (pas de mot de passe)
export async function magicLogin(email: string): Promise<LoginResponse> {
  const r = await fetch(`${API_BASE}/dev/magic-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!r.ok) throw new Error(`Magic-login échoué (${r.status})`);
  const data = (await r.json()) as LoginResponse;
  await setKey(TOKEN_KEY, data.accessToken);
  await setKey(REFRESH_KEY, data.refreshToken);
  await setKey(USER_KEY, JSON.stringify(data.user));
  return data;
}

// Récupère les EDL assignés à l'agent connecté.
// Note Lot 126 : tant que le Slice S6 EDL backend n'est pas livré
// (POST /me/edl/start, GET /me/sheets/assigned, etc.), cette route
// renvoie 404 — on retourne alors un array vide pour ne pas casser
// l'UI (fallback honnête, l'agent travaille en local + sync-queue).
export async function fetchAssignedSheets(): Promise<AssignedSheet[]> {
  const r = await authFetch('/me/sheets/assigned');
  if (r.status === 404) return [];                  // backend S6 non livré
  if (!r.ok) throw new Error(`fetchAssignedSheets ${r.status}`);
  const data = await r.json();
  if (Array.isArray(data)) return data as AssignedSheet[];
  if (data && Array.isArray((data as any).items)) return (data as any).items as AssignedSheet[];
  return [];
}

// Statut côté serveur de l'API EDL — utilisé par l'UI pour afficher
// un bandeau pédagogique "API EDL en cours de livraison" tant que S6 absent.
export type EdlServerStatus = 'AVAILABLE' | 'NOT_LIVED' | 'UNREACHABLE' | 'UNAUTHENTICATED';
export async function probeEdlBackend(): Promise<EdlServerStatus> {
  if (!(await isLoggedIn())) return 'UNAUTHENTICATED';
  try {
    const r = await authFetch('/me/sheets/assigned');
    if (r.status === 404) return 'NOT_LIVED';
    if (r.status === 401 || r.status === 403) return 'UNAUTHENTICATED';
    if (r.ok) return 'AVAILABLE';
    return 'UNREACHABLE';
  } catch { return 'UNREACHABLE'; }
}

// Upload d'une fiche complétée + PDF.
export async function uploadSheet(sheet: Sheet, pdfBlob: Blob): Promise<{ id: string; pdfUrl: string }> {
  const fd = new FormData();
  fd.append('payload', JSON.stringify({
    localId: sheet.id,
    kind: sheet.kind,
    contractId: sheet.contractId || null,
    relatedSheetCloudId: undefined, // résolu via la sync-queue si besoin
    matricule: sheet.matricule,
    parc: sheet.parc,
    km: sheet.km,
    hmot: sheet.hmot,
    date: sheet.date,
    chauffeur: sheet.chauffeur,
    sender: sheet.sender,
    receiver: sheet.receiver,
    answers: sheet.answers,
    compare: sheet.compare || null,
    bilan: sheet.bilan,
    repairs: sheet.repairs,
    controleur: sheet.controleur,
  }));
  fd.append('pdf', pdfBlob, `EDL_${sheet.kind}_${sheet.matricule || sheet.id}.pdf`);

  const token = await getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const r = await fetch(`${API_BASE}/me/sheets`, {
    method: 'POST',
    headers,
    body: fd,
  });
  if (!r.ok) throw new Error(`uploadSheet ${r.status}`);
  return (await r.json()) as { id: string; pdfUrl: string };
}
