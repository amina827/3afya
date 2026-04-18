export interface DetectionLike {
  centroidTop: number;    // normalized y of topmost yellow pixel (0-1)
  centroidBottom: number; // normalized y of bottommost yellow pixel (0-1)
}

// Estimate the top of the oil column as a fraction between bottle top and bottom.
// Empirical 0.35 offset: oil sits below the labeled region by about a third of bottle height.
export function getFillLevel(det: DetectionLike): number {
  const bottleTop = det.centroidTop;
  const bottleBottom = det.centroidBottom;
  if (bottleBottom <= bottleTop) return 0;
  const fillY = bottleTop + (bottleBottom - bottleTop) * 0.35;
  return (fillY - bottleTop) / (bottleBottom - bottleTop);
}

// Given an array of y-positions of yellow pixels, return the topmost (minimum) y.
// Returns 0 on empty input.
export function detectFillY(yPositions: number[]): number {
  if (yPositions.length === 0) return 0;
  return Math.min(...yPositions);
}

// Pixel-based mapping: convert a detected fill pixel to a fillLevel using
// known calibration points (shoulderPixel = 1500ml line, basePixel = 0ml line).
export function fillLevelFromPixels(
  fillPixel: number,
  shoulderPixel: number,
  basePixel: number,
): number {
  if (basePixel === shoulderPixel) return 0;
  const raw = (fillPixel - basePixel) / (shoulderPixel - basePixel);
  return Math.max(0, Math.min(1, 1 - raw));
}
