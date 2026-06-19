// ============================================================
// Capture + compression d'une photo.
// Sur Android (Capacitor) : utilise l'appareil photo natif.
// Dans le navigateur (dev) : ouvre un input file en mode camera.
// Compression : max 900 px côté + qualité 0.7 (cohérent avec le proto web).
// ============================================================

const MAX_SIDE = 900;
const JPEG_QUALITY = 0.7;

// Compresse un dataURL (jpeg/png) en jpeg réduit. Renvoie un dataURL.
export function compressDataUrl(src: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      if (w > h && w > MAX_SIDE) { h = (h * MAX_SIDE) / w; w = MAX_SIDE; }
      else if (h > MAX_SIDE) { w = (w * MAX_SIDE) / h; h = MAX_SIDE; }
      const cv = document.createElement('canvas');
      cv.width = Math.round(w);
      cv.height = Math.round(h);
      cv.getContext('2d')!.drawImage(img, 0, 0, cv.width, cv.height);
      resolve(cv.toDataURL('image/jpeg', JPEG_QUALITY));
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

// Capture une photo. Renvoie un dataURL compressé (jpeg).
export async function capturePhoto(): Promise<string | null> {
  // 1) Essai Capacitor (mobile)
  try {
    const mod = await import('@capacitor/camera').catch(() => null as any);
    if (mod?.Camera) {
      const result = await mod.Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        source: mod.CameraSource?.Camera ?? 'CAMERA',
        resultType: mod.CameraResultType?.DataUrl ?? 'dataUrl',
      });
      if (result?.dataUrl) return await compressDataUrl(result.dataUrl);
    }
  } catch {
    // l'utilisateur a annulé / pas la permission : on retombe sur input file
  }

  // 2) Fallback navigateur / dev
  return await pickFile();
}

function pickFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.setAttribute('capture', 'environment');
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const src = String(ev.target?.result || '');
        if (!src) return resolve(null);
        resolve(await compressDataUrl(src));
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    };
    input.click();
  });
}
