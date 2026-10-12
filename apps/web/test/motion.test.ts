import { describe, expect, it } from 'vitest';
import { motionScriptSource, resolveMotion, type MotionSignals } from '../src/lib/motion.ts';

const strong: MotionSignals = {
  reducedMotion: false,
  saveData: false,
  deviceMemory: 8,
  cores: 8,
  lowDetail: false,
};

describe('resolveMotion', () => {
  it('gives full animation to a strong device in auto', () => {
    expect(resolveMotion(null, strong)).toBe('full');
    expect(resolveMotion('auto', strong)).toBe('full');
    expect(resolveMotion('garbage', strong)).toBe('full');
  });

  it('calms down on weak devices, data saving and small or touch screens', () => {
    expect(resolveMotion(null, { ...strong, saveData: true })).toBe('calm');
    expect(resolveMotion(null, { ...strong, deviceMemory: 4 })).toBe('calm');
    expect(resolveMotion(null, { ...strong, cores: 4 })).toBe('calm');
    expect(resolveMotion(null, { ...strong, lowDetail: true })).toBe('calm');
  });

  it('treats unknown memory and cores as strong', () => {
    expect(resolveMotion(null, { ...strong, deviceMemory: undefined, cores: undefined })).toBe(
      'full',
    );
  });

  it('follows the reader’s choice', () => {
    expect(resolveMotion('off', strong)).toBe('off');
    expect(resolveMotion('calm', strong)).toBe('calm');
    expect(resolveMotion('full', { ...strong, lowDetail: true, cores: 2 })).toBe('full');
  });

  it('never animates at full strength under reduced motion', () => {
    const reduced = { ...strong, reducedMotion: true };
    expect(resolveMotion(null, reduced)).toBe('off');
    expect(resolveMotion('off', reduced)).toBe('off');
    expect(resolveMotion('calm', reduced)).toBe('calm');
    expect(resolveMotion('full', reduced)).toBe('calm');
  });
});

describe('motionScriptSource', () => {
  /** Runs the inline script against a fake browser and returns what it wrote on <html>. */
  function run(stored: string | null, queries: Record<string, boolean>, nav: object = {}) {
    const dataset: Record<string, string> = {};
    const env = {
      localStorage: {
        getItem: () => {
          if (stored === 'throw') throw new Error('blocked');
          return stored;
        },
      },
      navigator: { hardwareConcurrency: 8, ...nav },
      matchMedia: (q: string) => ({ matches: queries[q] ?? false }),
      document: { documentElement: { dataset } },
    };
    // The script must be self-contained: only browser globals are in scope.
    new Function(...Object.keys(env), motionScriptSource())(...Object.values(env));
    return dataset;
  }

  it('writes the level and the choice before the first paint', () => {
    expect(run(null, {})).toEqual({ motion: 'full', motionChoice: 'auto' });
    expect(run('calm', {})).toEqual({ motion: 'calm', motionChoice: 'calm' });
    expect(run(null, { '(prefers-reduced-motion: reduce)': true })).toEqual({
      motion: 'off',
      motionChoice: 'auto',
    });
    expect(run(null, { '(pointer: coarse), (max-width: 48rem)': true }).motion).toBe('calm');
    expect(run(null, {}, { connection: { saveData: true } }).motion).toBe('calm');
  });

  it('falls back to auto when storage is blocked', () => {
    expect(run('throw', {})).toEqual({ motion: 'full', motionChoice: 'auto' });
  });
});
