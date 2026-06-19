// ============================================================
// Génération du PDF de la fiche d'inspection.
// Mise en page reproduite fidèlement depuis le proto :
//   en-tête vert pétrole + logo FleetLink, bandeau attestation,
//   identification, tableau par section coloré, bilan,
//   bloc bas signature + cachet, page photos.
// Pour un EDL RETOUR : une page comparative DÉPART vs RETOUR est
// insérée juste après l'identification (cf. sheet.compare).
// Bibliothèque : jsPDF (embarquée dans l'APK, fonctionne hors-ligne).
// ============================================================

import { jsPDF } from 'jspdf';
import { SECTIONS, GALLERY_PHOTOS, answerClass, classRGB } from '../data/sections';
import type { Sheet } from './types';
import { LOGO_PNG_DATAURL, CACHET_PNG_DATAURL } from '../assets/branding';

const NAVY: [number, number, number] = [15, 94, 94];      // #0F5E5E vert pétrole FleetLink
const ORANGE: [number, number, number] = [184, 92, 0];    // #B85C00 ambre FleetLink
const LIGHT: [number, number, number] = [247, 249, 248];
const GREY: [number, number, number] = [91, 107, 107];

function hex2rgb(h: string): [number, number, number] {
  h = h.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

// Génère le PDF et renvoie le Blob ainsi qu'un nom de fichier suggéré.
export async function buildPdf(sheet: Sheet): Promise<{ blob: Blob; filename: string; dataUrl: string }> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const PW = 210, M = 12;
  let y = 0;

  // ------ Bandeau en-tête ------
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PW, 26, 'F');
  try { doc.addImage(LOGO_PNG_DATAURL, 'PNG', M, 3, 20, 20); } catch {}
  doc.setTextColor(255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  const kindLabel = sheet.kind === 'RETOUR' ? 'EDL RETOUR' : 'EDL DÉPART';
  doc.text(`FICHE D'ÉTAT DES LIEUX CAMION — ${kindLabel}`, M + 24, 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('FleetLink — Location de camions', M + 24, 15.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 220, 195);
  doc.text('RAPPORT CONTRADICTOIRE DE REMISE / RESTITUTION', M + 24, 21);
  y = 32;

  // ------ Bandeau d'attestation ------
  doc.setFillColor(255, 244, 230);
  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(0.4);
  doc.roundedRect(M, y, PW - 2 * M, 9, 1.5, 1.5, 'FD');
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.6);
  doc.text(
    sheet.kind === 'RETOUR'
      ? "État des lieux RETOUR contradictoire — restitution du véhicule loué via FleetLink, comparé à l'état des lieux DÉPART."
      : "État des lieux DÉPART contradictoire — remise du véhicule loué via FleetLink, point de référence pour le retour.",
    PW / 2, y + 5.6, { align: 'center', maxWidth: PW - 2 * M - 6 }
  );
  y += 13;

  // ------ Parties à l'état de lieu (Expéditrice / Réceptrice) ------
  const partiesH = 26;
  const halfP = (PW - 2 * M - 4) / 2; // 2 colonnes
  // Bloc Propriétaire (gauche)
  doc.setFillColor(...LIGHT); doc.setDrawColor(...NAVY); doc.setLineWidth(0.4);
  doc.roundedRect(M, y, halfP, partiesH, 2, 2, 'FD');
  doc.setFillColor(...NAVY); doc.rect(M, y, 2, partiesH, 'F');
  doc.setTextColor(...NAVY); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
  doc.text('PROPRIÉTAIRE / BAILLEUR (loue le camion)', M + 4, y + 5);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.2);
  doc.text('Raison sociale : ' + (sheet.sender.name || '-'),       M + 4, y + 11);
  doc.text('Représentant : '   + (sheet.sender.representative || '-'), M + 4, y + 15.5);
  doc.text('Téléphone : '      + (sheet.sender.phone || '-'),       M + 4, y + 20);
  doc.text('Lieu : '           + (sheet.sender.place || '-'),       M + 4, y + 24.5);
  // Bloc Réceptrice (droite)
  const rx = M + halfP + 4;
  doc.setFillColor(...LIGHT); doc.setDrawColor(...NAVY);
  doc.roundedRect(rx, y, halfP, partiesH, 2, 2, 'FD');
  doc.setFillColor(...ORANGE); doc.rect(rx, y, 2, partiesH, 'F');
  doc.setTextColor(...NAVY); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
  doc.text('LOCATAIRE / PRENEUR (reçoit / contrôle)', rx + 4, y + 5);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.2);
  doc.text('Raison sociale : ' + (sheet.receiver.name || '-'),       rx + 4, y + 11);
  doc.text('Représentant : '   + (sheet.receiver.representative || '-'), rx + 4, y + 15.5);
  doc.text('Téléphone : '      + (sheet.receiver.phone || '-'),       rx + 4, y + 20);
  doc.text('Lieu : '           + (sheet.receiver.place || '-'),       rx + 4, y + 24.5);
  y += partiesH + 4;

  // ------ Identification (3 colonnes) ------
  doc.setFillColor(...LIGHT);
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.4);
  doc.roundedRect(M, y, PW - 2 * M, 22, 2, 2, 'FD');
  doc.setTextColor(...NAVY);
  doc.setFontSize(9);
  const idColW = (PW - 2 * M) / 3;
  const idf: [string, string][] = [
    ['Matricule', sheet.matricule || '-'],
    ['N° Parc', sheet.parc || '-'],
    ['Date', sheet.date || '-'],
    ['Kilométrage', (sheet.km || '-') + ' km'],
    ['Heures moteur', (sheet.hmot || '-') + ' h'],
    ['Chauffeur', sheet.chauffeur || '-'],
  ];
  idf.forEach((f, i) => {
    const cx = M + 4 + (i % 3) * idColW;
    const cy = y + 7 + Math.floor(i / 3) * 9;
    doc.setFont('helvetica', 'bold'); doc.text(f[0] + ' :', cx, cy);
    doc.setFont('helvetica', 'normal');
    const offset = i % 3 === 2 ? 16 : (f[0] === 'Kilométrage' || f[0] === 'Heures moteur' ? 26 : 22);
    doc.text(String(f[1]), cx + offset, cy);
  });
  y += 27;

  // ------ Page comparative DÉPART vs RETOUR (uniquement pour EDL RETOUR) ------
  if (sheet.kind === 'RETOUR' && sheet.compare && Object.keys(sheet.compare).length > 0) {
    doc.addPage();
    // Bandeau titre
    doc.setFillColor(...NAVY); doc.rect(0, 0, PW, 14, 'F');
    doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
    doc.text('COMPARATIF DÉPART vs RETOUR', M, 9);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text('Différences relevées entre l\'EDL DÉPART et l\'EDL RETOUR du même contrat', M, 13);
    let py = 22;

    // Tête de tableau
    const cLabel = M, wL = 80;
    const cDep = cLabel + wL, wD = 22;
    const cRet = cDep + wD, wR = 22;
    const cVerd = cRet + wR, wV = PW - M - cVerd;
    doc.setFillColor(...LIGHT); doc.rect(cLabel, py, PW - 2*M, 7, 'F');
    doc.setTextColor(...NAVY); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
    doc.text('POINT CONTRÔLÉ', cLabel + 2, py + 4.7);
    doc.text('DÉPART', cDep + wD/2, py + 4.7, { align: 'center' });
    doc.text('RETOUR', cRet + wR/2, py + 4.7, { align: 'center' });
    doc.text('VERDICT', cVerd + wV/2, py + 4.7, { align: 'center' });
    py += 8;

    for (const sec of SECTIONS) {
      const items = sheet.answers[sec.id] || [];
      const compSec = sheet.compare[sec.id] || [];
      // Saute la section si rien de notable
      const hasDiff = compSec.some(v => v && v !== 'OK');
      if (!hasDiff) continue;

      if (py > 270) { doc.addPage(); py = 15; }
      // Titre section
      doc.setFillColor(...hex2rgb(sec.color));
      doc.rect(cLabel, py, PW - 2*M, 5, 'F');
      doc.setTextColor(...NAVY); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
      doc.text(sec.title.toUpperCase(), cLabel + 2, py + 3.6);
      py += 5;

      sec.items.forEach((it, idx) => {
        const verdict = compSec[idx];
        if (!verdict || verdict === 'OK') return; // seules les différences/dommages
        if (py > 273) { doc.addPage(); py = 15; }
        const dep = sheet.departSnapshot?.answers[sec.id]?.[idx]?.state || '—';
        const ret = items[idx]?.state || '—';

        doc.setDrawColor(220); doc.setLineWidth(0.2);
        doc.rect(cLabel, py, wL, 6); doc.rect(cDep, py, wD, 6);
        doc.rect(cRet, py, wR, 6); doc.rect(cVerd, py, wV, 6);

        doc.setTextColor(40); doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
        doc.text(doc.splitTextToSize(it.label, wL - 3), cLabel + 2, py + 4);
        const depC = classRGB(answerClass(it.type, dep));
        doc.setTextColor(...depC); doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5);
        doc.text(dep, cDep + wD/2, py + 4, { align: 'center' });
        const retC = classRGB(answerClass(it.type, ret));
        doc.setTextColor(...retC);
        doc.text(ret, cRet + wR/2, py + 4, { align: 'center' });
        // verdict coloré
        const vColor: [number, number, number] = verdict === 'DOMMAGE' ? [192, 39, 26] : [201, 138, 0];
        doc.setTextColor(...vColor); doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
        doc.text(verdict, cVerd + wV/2, py + 4, { align: 'center' });
        py += 6;
      });
      py += 2;
    }
    if (py < 30) {
      doc.setTextColor(...GREY); doc.setFont('helvetica', 'italic'); doc.setFontSize(9);
      doc.text('Aucune différence relevée entre le DÉPART et le RETOUR.', PW / 2, 40, { align: 'center' });
    }
  }

  // ------ Sections en tableau ------
  const xLabel = M, wLabel = 88;
  const xState = M + wLabel, wState = 24;
  const xObs = xState + wState, wObs = PW - M - xObs;

  doc.setFontSize(8);
  for (const sec of SECTIONS) {
    const items = sheet.answers[sec.id] || [];
    const bg = hex2rgb(sec.color);
    if (y > 262) { doc.addPage(); y = 15; }
    // Bandeau titre de section (fond clair + barre d'accent navy)
    doc.setFillColor(...bg); doc.rect(M, y, PW - 2 * M, 6, 'F');
    doc.setFillColor(...NAVY); doc.rect(M, y, 2, 6, 'F');
    doc.setTextColor(...NAVY); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
    doc.text(sec.title.toUpperCase(), M + 4, y + 4.2);
    doc.setFontSize(7); doc.text('ÉTAT', xState + 2, y + 4.2); doc.text('OBSERVATIONS', xObs + 2, y + 4.2);
    y += 6;

    sec.items.forEach((it, idx) => {
      if (y > 270) { doc.addPage(); y = 15; }
      const ans = items[idx] || { state: '', obs: '', photos: [] };
      const st = ans.state;
      const ob = ans.obs;
      const rowH = Math.max(6, doc.splitTextToSize(ob || '', wObs - 4).length * 3.5 + 2.5);
      // teinte de ligne (atténuation de la couleur de section)
      const tint: [number, number, number] = [
        Math.round((bg[0] + 255 * 2) / 3),
        Math.round((bg[1] + 255 * 2) / 3),
        Math.round((bg[2] + 255 * 2) / 3),
      ];
      doc.setFillColor(...tint); doc.rect(xLabel, y, PW - 2 * M, rowH, 'F');
      doc.setDrawColor(200); doc.setLineWidth(0.2);
      doc.rect(xLabel, y, wLabel, rowH);
      doc.rect(xState, y, wState, rowH);
      doc.rect(xObs, y, wObs, rowH);
      doc.setTextColor(40); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.8);
      doc.text(doc.splitTextToSize(it.label, wLabel - 4), xLabel + 2, y + 4);
      const sc = classRGB(answerClass(it.type, st));
      doc.setTextColor(...sc); doc.setFont('helvetica', 'bold'); doc.setFontSize(6.6);
      doc.text(doc.splitTextToSize(st || '—', wState - 2), xState + wState / 2, y + 3.5, { align: 'center' });
      doc.setFontSize(7.8);
      doc.setTextColor(80); doc.setFont('helvetica', 'normal');
      if (ob) doc.text(doc.splitTextToSize(ob, wObs - 4), xObs + 2, y + 4);
      y += rowH;
    });
    y += 2;
  }
  y += 2;

  // ------ Bilan ------
  if (y > 250) { doc.addPage(); y = 15; }
  const bil = sheet.bilan;
  const bc: [number, number, number] = bil === 'APTE AU SERVICE' ? [26, 122, 58]
    : bil === 'IMMOBILISÉ' ? [192, 39, 26]
    : bil ? [201, 138, 0] : GREY;
  doc.setFillColor(...bc); doc.roundedRect(M, y, PW - 2 * M, 9, 2, 2, 'F');
  doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text('BILAN : ' + (bil || 'NON RENSEIGNÉ'), PW / 2, y + 6, { align: 'center' });
  y += 13;
  doc.setTextColor(...NAVY); doc.setFontSize(8.5);
  if (sheet.repairs) {
    doc.setFont('helvetica', 'bold'); doc.text('Réparations à prévoir :', M, y); y += 4;
    doc.setFont('helvetica', 'normal');
    const rl = doc.splitTextToSize(sheet.repairs, PW - 2 * M);
    doc.text(rl, M, y); y += rl.length * 4 + 2;
  }
  y += 2;

  // ------ Bloc signatures (Expéditrice + Réceptrice) + cachet ------
  if (y > 215) { doc.addPage(); y = 20; }
  const blkY = y, blkH = 50;
  // 3 colonnes égales : Expéditrice | Réceptrice (signe électroniquement) | Cachet
  const gap = 4;
  const colW = (PW - 2 * M - gap * 2) / 3;

  // Helper : cadre signature pour une partie (expéditrice ou réceptrice).
  const drawSigBox = (
    x: number,
    title: string,
    company: { name: string; representative: string },
    accent: [number, number, number],
    sigDataUrl?: string,
  ) => {
    doc.setDrawColor(...NAVY); doc.setLineWidth(0.4);
    doc.roundedRect(x, blkY, colW, blkH, 2, 2, 'D');
    doc.setFillColor(...accent); doc.rect(x, blkY, 2, blkH, 'F'); // barre d'accent
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.2); doc.setTextColor(...NAVY);
    doc.text(title, x + 4, blkY + 5.5, { maxWidth: colW - 6 });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.8);
    const repreLines = doc.splitTextToSize('Représentant : ' + (company.representative || '-'), colW - 6);
    doc.text(repreLines, x + 4, blkY + 11);
    const yAfterName = 11 + repreLines.length * 3.5;
    doc.text('Date : ' + (sheet.date || '-'), x + 4, blkY + yAfterName + 2);
    // Zone signature dessinée (vide pour l'expéditrice = à signer sur papier)
    const sigTop = blkY + yAfterName + 6;
    const sigBoxH = blkH - (yAfterName + 6) - 6;
    doc.setDrawColor(200); doc.rect(x + 4, sigTop, colW - 8, sigBoxH, 'D');
    if (sigDataUrl) {
      try { doc.addImage(sigDataUrl, 'PNG', x + 6, sigTop + 1, colW - 12, sigBoxH - 2); } catch {}
    }
    doc.setFontSize(6.4); doc.setTextColor(...GREY);
    doc.text('Signature', x + 4, blkY + blkH - 2);
  };

  // 1) Propriétaire (cadre signature vide à parapher sur impression papier)
  drawSigBox(
    M,
    'PROPRIÉTAIRE — ' + (sheet.sender.name || 'À renseigner'),
    sheet.sender,
    NAVY,
  );
  // 2) Locataire — porte la signature électronique (= agent terrain FleetLink qui a rempli la fiche)
  const x2 = M + colW + gap;
  drawSigBox(
    x2,
    'LOCATAIRE — ' + (sheet.receiver.name || 'À renseigner'),
    { name: sheet.receiver.name, representative: sheet.receiver.representative || sheet.controleur },
    ORANGE,
    sheet.signature || undefined,
  );
  // 3) Cachet officiel FleetLink
  const x3 = x2 + colW + gap;
  doc.setDrawColor(...NAVY); doc.setLineWidth(0.4);
  doc.roundedRect(x3, blkY, colW, blkH, 2, 2, 'D');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.2); doc.setTextColor(...NAVY);
  doc.text('Cachet officiel', x3 + 4, blkY + 5.5);
  try {
    const sz = Math.min(colW - 8, blkH - 12);
    doc.addImage(CACHET_PNG_DATAURL, 'PNG', x3 + (colW - sz) / 2, blkY + 8, sz, sz);
  } catch {}
  y = blkY + blkH + 4;
  doc.setFontSize(6.5); doc.setTextColor(...GREY);
  doc.text(
    'Document généré électroniquement via FleetLink Terrain — ' + new Date().toLocaleString('fr-FR'),
    PW / 2, y, { align: 'center' }
  );

  // ------ Page photos ------
  const allPhotos: { label: string; src: string }[] = [];
  GALLERY_PHOTOS.forEach((label, i) => {
    (sheet.galleryPhotos[i] || []).forEach((src, j) => allPhotos.push({ label: `${label} ${j + 1}`, src }));
  });
  SECTIONS.forEach((sec) => {
    (sheet.answers[sec.id] || []).forEach((ans, idx) => {
      ans.photos.forEach((src, j) => allPhotos.push({ label: `${sec.title} — ${sec.items[idx].label} ${j + 1}`, src }));
    });
  });

  if (allPhotos.length) {
    doc.addPage();
    doc.setFillColor(...NAVY); doc.rect(0, 0, PW, 12, 'F');
    doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text('PHOTOS DE L\'INSPECTION', M, 8);
    let py = 18;
    const photoW = 86, photoH = 64, gap = 4;
    let col = 0;
    for (const p of allPhotos) {
      if (py + photoH > 285) { doc.addPage(); py = 15; col = 0; }
      const px = M + col * (photoW + gap);
      try {
        doc.addImage(p.src, 'JPEG', px, py, photoW, photoH, undefined, 'FAST');
      } catch {}
      doc.setTextColor(...NAVY); doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
      doc.text(doc.splitTextToSize(p.label, photoW), px, py + photoH + 3);
      col++;
      if (col >= 2) { col = 0; py += photoH + 10; }
    }
  }

  // ------ Sortie ------
  const blob = doc.output('blob');
  const dataUrl = doc.output('datauristring');
  const safe = (sheet.matricule || 'fiche').replace(/[^A-Za-z0-9_-]/g, '_');
  const kindSuffix = sheet.kind === 'RETOUR' ? 'RETOUR' : 'DEPART';
  const filename = `FleetLink_EDL_${kindSuffix}_${safe}_${(sheet.date || '').replace(/-/g, '')}.pdf`;
  return { blob, filename, dataUrl };
}
