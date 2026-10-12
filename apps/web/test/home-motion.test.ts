import { describe, expect, it } from 'vitest';
import { CALM_FPS, floatOffset, frameDue } from '../src/lib/home-motion.ts';

describe('frameDue', () => {
  it('draws every frame in full motion and none in off', () => {
    expect(frameDue('full', 0)).toBe(true);
    expect(frameDue('off', 10_000)).toBe(false);
  });

  it('draws about 15 frames a second in calm motion on a 60 Hz screen', () => {
    const frame = 1000 / 60;
    let since = 0;
    let drawn = 0;
    for (let i = 0; i < 60; i++) {
      since += frame;
      if (frameDue('calm', since)) {
        drawn++;
        since = 0;
      }
    }
    expect(drawn).toBe(CALM_FPS);
  });
});

describe('floatOffset', () => {
  it('stays within a few pixels', () => {
    for (let t = 0; t < 20_000; t += 37) {
      for (let i = 0; i < 6; i++) expect(Math.abs(floatOffset(t, i))).toBeLessThanOrEqual(3);
    }
  });

  it('moves the cards out of step', () => {
    expect(floatOffset(1000, 0)).not.toBeCloseTo(floatOffset(1000, 1), 1);
  });
});
