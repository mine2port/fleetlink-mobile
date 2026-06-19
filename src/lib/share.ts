// ============================================================
// Partage du PDF généré via la feuille de partage native Android
// (permet d'envoyer vers WhatsApp en pièce jointe).
// Fallback navigateur : téléchargement classique.
// ============================================================

export async function sharePdf(blob: Blob, filename: string, dataUrl: string): Promise<void> {
  // 1) Capacitor (mobile) : on écrit le fichier dans le Filesystem puis on partage l'URI.
  try {
    const fsMod = await import('@capacitor/filesystem').catch(() => null as any);
    const shareMod = await import('@capacitor/share').catch(() => null as any);
    if (fsMod?.Filesystem && shareMod?.Share) {
      const base64 = dataUrl.split(',')[1];
      const path = filename;
      const writeRes = await fsMod.Filesystem.writeFile({
        path,
        data: base64,
        directory: fsMod.Directory?.Cache ?? 'CACHE',
        recursive: true,
      });
      const fileUri = writeRes.uri;
      await shareMod.Share.share({
        title: filename,
        text: 'Fiche d\'état de lieu — FleetLink',
        url: fileUri,
        dialogTitle: 'Partager la fiche',
      });
      return;
    }
  } catch (e) {
    console.warn('Capacitor share KO, fallback navigateur', e);
  }

  // 2) Web Share API (PC compatible)
  try {
    if (typeof navigator !== 'undefined' && (navigator as any).canShare) {
      const file = new File([blob], filename, { type: 'application/pdf' });
      if ((navigator as any).canShare({ files: [file] })) {
        await (navigator as any).share({ files: [file], title: filename });
        return;
      }
    }
  } catch {}

  // 3) Fallback dev : téléchargement
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
