import { describe, expect, it } from 'vitest';
import { createHeartClock } from '../src/clock.ts';
import { leadGains, unitGains } from '../src/leads.ts';
import { defaultParams, resolveParams } from '../src/params.ts';
import { presetIds, presetLead, presetParams } from '../src/presets.ts';

const limbPresets = presetIds.filter((id) => presetLead(id) === 'II');
const oddAxes = { pAxis: 100, qrsAxis: 0, sAxis: -10, tAxis: 130, stAxis: 110, fAxis: 90 };

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
    expect(leadGains(vertical, 'I').qr).toBeCloseTo(0, 12);
    expect(leadGains(vertical, 'III').qr).toBeCloseTo(1, 12);
    // At 0° lead I sees twice lead II (cos 0 / cos 60°) and lead III sees it the other way.
    const horizontal = resolveParams({ tAxis: 0 });
    expect(leadGains(horizontal, 'I').t).toBeCloseTo(2, 12);
    expect(leadGains(horizontal, 'III').t).toBeCloseTo(-1, 12);
    // The S wave has its own axis: a negative S on 0° points right, deep in I and up in III.
    const lateS = resolveParams({ sAxis: 0 });
    expect(leadGains(lateS, 'I').s).toBeCloseTo(2, 12);
    expect(leadGains(lateS, 'III').s).toBeCloseTo(-1, 12);
    expect(leadGains(lateS, 'I').qr).toBeCloseTo(0.5, 12);
    // An axis is a line: θ and θ + 180° give the same gains.
    expect(leadGains(resolveParams({ qrsAxis: 120 }), 'I').qr).toBeCloseTo(
      Math.cos((300 * Math.PI) / 180) / Math.cos((240 * Math.PI) / 180),
      12,
    );
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

describe('preset pictures in leads I, II and III', () => {
  /** Values of each limb lead over `ms` from `from`, 1 ms apart. */
  function leadsOver(clock: ReturnType<typeof createHeartClock>, from: number, ms: number) {
    return Object.fromEntries(
      (['I', 'II', 'III'] as const).map((lead) => [
        lead,
        Array.from(clock.ecgBetween(from, from + ms, ms + 1, lead)),
      ]),
    ) as Record<'I' | 'II' | 'III', number[]>;
  }
  const peak = (values: number[]) => Math.max(...values.map(Math.abs));

  it('inferior STEMI: ST up in II and more in III, down in I', () => {
    const clock = createHeartClock(presetParams('stemi'));
    const beat = clock.beatAt(3000);
    const t = beat.start + beat.timing.jPoint + 20;
    // Lead II shows 0.2 mV of ST plus the start of T; III and I scale only the ST part.
    const st = 0.2;
    const tPart = clock.ecgAt(t, 'II') - st;
    expect(clock.ecgAt(t, 'II')).toBeGreaterThanOrEqual(0.1);
    expect(clock.ecgAt(t, 'III') - 0.5 * tPart).toBeCloseTo(1.532 * st, 2);
    expect(clock.ecgAt(t, 'I') - 0.5 * tPart).toBeCloseTo(-0.532 * st, 2);
  });

  it('typical flutter: low F waves in I, about as in II in III', () => {
    const clock = createHeartClock(presetParams('atrial-flutter'));
    const beat = clock.beatAt(3000);
    // Between T and the next QRS only F waves move the line.
    const from = beat.start + beat.timing.tEnd + 10;
    const ecg = leadsOver(clock, from, Math.floor(beat.rr - beat.timing.tEnd - 20));
    expect(peak(ecg.I)).toBeGreaterThan(0);
    expect(peak(ecg.I)).toBeLessThan(0.15 * peak(ecg.II));
    expect(peak(ecg.III)).toBeGreaterThan(0.8 * peak(ecg.II));
  });

  it('secundum ASD: right axis, R negative in I and positive in III', () => {
    const clock = createHeartClock(presetParams('atrial-septal-defect'));
    const beat = clock.beatAt(3000);
    expect(clock.ecgAt(beat.start + beat.timing.rPeak, 'I')).toBeLessThan(0);
    expect(clock.ecgAt(beat.start + beat.timing.rPeak, 'III')).toBeGreaterThan(0);
  });

  it('outflow tract VT and ventricular premature beats: QRS small in I', () => {
    const vt = createHeartClock(presetParams('ventricular-tachycardia'));
    const beat = vt.beatAt(3000);
    const qrs = leadsOver(vt, beat.start + beat.timing.qOnset, beat.params.qrsDuration);
    expect(peak(qrs.I)).toBeLessThan(0.15 * peak(qrs.II));

    const clock = createHeartClock(presetParams('ventricular-premature-beats'));
    const premature = clock
      .beatsBetween(0, 9000)
      .find((b) => b.params.prematureOrigin === 0 && b.params.pAmplitude === 0);
    expect(premature).toBeDefined();
    if (!premature) return;
    const wide = leadsOver(
      clock,
      premature.start + premature.timing.qOnset,
      premature.params.qrsDuration,
    );
    expect(peak(wide.I)).toBeLessThan(0.15 * peak(wide.II));
  });

  it('stay inside a limb strip, 1.5 mV up and 1 mV down, for every preset', () => {
    for (const id of presetIds) {
      const clock = createHeartClock(presetParams(id));
      for (let from = 0; from < 30000; from += 9000) {
        for (const lead of ['I', 'II', 'III'] as const) {
          const values = Array.from(clock.ecgBetween(from, from + 9000, 9001, lead));
          expect(Math.max(...values), `${id} in ${lead}`).toBeLessThan(1.5);
          expect(Math.min(...values), `${id} in ${lead}`).toBeGreaterThan(-1);
        }
      }
    }
  });
});
