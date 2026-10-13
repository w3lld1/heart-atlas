import { phaseStarts, type HeartClock } from '@heart-atlas/heart-clock';

export const wiggersHeight = 320;

export interface WiggersColors {
  lv: string;
  aorta: string;
  la: string;
  volume: string;
  ecg: string;
  grid: string;
  text: string;
  systole: string;
  cursor: string;
}

export interface WiggersLabels {
  pressure: string;
  volume: string;
  ecg: string;
}

export function readWiggersColors(element: Element): WiggersColors {
  const style = getComputedStyle(element);
  const read = (name: string) => style.getPropertyValue(name).trim() || 'currentColor';
  return {
    lv: read('--wiggers-lv'),
    aorta: read('--wiggers-aorta'),
    la: read('--wiggers-la'),
    volume: read('--wiggers-volume'),
    ecg: read('--ecg-trace'),
    grid: read('--color-border'),
    text: read('--color-muted'),
    systole: read('--wiggers-systole'),
    cursor: read('--color-accent'),
  };
}

/** Left margin for axis labels, px. */
const axisWidth = 36;
const panels = {
  pressure: { top: 18, height: 160 },
  volume: { top: 200, height: 60 },
  ecg: { top: 278, height: 36 },
} as const;

/**
 * Draws one cardiac cycle (the beat that contains `now`) as a Wiggers diagram: pressures in the
 * left ventricle, aorta and left atrium, LV volume and the ECG, with ventricular systole shaded
 * and a cursor at `now`. `context` is scaled so that one unit is one CSS pixel.
 */
export function drawWiggers(
  context: CanvasRenderingContext2D,
  width: number,
  now: number,
  clock: HeartClock,
  colors: WiggersColors,
  labels: WiggersLabels,
): void {
  context.clearRect(0, 0, width, wiggersHeight);
  const beat = clock.beatAt(now);
  // The axis spans the rhythm RR, not a sinus pause after it: on an 8 s beat systole would be a
  // sliver. In a pause the cursor waits at the right edge.
  const rr = beat.timing.rr;
  const plotWidth = width - axisWidth - 4;
  const count = Math.max(2, Math.floor(plotWidth));
  const xAt = (t: number) => axisWidth + (Math.min(t, rr) / rr) * plotWidth;

  // Ventricular systole: from mitral closure (S1) to aortic closure (S2).
  const [, contraction = 0, , relaxation = 0] = phaseStarts(beat.timing);
  context.fillStyle = colors.systole;
  context.fillRect(xAt(contraction), 0, xAt(relaxation) - xAt(contraction), wiggersHeight);

  const samples = Array.from({ length: count }, (_, k) => {
    const t = (k / (count - 1)) * rr;
    return clock.hemodynamicsAt(beat.start + Math.min(t, rr - 1e-6));
  });
  const ecg = clock.ecgBetween(beat.start, beat.start + rr - 1e-6, count);

  const maxPressure = Math.max(140, Math.ceil((beat.params.lvSystolic + 20) / 40) * 40);
  const pressureY = (p: number) =>
    panels.pressure.top + panels.pressure.height * (1 - p / maxPressure);
  const volumeY = (v: number) => panels.volume.top + panels.volume.height * (1 - v / 100);
  const ecgY = (mv: number) => panels.ecg.top + panels.ecg.height * (0.7 - mv * 0.6);

  // Axes and grid lines with values.
  context.font = '11px system-ui, sans-serif';
  context.lineWidth = 1;
  context.strokeStyle = colors.grid;
  context.fillStyle = colors.text;
  context.textBaseline = 'middle';
  context.textAlign = 'right';
  context.beginPath();
  for (let p = 0; p <= maxPressure; p += 40) {
    const y = Math.round(pressureY(p)) + 0.5;
    context.moveTo(axisWidth, y);
    context.lineTo(width, y);
    context.fillText(String(p), axisWidth - 4, y);
  }
  for (const v of [0, 50, 100]) {
    const y = Math.round(volumeY(v)) + 0.5;
    context.moveTo(axisWidth, y);
    context.lineTo(width, y);
    context.fillText(String(v), axisWidth - 4, y);
  }
  context.stroke();
  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';
  context.fillText(labels.pressure, axisWidth + 4, panels.pressure.top - 6);
  context.fillText(labels.volume, axisWidth + 4, panels.volume.top - 6);
  context.fillText(labels.ecg, axisWidth + 4, panels.ecg.top + 4);

  const line = (color: string, y: (k: number) => number, widthPx = 2, dash: number[] = []) => {
    context.setLineDash(dash);
    context.strokeStyle = color;
    context.lineWidth = widthPx;
    context.lineJoin = 'round';
    context.beginPath();
    for (let k = 0; k < count; k += 1) {
      const x = axisWidth + (k / (count - 1)) * plotWidth;
      if (k === 0) context.moveTo(x, y(k));
      else context.lineTo(x, y(k));
    }
    context.stroke();
  };
  // Dashed lines tell LA and volume apart without colour.
  line(colors.la, (k) => pressureY(samples[k]?.la ?? 0), 2, [6, 4]);
  line(colors.aorta, (k) => pressureY(samples[k]?.aorta ?? 0));
  line(colors.lv, (k) => pressureY(samples[k]?.lv ?? 0));
  line(colors.volume, (k) => volumeY(samples[k]?.volume ?? 0), 2, [2, 3]);
  line(colors.ecg, (k) => ecgY(ecg[k] ?? 0), 1.5);
  context.setLineDash([]);

  const cursor = Math.round(xAt(now - beat.start)) + 0.5;
  context.strokeStyle = colors.cursor;
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(cursor, 0);
  context.lineTo(cursor, wiggersHeight);
  context.stroke();
}
