import { describe, expect, it } from 'vitest';
import { defaultParams, resolveParams } from '../src/params.ts';
import { beatTiming, phaseAt, phases, phaseStarts } from '../src/timing.ts';

const rates = Array.from({ length: 141 }, (_, i) => 40 + i);

describe('beatTiming', () => {
  it('matches the spec at 60 bpm', () => {
    const t = beatTiming(1000, defaultParams);
    expect(t.qOnset).toBeCloseTo(160);
    expect(t.rPeak).toBeCloseTo(205);
    // Weissler: QS2 = 546 − 2.1·60 = 420, LVET = 413 − 1.7·60 = 311, PEP = 109.
    expect(t.ejectionStart).toBeCloseTo(160 + 109);
    expect(t.aorticClosure).toBeCloseTo(160 + 420);
    expect(t.mitralOpening).toBeCloseTo(160 + 420 + 80);
    expect(t.tEnd).toBeCloseTo(560);
  });

  it.each(rates)('keeps the phases in order at %i bpm', (rate) => {
    const t = beatTiming(60000 / rate, defaultParams);
    expect(t.pDuration).toBeLessThan(t.qOnset);
    expect(t.qOnset).toBeLessThan(t.rPeak);
    expect(t.rPeak).toBeLessThan(t.jPoint);
    expect(t.rPeak).toBeLessThan(t.ejectionStart);
    expect(t.ejectionStart).toBeLessThan(t.aorticClosure);
    expect(t.aorticClosure).toBeLessThan(t.mitralOpening);
    expect(t.rr - t.mitralOpening).toBeGreaterThanOrEqual(10);
    expect(t.tEnd).toBeLessThan(t.rr);
  });

  it('stops PR from growing below 40 bpm and keeps QT growing', () => {
    const at40 = beatTiming(1500, defaultParams);
    const at30 = beatTiming(2000, defaultParams);
    expect(at30.qOnset).toBeCloseTo(at40.qOnset, 9);
    expect(at30.qOnset).toBeLessThan(200);
    expect(at30.tEnd - at30.qOnset).toBeGreaterThan(at40.tEnd - at40.qOnset);
  });

  it('rejects heart rates outside 30–180', () => {
    expect(() => beatTiming(60000 / 30, defaultParams)).not.toThrow();
    expect(() => beatTiming(60000 / 29, defaultParams)).toThrow(RangeError);
    expect(() => beatTiming(60000 / 181, defaultParams)).toThrow(RangeError);
    expect(() => beatTiming(Number.NaN, defaultParams)).toThrow(RangeError);
  });

  it('rejects parameters whose phases do not fit', () => {
    expect(() => beatTiming(60000 / 180, resolveParams({ qrsDuration: 160 }))).toThrow(
      /do not fit/,
    );
    expect(() => beatTiming(60000 / 180, resolveParams({ prInterval: 300 }))).toThrow(/do not fit/);
  });
});

describe('phaseAt', () => {
  it('walks through the five phases in order', () => {
    const timing = beatTiming(800, defaultParams);
    const starts = phaseStarts(timing);
    phases.forEach((phase, i) => {
      expect(phaseAt(starts[i] ?? 0, timing)).toBe(phase);
      expect(phaseAt((starts[i + 1] ?? timing.rr) - 0.01, timing)).toBe(phase);
    });
  });
});
