// Types partagés du formulaire d'inspection FleetLink.

// Réponse à un point de contrôle d'une section.
export type ItemAnswer = {
  state: string;   // valeur cochée (ex: 'BON', 'Fonctionne', etc.) — vide tant que non répondu
  obs: string;     // observation libre
  photos: string[]; // photos data:image/jpeg;base64,... pour ce point
};

// Bloc "Société" : utilisé pour les 2 parties de l'état des lieux
// (propriétaire qui loue le camion, locataire qui le reçoit).
export type Company = {
  name: string;          // raison sociale
  representative: string; // nom du représentant qui signe / accompagne
  phone: string;          // téléphone (utile en cas de litige)
  place: string;          // lieu (chantier / site / port) de remise ou réception
};

// Verdict d'un point de contrôle au RETOUR (par rapport au DÉPART).
// 'OK' = identique ; 'DIFFERENCE' = changement non préjudiciable ; 'DOMMAGE' = dégradation.
export type CompareVerdict = '' | 'OK' | 'DIFFERENCE' | 'DOMMAGE';

// Snapshot minimal d'une fiche DÉPART, embarqué dans la fiche RETOUR pour permettre le comparatif visuel.
export type SheetDepartSnapshot = {
  id: number;
  date: string;
  matricule: string;
  km: string;
  hmot: string;
  answers: Record<string, ItemAnswer[]>;
};

// État complet d'une fiche d'inspection (sauvegardable + exportable PDF).
export type Sheet = {
  id: number;                       // timestamp (clé locale)
  // === FleetLink : sens de l'état des lieux ===
  kind: 'DEPART' | 'RETOUR';        // DÉPART = remise au locataire ; RETOUR = restitution
  contractId?: string;              // identifiant du contrat de location (côté FleetLink web)
  relatedSheetId?: number;          // pour un RETOUR : id de la fiche DÉPART correspondante
  // Parties de l'état des lieux
  sender: Company;                  // propriétaire / bailleur
  receiver: Company;                // locataire / preneur
  // Identification du camion
  matricule: string;
  parc: string;
  km: string;
  hmot: string;
  date: string;
  chauffeur: string;
  // Réponses : answers[sectionId][itemIndex] = ItemAnswer
  answers: Record<string, ItemAnswer[]>;
  // Photos de la galerie obligatoire (12 vues), indexées par leur position dans GALLERY_PHOTOS
  galleryPhotos: string[][];
  // Bilan + signature
  bilan: string;
  repairs: string;
  controleur: string;
  signature: string; // data:image/png;base64,...
  // === FleetLink RETOUR : comparatif vs DÉPART ===
  // compare[sectionId][itemIndex] = 'OK' | 'DIFFERENCE' | 'DOMMAGE' | ''
  compare?: Record<string, CompareVerdict[]>;
  departSnapshot?: SheetDepartSnapshot;
  // === FleetLink couche cloud (optionnel, géré par sync-queue) ===
  cloudId?: string;                 // id retourné par l'API quand uploadé
  cloudStatus?: 'PENDING' | 'SENT' | 'ERROR';
  cloudError?: string;
  // Métadonnées
  savedAt: string;
};
