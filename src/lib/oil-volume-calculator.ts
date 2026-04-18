import { xOfY } from './bottle-parametric-model';

// Discrete integration of π·x(y)² dy from fillLevel → 1.
// Returns a model-units number (unitless); combine with TOTAL_VOLUME_MODEL to normalize.
export function computeVolume(fillLevel: number, steps: number = 200): number {
  const clamped = Math.max(0, Math.min(1, fillLevel));
  let volume = 0;
  for (let i = 0; i < steps; i++) {
    const y = clamped + (1 - clamped) * (i / steps);
    const r = xOfY(y);
    volume += Math.PI * r * r;
  }
  return volume;
}

// Full-bottle baseline (fillLevel = 0 means oil fills the whole bottle).
export const TOTAL_VOLUME_MODEL = computeVolume(0);

// Bottle nominal capacity in liters.
export const BOTTLE_CAPACITY_LITERS = 1.5;

// Convert a fillLevel (0 = full, 1 = empty) into liters of oil remaining.
export function getLiters(fillLevel: number): number {
  const v = computeVolume(fillLevel);
  return (v / TOTAL_VOLUME_MODEL) * BOTTLE_CAPACITY_LITERS;
}
