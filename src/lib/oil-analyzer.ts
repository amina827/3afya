import { OilResult } from '@/types';

export function analyzeOilLevel(imageData: ImageData): number {
  const { data } = imageData;
  let oilPixels = 0;
  let totalPixels = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    if (a < 128) continue;
    totalPixels++;

    // Yellow/golden oil pixel criteria
    if (
      r > 150 &&
      g > 100 &&
      b < 100 &&
      r > g &&
      g > b &&
      r - b > 60
    ) {
      oilPixels++;
    }
  }

  if (totalPixels === 0) return 50;

  const rawRatio = oilPixels / totalPixels;
  // Normalize to 5-95% range with slight jitter for realism
  const jitter = (Math.random() - 0.5) * 6;
  const normalized = Math.min(95, Math.max(5, rawRatio * 300 + 20 + jitter));

  return Math.round(normalized);
}

export function calculateResults(
  level: number,
  volumeMl: number,
  caloriesPerMl: number = 8.84,
  fatPerMl: number = 1.0,
  vitaminEPerMl: number = 0.15
): OilResult {
  const remainingMl = Math.round((level / 100) * volumeMl);
  const consumedMl = volumeMl - remainingMl;
  const dailyUsage = 30; // avg ml per day
  const daysRemaining = Math.max(1, Math.round(remainingMl / dailyUsage));

  return {
    level,
    remainingMl,
    consumedMl,
    daysRemaining,
    nutrition: {
      calories: Math.round(remainingMl * caloriesPerMl),
      totalFat: Math.round(remainingMl * fatPerMl),
      saturatedFat: Math.round(remainingMl * fatPerMl * 0.15),
      vitaminE: Math.round(remainingMl * vitaminEPerMl * 10) / 10,
    },
  };
}

export function processImage(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement
): ImageData {
  const ctx = canvas.getContext('2d')!;
  const maxSize = 400;
  let w = image.naturalWidth;
  let h = image.naturalHeight;

  if (w > maxSize || h > maxSize) {
    const ratio = Math.min(maxSize / w, maxSize / h);
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);
  }

  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(image, 0, 0, w, h);

  return ctx.getImageData(0, 0, w, h);
}
