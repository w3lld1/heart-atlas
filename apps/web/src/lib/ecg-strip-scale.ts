/**
 * Scale of the home page ECG strip, shared by the still SVG built from `ecgStripPath` and the
 * running canvas. Kept apart from `ecg-strip.ts`, so the page script does not pull in the clock.
 */
export const STRIP = {
  /** Length of the strip, ms. */
  durationMs: 2800,
  /** Beats per minute, as the home page heart. */
  heartRate: 64,
  /** Where the isoelectric line sits, as a share of the height from the top. */
  baseline: 0.64,
  /** Height of 1 mV, as a share of the height. */
  mvHeight: 0.55,
} as const;
