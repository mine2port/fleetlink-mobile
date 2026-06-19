// ============================================================
// Rasterise le logo FleetLink et le cachet (SVG) en PNG dataURL
// au démarrage de l'app, pour pouvoir les embarquer dans le PDF
// (jsPDF n'accepte pas le SVG directement).
// Tant que le rendu n'est pas prêt, on renvoie un PNG transparent 1x1
// pour éviter les crashes — le PDF se génère sans crash mais sans visuel.
// ============================================================

// Placeholder transparent 1x1 (PNG) en attendant la rasterisation.
const PLACEHOLDER_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

export let LOGO_PNG_DATAURL: string = PLACEHOLDER_PNG;
export let CACHET_PNG_DATAURL: string = PLACEHOLDER_PNG;

// Charge un SVG via fetch + rasterise en PNG dataURL via canvas.
async function svgToPng(svgUrl: string, size: number): Promise<string> {
  try {
    const res = await fetch(svgUrl);
    const svgText = await res.text();
    const blob = new Blob([svgText], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const png = await new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const cv = document.createElement('canvas');
        cv.width = size; cv.height = size;
        cv.getContext('2d')!.drawImage(img, 0, 0, size, size);
        URL.revokeObjectURL(url);
        resolve(cv.toDataURL('image/png'));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('SVG load failed')); };
      img.src = url;
    });
    return png;
  } catch (e) {
    console.warn('svgToPng KO', svgUrl, e);
    return PLACEHOLDER_PNG;
  }
}

// À appeler une fois au démarrage de l'app.
export async function loadBranding(): Promise<void> {
  // 512 px : suffisant pour un PDF A4 sans flou.
  const [logo, cachet] = await Promise.all([
    svgToPng('/logo-fleetlink.svg', 512),
    svgToPng('/cachet-fleetlink.svg', 400),
  ]);
  LOGO_PNG_DATAURL = logo;
  CACHET_PNG_DATAURL = cachet;
}
