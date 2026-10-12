/**
 * Pages talk to the viewer island through a window event, so article text (static HTML) can
 * highlight structures without importing the viewer.
 */
export const HIGHLIGHT_EVENT = 'heart-atlas:highlight';

export interface HighlightDetail {
  ids: string[];
  /** Asks the home page heart to make everything else see-through; the viewer ignores it. */
  ghost?: boolean;
}

/** Asks every viewer on the page to highlight these structure ids; an empty list clears it. */
export function highlightStructures(
  ids: readonly string[],
  options: { ghost?: boolean } = {},
): void {
  window.dispatchEvent(
    new CustomEvent<HighlightDetail>(HIGHLIGHT_EVENT, {
      detail: { ids: [...ids], ...(options.ghost ? { ghost: true } : {}) },
    }),
  );
}

export function isHighlightEvent(event: Event): event is CustomEvent<HighlightDetail> {
  const detail = (event as CustomEvent<unknown>).detail as Partial<HighlightDetail> | null;
  return Array.isArray(detail?.ids) && detail.ids.every((id) => typeof id === 'string');
}

/**
 * Fired on `window` when the site's motion setting changes. The same name as `MOTION_EVENT` in
 * apps/web/src/lib/motion.ts, which owns the setting.
 */
export const MOTION_EVENT = 'heart-atlas:motion';

/**
 * True when nothing should move by itself: the reader asked for reduced motion, or set the site's
 * motion to off (`<html data-motion="off">`).
 */
export function motionIsOff(): boolean {
  return (
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.dataset['motion'] === 'off'
  );
}
