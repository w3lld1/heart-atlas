import { beatTiming, beatWaves, defaultParams, type HeartParams } from '@heart-atlas/heart-clock';

export interface EcgStripOptions {
  /** Length of the strip, ms. */
  durationMs: number;
  width: number;
  height: number;
  /** Heart rate of the strip, beats per minute. */
  heartRate: number;
  /** Where the isoelectric line sits, as a share of the height from the top. */
  baseline?: number;
  /** Height of 1 mV, as a share of the height. */
  mvHeight?: number;
  /** One point every `stepMs`. */
  stepMs?: number;
}

/**
 * SVG path of a still ECG strip: the same synthetic lead as on the heart clock page, built from
 * `beatWaves` of @heart-atlas/heart-clock with its default parameters and a regular rhythm.
 * Each point adds the previous beat, whose T wave can run past its RR interval.
 */
export function ecgStripPath({
  durationMs,
  width,
  height,
  heartRate,
  baseline = 0.64,
  mvHeight = 0.55,
  stepMs = 4,
}: EcgStripOptions): string {
  const params: HeartParams = { ...defaultParams, heartRate };
  const rr = 60000 / heartRate;
  const timing = beatTiming(rr, params);
  const points: string[] = [];
  for (let t = 0; t <= durationMs; t += stepMs) {
    const inBeat = t % rr;
    const mv = beatWaves(inBeat, timing, params) + beatWaves(inBeat + rr, timing, params);
    const x = (t / durationMs) * width;
    const y = height * baseline - mv * height * mvHeight;
    points.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return `M${points.join('L')}`;
}
