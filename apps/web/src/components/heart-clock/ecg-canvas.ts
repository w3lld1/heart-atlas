import type { HeartClock, LimbLead } from '@heart-atlas/heart-clock';

/** Screen scale, not a physical one: 1 mm of ECG paper is 4 CSS pixels. */
export const pxPerMm = 4;
/** Standard paper speed 25 mm/s and gain 10 mm/mV (StatPearls, "Electrocardiogram"). */
export const pxPerMs = (25 * pxPerMm) / 1000;
export const pxPerMv = 10 * pxPerMm;
/** Canvas height of a single strip: 32 mm of paper, baseline 18 mm from the top. */
export const ecgHeight = 32 * pxPerMm;
/**
 * Height of the Wiggers diagram, px. Kept here, apart from its drawing code, which loads when the
 * diagram comes near view (docs/plans/2026-10-14-lazy-wiggers.md).
 */
export const wiggersHeight = 320;
/**
 * One of three limb lead strips: 25 mm, so the three fit on a phone and the 5 mm grid runs on
 * across them, with the baseline on a major line 15 mm from the top. Room for 1.5 mV up and 1 mV
 * down; a test checks every preset in every lead fits.
 */
export const limbStrip = { height: 25 * pxPerMm, baseline: 15 * pxPerMm } as const;
const singleStrip = { height: ecgHeight, baseline: 18 * pxPerMm } as const;
/** The trace stays inside the clock history (10 s), so the strip shows at most 9 s. */
export const maxEcgWidth = Math.floor(9000 * pxPerMs);

export interface EcgColors {
  grid: string;
  gridMajor: string;
  trace: string;
  /** Paper behind the lead's name. */
  paper: string;
}

export function readColors(element: Element): EcgColors {
  const style = getComputedStyle(element);
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    grid: read('--ecg-grid', '#f3c4c4'),
    gridMajor: read('--ecg-grid-major', '#e08a8a'),
    trace: read('--ecg-trace', '#1b1b1f'),
    paper: read('--color-bg', '#ffffff'),
  };
}

/** Milliseconds of ECG that fit in a strip `width` CSS pixels wide. */
export function windowMs(width: number): number {
  return width / pxPerMs;
}

/**
 * Draws ECG paper and the trace for the strip that ends at clock time `now`, newest on the right.
 * `context` is already scaled so that one unit is one CSS pixel. With `lead` the strip is that
 * limb lead, shorter (`limbStrip`) and labelled with the lead's name; without it the clock's own
 * trace on a full strip.
 */
export function drawEcg(
  context: CanvasRenderingContext2D,
  width: number,
  now: number,
  clock: HeartClock,
  colors: EcgColors,
  lead?: LimbLead,
): void {
  const { height, baseline } = lead ? limbStrip : singleStrip;
  context.clearRect(0, 0, width, height);
  context.lineWidth = 1;
  for (let mm = 0; mm * pxPerMm <= Math.max(width, height); mm += 1) {
    context.strokeStyle = mm % 5 === 0 ? colors.gridMajor : colors.grid;
    const p = mm * pxPerMm + 0.5;
    context.beginPath();
    if (p <= width) {
      context.moveTo(p, 0);
      context.lineTo(p, height);
    }
    if (p <= height) {
      context.moveTo(0, p);
      context.lineTo(width, p);
    }
    context.stroke();
  }

  // Room for R above the baseline and S below.
  context.strokeStyle = colors.trace;
  context.lineWidth = 2;
  traceEcg(context, clock, now, { width, pxPerMs, baseline, pxPerMv, lead });
  if (lead) {
    // The lead's name, as on a printed ECG, on a patch of paper so a tall R wave does not run
    // through it; the canvas label says it to screen readers.
    context.font = `bold ${3 * pxPerMm}px system-ui, sans-serif`;
    context.textBaseline = 'top';
    const pad = pxPerMm / 2;
    context.fillStyle = colors.paper;
    context.fillRect(
      pxPerMm - pad,
      pxPerMm - pad,
      context.measureText(lead).width + 2 * pad,
      3 * pxPerMm + 2 * pad,
    );
    context.fillStyle = colors.trace;
    context.fillText(lead, pxPerMm, pxPerMm);
  }
}

export interface TraceScale {
  /** Width of the strip, CSS pixels. */
  width: number;
  pxPerMs: number;
  /** Where 0 mV sits, CSS pixels from the top. */
  baseline: number;
  pxPerMv: number;
  /** Limb lead to draw; the clock's own trace without it. */
  lead?: LimbLead | undefined;
}

/**
 * Strokes the ECG trace of the strip that ends at clock time `now`, newest on the right, with the
 * context's current stroke style and width.
 */
export function traceEcg(
  context: CanvasRenderingContext2D,
  clock: HeartClock,
  now: number,
  { width, pxPerMs: perMs, baseline, pxPerMv: perMv, lead }: TraceScale,
): void {
  // The clock starts at t = 0; before that there is no trace.
  const from = Math.max(0, now - width / perMs);
  const offset = width - (now - from) * perMs;
  const count = Math.floor(width - offset) + 1;
  if (count < 2) return;
  const values = clock.ecgBetween(from, from + (count - 1) / perMs, count, lead);
  context.lineJoin = 'round';
  context.beginPath();
  values.forEach((value, x) => {
    const y = baseline - value * perMv;
    if (x === 0) context.moveTo(offset + x, y);
    else context.lineTo(offset + x, y);
  });
  // Spikes start at 0 mV: pacing rules out f and F waves, T ends before the next P, and the PR
  // segment is flat, so the trace is on the baseline where a paced P or QRS starts. A spike is a
  // marker, not part of the trace: every limb lead draws it the same
  // (docs/plans/2026-10-13-heart-clock-three-leads.md).
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
 * Clock times of the pacemaker spikes in [from, to]: the start of every beat with atrial pacing and
 * the QRS onset of every beat with ventricular pacing (docs/plans/2026-10-13-heart-clock-av-block.md).
 * A stimulus is shorter than 0.5 ms, narrower than a pixel, so it is not part of the sampled trace
 * and is drawn as a vertical line. Each beat's own parameters decide, so a preset change in the
 * middle of the strip leaves the earlier beats without spikes.
 */
export function pacingSpikes(clock: HeartClock, from: number, to: number): number[] {
  const times: number[] = [];
  for (const beat of clock.beatsBetween(from, to)) {
    if (beat.params.atrialPacing === 1) times.push(beat.start);
    if (beat.params.ventricularPacing === 1) times.push(beat.start + beat.timing.qOnset);
  }
  return times.filter((t) => t >= from && t <= to);
}
