/**
 * Pages talk to the viewer island through a window event, so article text (static HTML) can
 * highlight structures without importing the viewer.
 */
export const HIGHLIGHT_EVENT = 'heart-atlas:highlight';

export interface HighlightDetail {
  ids: string[];
}

/** Asks every viewer on the page to highlight these structure ids; an empty list clears it. */
export function highlightStructures(ids: readonly string[]): void {
  window.dispatchEvent(
    new CustomEvent<HighlightDetail>(HIGHLIGHT_EVENT, { detail: { ids: [...ids] } }),
  );
}

export function isHighlightEvent(event: Event): event is CustomEvent<HighlightDetail> {
  const detail = (event as CustomEvent<unknown>).detail as Partial<HighlightDetail> | null;
  return Array.isArray(detail?.ids) && detail.ids.every((id) => typeof id === 'string');
}
