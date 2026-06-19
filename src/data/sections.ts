// =============================================================
// DONNÉES MÉTIER — Source de vérité du formulaire d'inspection
// Extrait fidèlement du prototype `controle-camion-howo.html`
// (objets `ANSWER_TYPES`, `SECTIONS`, `PHOTOS`, `SECTION_COLORS`).
// Toute évolution du contenu d'inspection se fait ICI.
// =============================================================

// Types de réponses possibles pour un point de contrôle.
// `bad: true` signale la valeur qui rend la photo obligatoire (réponse négative).
export type AnswerOption = { value: string; cls: 'bon' | 'moy' | 'mauv'; bad?: boolean };

export const ANSWER_TYPES: Record<string, AnswerOption[]> = {
  etat: [
    { value: 'BON', cls: 'bon' },
    { value: 'MOYEN', cls: 'moy' },
    { value: 'MAUVAIS', cls: 'mauv', bad: true },
  ],
  fonctionne: [
    { value: 'Fonctionne', cls: 'bon' },
    { value: 'Ne fonctionne pas', cls: 'mauv', bad: true },
  ],
  dispo: [
    { value: 'Disponible', cls: 'bon' },
    { value: 'Pas disponible', cls: 'mauv', bad: true },
  ],
  niveau: [
    { value: 'Max', cls: 'bon' },
    { value: 'Moyen', cls: 'moy' },
    { value: 'Faible', cls: 'mauv', bad: true },
  ],
  vidange: [
    { value: 'Faite', cls: 'bon' },
    { value: 'À faire', cls: 'moy', bad: true },
  ],
  filtre: [
    { value: 'OK', cls: 'bon' },
    { value: 'À remplacer', cls: 'mauv', bad: true },
  ],
  fuite: [
    { value: 'Non', cls: 'bon' },
    { value: 'Oui', cls: 'mauv', bad: true },
  ],
  graissage: [
    { value: 'Fait', cls: 'bon' },
    { value: 'À faire', cls: 'moy', bad: true },
  ],
  boite: [
    { value: 'Fonctionne bien', cls: 'bon' },
    { value: 'Vitesse passe pas', cls: 'mauv', bad: true },
  ],
  presence: [
    { value: 'Existe', cls: 'bon' },
    { value: 'Absent', cls: 'mauv', bad: true },
  ],
};

// Description d'un point de contrôle au sein d'une section.
// `photo: true` => photo TOUJOURS obligatoire pour ce point, quel que soit l'état.
export type ControlItem = {
  label: string;
  alwaysPhoto: boolean;
  type: keyof typeof ANSWER_TYPES;
  obsHint?: string;
};

export type Section = {
  id: string;          // slug utilisé dans l'URL et le stockage
  title: string;       // titre affiché
  color: string;       // couleur de fond claire de la section (cohérent avec le PDF)
  items: ControlItem[];
};

// Sections d'inspection (mêmes contenu/ordre que le prototype web).
export const SECTIONS: Section[] = [
  {
    id: 'carrosserie',
    title: 'Carrosserie & Cabine',
    color: '#EAF2FC',
    items: [
      { label: 'État des portes', alwaysPhoto: false, type: 'etat' },
      { label: 'État de la cabine', alwaysPhoto: true, type: 'etat' },
      { label: 'État des rétroviseurs', alwaysPhoto: false, type: 'etat' },
      { label: 'Pare-brise (fissures)', alwaysPhoto: false, type: 'etat' },
      { label: 'Essuie-glaces', alwaysPhoto: false, type: 'fonctionne' },
      { label: 'Vitres / lève-vitres', alwaysPhoto: false, type: 'fonctionne' },
      { label: 'Klaxon', alwaysPhoto: false, type: 'fonctionne' },
      { label: 'Liquide lave-glace', alwaysPhoto: false, type: 'dispo' },
    ],
  },
  {
    id: 'pneumatiques',
    title: 'Pneumatiques (8x4)',
    color: '#E9F7EF',
    items: [
      { label: 'Essieu 1 AV - Pneu Gauche', alwaysPhoto: true, type: 'etat' },
      { label: 'Essieu 1 AV - Pneu Droit', alwaysPhoto: true, type: 'etat' },
      { label: 'Essieu 2 AV - Pneu Gauche', alwaysPhoto: true, type: 'etat' },
      { label: 'Essieu 2 AV - Pneu Droit', alwaysPhoto: true, type: 'etat' },
      { label: 'Essieu 3 AR - Jumelé Gauche (ext+int)', alwaysPhoto: true, type: 'etat' },
      { label: 'Essieu 3 AR - Jumelé Droit (ext+int)', alwaysPhoto: true, type: 'etat' },
      { label: 'Essieu 4 AR - Jumelé Gauche (ext+int)', alwaysPhoto: true, type: 'etat' },
      { label: 'Essieu 4 AR - Jumelé Droit (ext+int)', alwaysPhoto: true, type: 'etat' },
      { label: 'Pression générale des pneus', alwaysPhoto: false, type: 'etat' },
      { label: 'Serrage écrous de roue (tous)', alwaysPhoto: false, type: 'etat' },
      { label: 'État des jantes', alwaysPhoto: false, type: 'etat' },
      { label: 'Pneu de secours (présent O/N)', alwaysPhoto: true, type: 'presence' },
    ],
  },
  {
    id: 'moteur',
    title: 'Mécanique moteur',
    color: '#FFF4E6',
    items: [
      { label: 'État général moteur', alwaysPhoto: true, type: 'etat' },
      { label: "Niveau d'huile moteur", alwaysPhoto: false, type: 'niveau' },
      { label: "Niveau d'eau / refroidissement", alwaysPhoto: false, type: 'niveau' },
      { label: 'Niveau liquide de frein', alwaysPhoto: false, type: 'niveau' },
      { label: 'Vidange', alwaysPhoto: false, type: 'vidange' },
      { label: 'Filtres (air, huile, gasoil)', alwaysPhoto: false, type: 'filtre' },
      { label: 'Fuites (huile / eau / gasoil)', alwaysPhoto: false, type: 'fuite' },
      { label: 'Courroies', alwaysPhoto: false, type: 'etat' },
      { label: 'Batterie (état + bornes)', alwaysPhoto: false, type: 'etat' },
      { label: 'Graissage (points de graissage)', alwaysPhoto: false, type: 'graissage' },
      { label: 'Huile de pont (essieux)', alwaysPhoto: false, type: 'niveau' },
      { label: 'Huile de boîte de vitesses', alwaysPhoto: false, type: 'niveau' },
      {
        label: 'État de boîte de vitesses',
        alwaysPhoto: false,
        type: 'boite',
        obsHint: "Si vitesse passe pas : préciser laquelle dans l'observation",
      },
    ],
  },
  {
    id: 'freinage',
    title: 'Freinage & Suspension',
    color: '#FDEBEC',
    items: [
      { label: 'Frein à pied', alwaysPhoto: false, type: 'fonctionne' },
      { label: 'Frein moteur', alwaysPhoto: false, type: 'fonctionne' },
      { label: 'Frein à main / parking', alwaysPhoto: false, type: 'fonctionne' },
      { label: "Circuit d'air (pression/fuites)", alwaysPhoto: false, type: 'etat' },
      { label: 'Ressorts à lames', alwaysPhoto: true, type: 'etat' },
      { label: 'Amortisseurs', alwaysPhoto: false, type: 'etat' },
      { label: 'Châssis (boulons cassés/desserrés)', alwaysPhoto: true, type: 'etat' },
      { label: 'Cardans / transmission', alwaysPhoto: false, type: 'etat' },
    ],
  },
  {
    id: 'eclairage',
    title: 'Éclairage & Électrique',
    color: '#FFFBE6',
    items: [
      { label: 'Feux avant (phares / codes)', alwaysPhoto: false, type: 'fonctionne' },
      { label: 'Feux arrière / stop', alwaysPhoto: false, type: 'fonctionne' },
      { label: 'Clignotants', alwaysPhoto: false, type: 'fonctionne' },
      { label: 'Feux de détresse (warning)', alwaysPhoto: false, type: 'fonctionne' },
      { label: 'Tableau de bord (voyants)', alwaysPhoto: false, type: 'fonctionne' },
    ],
  },
  {
    id: 'benne',
    title: 'Système benne (hydraulique)',
    color: '#F0EAFB',
    items: [
      { label: 'État de la benne', alwaysPhoto: true, type: 'etat' },
      { label: 'Vérin de levage (montée/descente)', alwaysPhoto: true, type: 'fonctionne' },
      { label: 'Niveau huile hydraulique', alwaysPhoto: false, type: 'niveau' },
      { label: 'Fuites circuit hydraulique', alwaysPhoto: false, type: 'fuite' },
      { label: 'Filtre hydraulique', alwaysPhoto: false, type: 'filtre' },
      { label: 'Pompe hydraulique (bruit/débit)', alwaysPhoto: false, type: 'fonctionne' },
      { label: 'Flexibles & raccords hydrauliques', alwaysPhoto: false, type: 'etat' },
      { label: 'Prise de force (PTO)', alwaysPhoto: false, type: 'fonctionne' },
      { label: 'Vérin de direction / assistance', alwaysPhoto: false, type: 'fonctionne' },
      { label: 'Commande / distributeur benne', alwaysPhoto: false, type: 'fonctionne' },
      { label: 'Verrouillage / hayon arrière', alwaysPhoto: false, type: 'fonctionne' },
      { label: 'Sécurité anti-bennage (béquille)', alwaysPhoto: false, type: 'presence' },
    ],
  },
  {
    id: 'outillage',
    title: 'Outillage & Sécurité',
    color: '#E7F6F8',
    items: [
      { label: 'Cric / crique', alwaysPhoto: false, type: 'presence' },
      { label: 'Clés de roue + kit', alwaysPhoto: false, type: 'presence' },
      { label: 'Câbles de démarrage', alwaysPhoto: false, type: 'presence' },
      { label: 'Triangle de signalisation', alwaysPhoto: false, type: 'presence' },
      { label: 'Extincteur (présent + date)', alwaysPhoto: false, type: 'presence' },
      { label: 'Boîte sécurité / pharmacie', alwaysPhoto: false, type: 'presence' },
      { label: 'Gilet réfléchissant', alwaysPhoto: false, type: 'presence' },
    ],
  },
];

// 12 photos obligatoires de la galerie générale (état des lieux + détails).
export const GALLERY_PHOTOS: string[] = [
  'État des lieux - Avant',
  'État des lieux - Arrière',
  'État des lieux - Côté gauche',
  'État des lieux - Côté droit',
  'Cabine',
  'Moteur',
  'Benne',
  'Châssis',
  'Pneus',
  'Ressorts à lames',
  'Pneu de secours',
  'Tableau de bord',
];

// Choix de bilan (mêmes valeurs que le proto pour cohérence PDF).
export const BILAN_OPTIONS = [
  { value: 'APTE AU SERVICE', cls: 'bon' as const },
  { value: 'APTE AVEC RÉSERVES', cls: 'moy' as const },
  { value: 'IMMOBILISÉ', cls: 'mauv' as const },
];

// Renvoie la classe couleur (bon/moy/mauv) associée à une valeur pour un type donné.
export function answerClass(type: string, value: string): '' | 'bon' | 'moy' | 'mauv' {
  const opts = ANSWER_TYPES[type] || ANSWER_TYPES.etat;
  const o = opts.find((x) => x.value === value);
  return o ? o.cls : '';
}

// Renvoie true si la valeur cochée force une photo obligatoire pour cet item.
export function isBadAnswer(type: string, value: string): boolean {
  const opts = ANSWER_TYPES[type] || ANSWER_TYPES.etat;
  return !!opts.find((x) => x.value === value && x.bad);
}

export function classRGB(cls: '' | 'bon' | 'moy' | 'mauv'): [number, number, number] {
  if (cls === 'bon') return [26, 122, 58];
  if (cls === 'moy') return [201, 138, 0];
  if (cls === 'mauv') return [192, 39, 26];
  return [140, 140, 140];
}
