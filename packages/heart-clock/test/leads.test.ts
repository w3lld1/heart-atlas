import { describe, expect, it } from 'vitest';
import { createHeartClock } from '../src/clock.ts';
import { leadGains, unitGains } from '../src/leads.ts';
import { defaultParams, resolveParams } from '../src/params.ts';
import { presetIds, presetLead, presetParams } from '../src/presets.ts';

const limbPresets = presetIds.filter((id) => presetLead(id) === 'II');
const oddAxes = { pAxis: 100, qrsAxis: -10, tAxis: 130, stAxis: 110, fAxis: 90 };

/** Checks I + III = II at every point of [from, to]. */
function expectEinthoven(clock: ReturnType<typeof createHeartClock>, from: number, to: number) {
  const count = Math.round((to - from) / 5) + 1;
  const one = clock.ecgBetween(from, to, count, 'I');
  const three = clock.ecgBetween(from, to, count, 'III');
  clock.ecgBetween(from, to, count, 'II').forEach((value, k) => {
    expect((one[k] ?? NaN) + (three[k] ?? NaN)).toBeCloseTo(value, 9);
  });
}

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
  it('draw lead II as the clock always did, whatever the axes', () => {
    for (const id of limbPresets) {
      for (const params of [presetParams(id), resolveParams(oddAxes, presetParams(id))]) {
        const clock = createHeartClock(params);
        const plain = clock.ecgBetween(0, 6000, 1201);
        expect(clock.ecgBetween(0, 6000, 1201, 'II')).toEqual(plain);
        expect(clock.ecgAt(1234, 'II')).toBe(clock.ecgAt(1234));
      }
    }
  });

  it('cover every ECG feature in the Einthoven test below', () => {
    const all = limbPresets.map((id) => presetParams(id));
    expect(all.some((p) => p.blockedP === 1)).toBe(true);
    expect(all.some((p) => p.atrialRate > 0)).toBe(true);
    expect(all.some((p) => p.fWaveAmplitude > 0)).toBe(true);
    expect(all.some((p) => p.flutterConduction > 0)).toBe(true);
    expect(all.some((p) => p.deltaWave > 0)).toBe(true);
    expect(all.some((p) => p.prematureOrigin === 1)).toBe(true);
    expect(all.some((p) => p.prematureOrigin === 2)).toBe(true);
  });

  it("keep Einthoven's law I + III = II for every preset and odd axes", () => {
    for (const id of limbPresets) {
      for (const params of [presetParams(id), resolveParams(oddAxes, presetParams(id))]) {
        expectEinthoven(createHeartClock(params), 0, 8000);
      }
    }
  });

  it("keep Einthoven's law while f and F waves fade between axes", () => {
    for (const id of ['atrial-fibrillation', 'atrial-flutter'] as const) {
      const clock = createHeartClock(presetParams(id));
      clock.setParams({ fAxis: 120 }, 2000);
      expectEinthoven(clock, 1500, 3500);
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
