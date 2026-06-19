// Mini QR code natif sans dépendance (pattern décoratif réaliste).
// V1 placeholder fidèle maquette (motif damier). Pour vrai QR scannable :
// remplacer par lib `qrcode` (npm install qrcode + types) plus tard.
import { useMemo } from 'react';

interface Props {
  value: string;
  size?: number;
}

export function QrCode({ value, size = 140 }: Props) {
  // Génère une matrice pseudo-aléatoire déterministe basée sur la valeur (visuellement "QR-like")
  const grid = useMemo(() => {
    const N = 21; // QR v1 = 21x21
    const cells: boolean[][] = [];
    // Hash simple de la value
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
    }
    for (let y = 0; y < N; y++) {
      const row: boolean[] = [];
      for (let x = 0; x < N; x++) {
        // Coins finder pattern (7x7 carrés noirs)
        const isFinder =
          (x < 7 && y < 7) ||
          (x >= N - 7 && y < 7) ||
          (x < 7 && y >= N - 7);
        if (isFinder) {
          const lx = x < 7 ? x : N - 1 - x;
          const ly = y < 7 ? y : N - 1 - y;
          const onBorder = lx === 0 || lx === 6 || ly === 0 || ly === 6;
          const onCenter = lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4;
          row.push(onBorder || onCenter);
        } else {
          const v = (hash + x * 17 + y * 23 + x * y) & 0xff;
          row.push(v > 128);
        }
      }
      cells.push(row);
    }
    return cells;
  }, [value]);

  const cellSize = size / 21;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={`QR code: ${value}`}>
      <rect width={size} height={size} fill="#fff" />
      {grid.map((row, y) =>
        row.map((on, x) =>
          on ? (
            <rect
              key={`${x}-${y}`}
              x={x * cellSize}
              y={y * cellSize}
              width={cellSize}
              height={cellSize}
              fill="#0c1e1e"
            />
          ) : null
        )
      )}
    </svg>
  );
}
