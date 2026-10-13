import type { HeartClock } from '@heart-atlas/heart-clock';

/** Screen scale, not a physical one: 1 mm of ECG paper is 4 CSS pixels. */
export const pxPerMm = 4;
/** Standard paper speed 25 mm/s and gain 10 mm/mV (StatPearls, "Electrocardiogram"). */
export const pxPerMs = (25 * pxPerMm) / 1000;
export const pxPerMv = 10 * pxPerMm;
/** Canvas height: 32 mm of paper. */
export const ecgHeight = 32 * pxPerMm;
/** The trace stays inside the clock history (10 s), so the strip shows at most 9 s. */
export const maxEcgWidth = Math.floor(9000 * pxPerMs);

export interface EcgColors {
  grid: string;
  gridMajor: string;
  trace: string;
}

export function readColors(element: Element): EcgColors {
  const style = getComputedStyle(element);
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    grid: read('--ecg-grid', '#f3c4c4'),
    gridMajor: read('--ecg-grid-major', '#e08a8a'),
    trace: read('--ecg-trace', '#1b1b1f'),
  };
}

/** Milliseconds of ECG that fit in a strip `width` CSS pixels wide. */
export function windowMs(width: number): number {
  return width / pxPerMs;
}

/**
 * Draws ECG paper and the trace for the strip that ends at clock time `now`, newest on the right.
 * `context` is already scaled so that one unit is one CSS pixel.
 */
export function drawEcg(
  context: CanvasRenderingContext2D,
  width: number,
  now: number,
  clock: HeartClock,
  colors: EcgColors,
): void {
  context.clearRect(0, 0, width, ecgHeight);
  context.lineWidth = 1;
  for (let mm = 0; mm * pxPerMm <= Math.max(width, ecgHeight); mm += 1) {
    context.strokeStyle = mm % 5 === 0 ? colors.gridMajor : colors.grid;
    const p = mm * pxPerMm + 0.5;
    context.beginPath();
    if (p <= width) {
      context.moveTo(p, 0);
      context.lineTo(p, ecgHeight);
    }
    if (p <= ecgHeight) {
      context.moveTo(0, p);
      context.lineTo(width, p);
    }
    context.stroke();
  }

  // Baseline on a major line, 18 mm from the top: room for R above and S below.
  context.strokeStyle = colors.trace;
  context.lineWidth = 2;
  traceEcg(context, clock, now, { width, pxPerMs, baseline: 18 * pxPerMm, pxPerMv });
}

export interface TraceScale {
  /** Width of the strip, CSS pixels. */
  width: number;
  pxPerMs: number;
  /** Where 0 mV sits, CSS pixels from the top. */
  baseline: number;
  pxPerMv: number;
}

/**
 * Strokes the ECG trace of the strip that ends at clock time `now`, newest on the right, with the
 * context's current stroke style and width.
 */
export function traceEcg(
  context: CanvasRenderingContext2D,
  clock: HeartClock,
  now: number,
  { width, pxPerMs: perMs, baseline, pxPerMv: perMv }: TraceScale,
): void {
  // The clock starts at t = 0; before that there is no trace.
  const from = Math.max(0, now - width / perMs);
  const offset = width - (now - from) * perMs;
  const count = Math.floor(width - offset) + 1;
  if (count < 2) return;
  const values = clock.ecgBetween(from, from + (count - 1) / perMs, count);
  context.lineJoin = 'round';
  context.beginPath();
  values.forEach((value, x) => {
    const y = baseline - value * perMv;
    if (x === 0) context.moveTo(offset + x, y);
    else context.lineTo(offset + x, y);
  });
  // Spikes start at 0 mV: pacing rules out f and F waves, and T ends before the next P, so the
  // trace is on the baseline where a paced beat starts.
  for (const t of pacingSpikes(clock, from, from + (count - 1) / perMs)) {
    const x = offset + (t - from) * perMs;
    context.moveTo(x, baseline);
    context.lineTo(x, baseline - pacingSpikeMv * perMv);
  }
  context.stroke();
}

/**
 * Height of a pacemaker spike, mV. assumption: real spikes are often too small to see on a standard
 * ECG, and the ECG standard (Kligfield 2007) advises against enlarging them; the model draws them
 * at half the R wave so they are visible. Spec: docs/plans/2026-10-13-heart-clock-after-treatment.md.
 */
export const pacingSpikeMv = 0.5;

/**
 * Clock times of the pacemaker spikes in [from, to]: the start of every beat with atrial pacing.
 * A stimulus is shorter than 0.5 ms, narrower than a pixel, so it is not part of the sampled trace
 * and is drawn as a vertical line. Each beat's own parameters decide, so a preset change in the
 * middle of the strip leaves the earlier beats without spikes.
 */
export function pacingSpikes(clock: HeartClock, from: number, to: number): number[] {
  return clock
    .beatsBetween(from, to)
    .filter((beat) => beat.start >= from && beat.start <= to && beat.params.atrialPacing === 1)
    .map((beat) => beat.start);
}
