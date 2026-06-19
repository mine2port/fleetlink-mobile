// ============================================================
// Contexte React = état global d'une fiche d'inspection en cours
// + sauvegarde locale (Capacitor Preferences si dispo, sinon localStorage).
// ============================================================

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { SECTIONS, GALLERY_PHOTOS } from '../data/sections';
import type { ItemAnswer, Sheet } from './types';

// Crée une fiche vierge avec les bons tableaux pré-remplis.
function emptySheet(): Sheet {
  const answers: Record<string, ItemAnswer[]> = {};
  for (const sec of SECTIONS) {
    answers[sec.id] = sec.items.map(() => ({ state: '', obs: '', photos: [] }));
  }
  const emptyCo = { name: '', representative: '', phone: '', place: '' };
  return {
    id: 0,
    sender: { ...emptyCo },
    receiver: { ...emptyCo },
    matricule: '',
    parc: '',
    km: '',
    hmot: '',
    date: new Date().toISOString().slice(0, 10),
    chauffeur: '',
    answers,
    galleryPhotos: GALLERY_PHOTOS.map(() => []),
    bilan: '',
    repairs: '',
    controleur: '',
    signature: '',
    savedAt: '',
  };
}

const DRAFT_KEY = 'm2p_eedl_draft';
const ARCHIVE_KEY = 'm2p_eedl_sheets';

// Tentative d'utiliser Capacitor Preferences si présent (mobile). Fallback localStorage.
async function readKey(key: string): Promise<string | null> {
  try {
    const mod = await import('@capacitor/preferences').catch(() => null as any);
    if (mod?.Preferences) {
      const r = await mod.Preferences.get({ key });
      return r.value ?? null;
    }
  } catch {}
  return localStorage.getItem(key);
}
async function writeKey(key: string, value: string): Promise<void> {
  try {
    const mod = await import('@capacitor/preferences').catch(() => null as any);
    if (mod?.Preferences) {
      await mod.Preferences.set({ key, value });
      return;
    }
  } catch {}
  try { localStorage.setItem(key, value); } catch { /* mémoire pleine, on ignore */ }
}

type Ctx = {
  sheet: Sheet;
  setIdent: (field: keyof Sheet, value: string) => void;
  setCompany: (side: 'sender' | 'receiver', field: keyof Sheet['sender'], value: string) => void;
  setItem: (sectionId: string, idx: number, patch: Partial<ItemAnswer>) => void;
  addItemPhoto: (sectionId: string, idx: number, dataUrl: string) => void;
  removeItemPhoto: (sectionId: string, idx: number, photoIdx: number) => void;
  addGalleryPhoto: (galleryIdx: number, dataUrl: string) => void;
  removeGalleryPhoto: (galleryIdx: number, photoIdx: number) => void;
  setBilan: (b: string) => void;
  setRepairs: (r: string) => void;
  setControleur: (c: string) => void;
  setSignature: (sig: string) => void;
  saveDraft: () => Promise<void>;
  archiveSheet: () => Promise<void>;
  newSheet: () => void;
  loadDraft: () => Promise<void>;
  listArchive: () => Promise<Sheet[]>;
  deleteArchived: (id: number) => Promise<void>;
};

const SheetContext = createContext<Ctx | null>(null);

export function SheetProvider({ children }: { children: ReactNode }) {
  const [sheet, setSheet] = useState<Sheet>(() => emptySheet());

  // Auto-charge le brouillon au démarrage.
  useEffect(() => {
    (async () => {
      const raw = await readKey(DRAFT_KEY);
      if (raw) {
        try { setSheet(JSON.parse(raw)); } catch { /* brouillon corrompu : on garde vierge */ }
      }
    })();
  }, []);

  // Auto-sauve le brouillon à chaque modification (anti perte sur le terrain).
  useEffect(() => {
    const id = setTimeout(() => { writeKey(DRAFT_KEY, JSON.stringify(sheet)); }, 400);
    return () => clearTimeout(id);
  }, [sheet]);

  const api = useMemo<Ctx>(() => ({
    sheet,
    setIdent: (f, v) => setSheet((s) => ({ ...s, [f]: v } as Sheet)),
    setCompany: (side, field, value) => setSheet((s) => ({
      ...s,
      [side]: { ...s[side], [field]: value },
    })),
    setItem: (sectionId, idx, patch) => setSheet((s) => {
      const arr = [...(s.answers[sectionId] || [])];
      arr[idx] = { ...arr[idx], ...patch };
      return { ...s, answers: { ...s.answers, [sectionId]: arr } };
    }),
    addItemPhoto: (sectionId, idx, dataUrl) => setSheet((s) => {
      const arr = [...(s.answers[sectionId] || [])];
      arr[idx] = { ...arr[idx], photos: [...arr[idx].photos, dataUrl] };
      return { ...s, answers: { ...s.answers, [sectionId]: arr } };
    }),
    removeItemPhoto: (sectionId, idx, pIdx) => setSheet((s) => {
      const arr = [...(s.answers[sectionId] || [])];
      const photos = arr[idx].photos.filter((_, i) => i !== pIdx);
      arr[idx] = { ...arr[idx], photos };
      return { ...s, answers: { ...s.answers, [sectionId]: arr } };
    }),
    addGalleryPhoto: (gIdx, dataUrl) => setSheet((s) => {
      const g = s.galleryPhotos.map((arr, i) => i === gIdx ? [...arr, dataUrl] : arr);
      return { ...s, galleryPhotos: g };
    }),
    removeGalleryPhoto: (gIdx, pIdx) => setSheet((s) => {
      const g = s.galleryPhotos.map((arr, i) => i === gIdx ? arr.filter((_, j) => j !== pIdx) : arr);
      return { ...s, galleryPhotos: g };
    }),
    setBilan: (b) => setSheet((s) => ({ ...s, bilan: b })),
    setRepairs: (r) => setSheet((s) => ({ ...s, repairs: r })),
    setControleur: (c) => setSheet((s) => ({ ...s, controleur: c })),
    setSignature: (sig) => setSheet((s) => ({ ...s, signature: sig })),
    saveDraft: async () => { await writeKey(DRAFT_KEY, JSON.stringify(sheet)); },
    archiveSheet: async () => {
      const archived: Sheet = { ...sheet, id: Date.now(), savedAt: new Date().toLocaleString('fr-FR') };
      const list = await api.listArchive();
      const next = [archived, ...list].slice(0, 30);
      await writeKey(ARCHIVE_KEY, JSON.stringify(next));
    },
    newSheet: () => {
      const fresh = emptySheet();
      setSheet(fresh);
      writeKey(DRAFT_KEY, JSON.stringify(fresh));
    },
    loadDraft: async () => {
      const raw = await readKey(DRAFT_KEY);
      if (raw) { try { setSheet(JSON.parse(raw)); } catch {} }
    },
    listArchive: async () => {
      const raw = await readKey(ARCHIVE_KEY);
      if (!raw) return [];
      try { return JSON.parse(raw) as Sheet[]; } catch { return []; }
    },
    deleteArchived: async (id) => {
      const list = await api.listArchive();
      await writeKey(ARCHIVE_KEY, JSON.stringify(list.filter((s) => s.id !== id)));
    },
  }), [sheet]);

  return <SheetContext.Provider value={api}>{children}</SheetContext.Provider>;
}

export function useSheet() {
  const ctx = useContext(SheetContext);
  if (!ctx) throw new Error('useSheet doit être utilisé dans <SheetProvider>');
  return ctx;
}
