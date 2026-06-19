// Barre de progression linéaire (0 → 100%). Affichée en haut des écrans d'inspection.

import { SECTIONS } from '../data/sections';

// Ordre des étapes (mêmes ids que dans le router). 12 étapes au total.
export const FLOW_STEPS = [
  'home',
  'identification',
  ...SECTIONS.map((s) => s.id),
  'photos',
  'bilan',
  'recap',
];

export function progressPercent(currentStep: string): number {
  const idx = FLOW_STEPS.indexOf(currentStep);
  if (idx <= 0) return 0;
  // l'accueil ne compte pas dans la progression effective.
  return Math.round(((idx) / (FLOW_STEPS.length - 1)) * 100);
}

export function ProgressBar({ step }: { step: string }) {
  const p = progressPercent(step);
  return (
    <div className="progress-bar" aria-label={`Progression ${p}%`}>
      <div style={{ width: `${p}%` }} />
    </div>
  );
}
