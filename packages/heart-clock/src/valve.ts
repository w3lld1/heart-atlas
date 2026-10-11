const peakAt = 0.35;
const power = Math.log(0.5) / Math.log(peakAt);

/**
 * Shape of the pressure drop across a stenotic aortic valve over ejection, x from 0 (valve opens)
 * to 1 (valve closes): 0 at both ends, peaking at 35% of ejection, where the model's LV pressure
 * peaks too, so the LV peak stays at `lvSystolic`.
 * assumption: the shape; sources give only the mean gradient.
 */
export function gradientShape(x: number): number {
  return Math.sin(Math.PI * Math.max(0, Math.min(1, x)) ** power);
}

/** Peak of the drop divided by its mean over ejection. */
export const gradientPeakPerMean = (() => {
  const steps = 2000;
  let sum = 0;
  for (let i = 0; i < steps; i += 1) sum += gradientShape((i + 0.5) / steps);
  return steps / sum;
})();

/** Fraction of ejection at which the drop and the LV pressure peak. */
export const gradientPeakAt = peakAt;
