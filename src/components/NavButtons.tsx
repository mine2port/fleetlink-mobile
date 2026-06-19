// Boutons "Précédent / Suivant" en bas de chaque écran d'inspection.

import { useNavigate } from 'react-router-dom';
import { FLOW_STEPS } from './ProgressBar';

export function NavButtons({
  currentStep,
  onNext,
  nextLabel = 'Suivant ▸',
  prevLabel = '◂ Précédent',
}: {
  currentStep: string;
  onNext?: () => boolean | void;  // renvoyer false pour bloquer (validation locale)
  nextLabel?: string;
  prevLabel?: string;
}) {
  const nav = useNavigate();
  const idx = FLOW_STEPS.indexOf(currentStep);
  const prev = idx > 0 ? FLOW_STEPS[idx - 1] : null;
  const next = idx >= 0 && idx < FLOW_STEPS.length - 1 ? FLOW_STEPS[idx + 1] : null;

  const goPrev = () => prev && nav(prev === 'home' ? '/' : `/${prev}`);
  const goNext = () => {
    if (onNext) {
      const ok = onNext();
      if (ok === false) return;
    }
    if (next) nav(next === 'home' ? '/' : `/${next}`);
  };

  return (
    <div className="nav-buttons">
      {prev && <button className="btn secondary" onClick={goPrev}>{prevLabel}</button>}
      {next && <button className="btn primary" onClick={goNext}>{nextLabel}</button>}
    </div>
  );
}
