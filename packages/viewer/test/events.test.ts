import { describe, expect, it } from 'vitest';
import { isHighlightEvent } from '../src/events.ts';

describe('isHighlightEvent', () => {
  it('accepts a list of ids and rejects anything else', () => {
    expect(isHighlightEvent(new CustomEvent('x', { detail: { ids: ['aorta'] } }))).toBe(true);
    expect(isHighlightEvent(new CustomEvent('x', { detail: { ids: [1] } }))).toBe(false);
    expect(isHighlightEvent(new CustomEvent('x', { detail: null }))).toBe(false);
    expect(isHighlightEvent(new Event('x'))).toBe(false);
  });
});
