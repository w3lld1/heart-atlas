import { describe, expect, it, vi } from 'vitest';
import { HIGHLIGHT_EVENT, highlightStructures, isHighlightEvent } from '../src/events.ts';

describe('isHighlightEvent', () => {
  it('accepts a list of ids and rejects anything else', () => {
    expect(isHighlightEvent(new CustomEvent('x', { detail: { ids: ['aorta'] } }))).toBe(true);
    expect(isHighlightEvent(new CustomEvent('x', { detail: { ids: [1] } }))).toBe(false);
    expect(isHighlightEvent(new CustomEvent('x', { detail: null }))).toBe(false);
    expect(isHighlightEvent(new Event('x'))).toBe(false);
  });
});

describe('highlightStructures', () => {
  it('asks for the ghost only when told to', () => {
    vi.stubGlobal('window', new EventTarget());
    const details: unknown[] = [];
    const listener = (event: Event) => details.push((event as CustomEvent).detail);
    window.addEventListener(HIGHLIGHT_EVENT, listener);
    highlightStructures(['aorta']);
    highlightStructures(['mitral-valve'], { ghost: true });
    window.removeEventListener(HIGHLIGHT_EVENT, listener);
    vi.unstubAllGlobals();
    expect(details).toEqual([{ ids: ['aorta'] }, { ids: ['mitral-valve'], ghost: true }]);
  });
});
