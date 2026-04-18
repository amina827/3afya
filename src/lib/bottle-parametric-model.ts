// Parametric bottle shape model.
// y is normalized (0 = top, 1 = bottom). Returns half-width in [0, 0.5] range.
// Four regions: Neck → Shoulder (sin² blend) → Body (quadratic taper) → Base (circular).
export function xOfY(y: number): number {
  if (y < 0.08) {
    return 0.08;
  }
  if (y < 0.22) {
    const t = (y - 0.08) / 0.14;
    return 0.08 + (0.34 - 0.08) * Math.pow(Math.sin((Math.PI * t) / 2), 2);
  }
  if (y < 0.80) {
    const center = 0.5;
    return 0.34 - 0.15 * Math.pow(y - center, 2);
  }
  const t = (y - 0.80) / 0.20;
  return 0.30 * Math.sqrt(Math.max(0, 1 - t * t));
}

// Generate an SVG path (viewBox 100x133) by sampling xOfY at `steps` intervals.
export function generateBottlePath(steps: number = 80): string {
  const pointsLeft: string[] = [];
  const pointsRight: string[] = [];

  for (let i = 0; i <= steps; i++) {
    const y = i / steps;
    const x = xOfY(y);

    const px = 50 + x * 50;
    const nx = 50 - x * 50;
    const py = y * 133;

    pointsRight.push(`${px.toFixed(2)} ${py.toFixed(2)}`);
    pointsLeft.unshift(`${nx.toFixed(2)} ${py.toFixed(2)}`);
  }

  return `M ${pointsLeft.join(' L ')} L ${pointsRight.join(' L ')} Z`;
}
