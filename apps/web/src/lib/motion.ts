/**
 * Site-wide motion setting: how much the pages animate. The level lives in
 * `<html data-motion="full|calm|off">`, set before the first paint by `MotionScript.astro`, and the
 * reader's choice in localStorage. See docs/plans/2026-10-12-home-redesign.md, "Настройка анимации".
 */

export const motionLevels = ['full', 'calm', 'off'] as const;
export type MotionLevel = (typeof motionLevels)[number];
/** Order of the buttons in the header switch. */
export const motionChoices = ['auto', 'full', 'calm', 'off'] as const;
export type MotionChoice = (typeof motionChoices)[number];

export const MOTION_STORAGE_KEY = 'heart-atlas:motion';
/** Fired on `window` after the level or the choice changes. */
export const MOTION_EVENT = 'heart-atlas:motion';

/** What the browser tells about the reader and the device. */
export interface MotionSignals {
  reducedMotion: boolean;
  saveData: boolean;
  /** `navigator.deviceMemory`, GB; absent where the browser does not report it. */
  deviceMemory?: number | undefined;
  /** `navigator.hardwareConcurrency`; absent where the browser does not report it. */
  cores?: number | undefined;
  /** Small or touch screen, as `prefersLowDetail` in the viewer. */
  lowDetail: boolean;
}

/**
 * Turns the reader's choice and the device signals into a level.
 *
 * Self-contained on purpose: `MotionScript.astro` inlines its source into `<head>`, so it must not
 * refer to anything outside its own body.
 */
export function resolveMotion(choice: string | null, signals: MotionSignals): MotionLevel {
  const manual = choice === 'full' || choice === 'calm' || choice === 'off' ? choice : null;
  // The system setting wins: nothing moves at full strength by itself under reduced motion.
  if (signals.reducedMotion) return manual === 'full' || manual === 'calm' ? 'calm' : 'off';
  if (manual) return manual;
  const weak =
    signals.saveData ||
    (signals.deviceMemory !== undefined && signals.deviceMemory <= 4) ||
    (signals.cores !== undefined && signals.cores <= 4);
  return weak || signals.lowDetail ? 'calm' : 'full';
}

/**
 * Reads the signals and the stored choice, writes `data-motion` and `data-motion-choice` on
 * `<html>`. Self-contained like `resolveMotion`, which it receives as an argument.
 */
export function applyMotion(resolve: typeof resolveMotion, key: string): void {
  let choice: string | null = null;
  try {
    choice = localStorage.getItem(key);
  } catch {
    // Storage can be blocked; the choice is then "auto".
  }
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean };
    deviceMemory?: number;
  };
  const level = resolve(choice, {
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    saveData: nav.connection?.saveData === true,
    deviceMemory: nav.deviceMemory,
    cores: nav.hardwareConcurrency || undefined,
    lowDetail: matchMedia('(pointer: coarse), (max-width: 48rem)').matches,
  });
  const root = document.documentElement;
  root.dataset['motion'] = level;
  root.dataset['motionChoice'] =
    choice === 'full' || choice === 'calm' || choice === 'off' ? choice : 'auto';
}

/** Source of the pre-paint script: both functions inlined, no imports. */
export function motionScriptSource(): string {
  return `(${applyMotion.toString()})(${resolveMotion.toString()}, ${JSON.stringify(MOTION_STORAGE_KEY)});`;
}

/** Current level; `full` before the pre-paint script ran (only in tests). */
export function currentMotion(): MotionLevel {
  const level = document.documentElement.dataset['motion'];
  return level === 'calm' || level === 'off' ? level : 'full';
}

/** Saves the reader's choice, applies it and tells islands about it. */
export function setMotionChoice(choice: MotionChoice): void {
  try {
    if (choice === 'auto') localStorage.removeItem(MOTION_STORAGE_KEY);
    else localStorage.setItem(MOTION_STORAGE_KEY, choice);
  } catch {
    // Storage can be blocked; the choice then lasts until the page closes.
  }
  refreshMotion(choice);
}

/** Re-resolves the level, e.g. after the system reduced-motion setting changed. */
export function refreshMotion(choice?: MotionChoice): void {
  if (choice === undefined) {
    applyMotion(resolveMotion, MOTION_STORAGE_KEY);
  } else {
    // Storage may be blocked, so the choice is applied directly rather than read back.
    applyMotion((_, signals) => resolveMotion(choice, signals), MOTION_STORAGE_KEY);
    document.documentElement.dataset['motionChoice'] = choice;
  }
  window.dispatchEvent(new Event(MOTION_EVENT));
}
