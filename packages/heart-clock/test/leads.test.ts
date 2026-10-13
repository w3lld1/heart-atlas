import { describe, expect, it } from 'vitest';
import { createHeartClock } from '../src/clock.ts';
import { leadGains, unitGains } from '../src/leads.ts';
import { defaultParams, resolveParams } from '../src/params.ts';
import { presetIds, presetLead, presetParams } from '../src/presets.ts';

const limbPresets = presetIds.filter((id) => presetLead(id) === 'II');

describe('leadGains', () => {
  it('gives lead II the amplitudes as they are', () => {
    expect(leadGains(defaultParams, 'II')).toBe(unitGains);
  });

  it('gives leads I and III half of lead II at the default axes', () => {
    for (const lead of ['I', 'III'] as const) {
      for (const gain of Object.values(leadGains(defaultParams, lead))) {
        expect(gain).toBeCloseTo(0.5, 12);
      }
    }
  });

  it('projects a wave on the lead axes', () => {
    // At +90° lead I is perpendicular to the wave and lead III sees what lead II sees.
    const vertical = resolveParams({ qrsAxis: 90 });
    expect(leadGains(vertical, 'I').qrs).toBeCloseTo(0, 12);
    expect(leadGains(vertical, 'III').qrs).toBeCloseTo(1, 12);
    // At 0° lead I sees twice lead II (cos 0 / cos 60°) and lead III sees it the other way.
    const horizontal = resolveParams({ tAxis: 0 });
    expect(leadGains(horizontal, 'I').t).toBeCloseTo(2, 12);
    expect(leadGains(horizontal, 'III').t).toBeCloseTo(-1, 12);
    // Past +90° lead I sees the wave the other way.
    expect(leadGains(resolveParams({ stAxis: 120 }), 'I').st).toBeCloseTo(-1, 12);
  });

  it('keeps every axis away from lead II zero', () => {
    expect(() => resolveParams({ qrsAxis: -30 })).toThrow(RangeError);
    expect(() => resolveParams({ pAxis: 150 })).toThrow(RangeError);
  });
});

describe('limb leads of the clock', () => {
  it('draw lead II as the clock always did', () => {
    for (const id of limbPresets) {
      const clock = createHeartClock(presetParams(id));
      const plain = clock.ecgBetween(0, 6000, 1201);
      expect(clock.ecgBetween(0, 6000, 1201, 'II')).toEqual(plain);
      expect(clock.ecgAt(1234, 'II')).toBe(clock.ecgAt(1234));
    }
  });

  it("keep Einthoven's law I + III = II for every preset and odd axes", () => {
    const axes = { pAxis: 100, qrsAxis: -10, tAxis: 130, stAxis: 110, fAxis: 90 };
    for (const id of limbPresets) {
      for (const params of [presetParams(id), resolveParams(axes, presetParams(id))]) {
        const clock = createHeartClock(params);
        const one = clock.ecgBetween(0, 8000, 1601, 'I');
        const three = clock.ecgBetween(0, 8000, 1601, 'III');
        clock.ecgBetween(0, 8000, 1601, 'II').forEach((value, k) => {
          expect((one[k] ?? NaN) + (three[k] ?? NaN)).toBeCloseTo(value, 9);
        });
      }
    }
  });

  it('draw half of lead II in leads I and III at the default axes', () => {
    const clock = createHeartClock(presetParams('atrial-fibrillation'));
    const two = clock.ecgBetween(0, 4000, 801, 'II');
    for (const lead of ['I', 'III'] as const) {
      clock.ecgBetween(0, 4000, 801, lead).forEach((value, k) => {
        expect(value).toBeCloseTo(0.5 * (two[k] ?? NaN), 12);
      });
    }
  });
});
