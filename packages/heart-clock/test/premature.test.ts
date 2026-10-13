import { describe, expect, it } from 'vitest';
import {
  checkParams,
  createHeartClock,
  heartRateLimits,
  monitorPhase,
  ventricularPrematureParams,
  type Beat,
} from '../src/clock.ts';
import { cycleState } from '../src/cycle.ts';
import { resolveParams } from '../src/params.ts';
import { soundEvents } from '../src/sounds.ts';
import { prAt } from '../src/timing.ts';

// Spec: docs/plans/2026-10-13-heart-clock-premature-beats.md.
const ventricular = { prematureEvery: 4, prematureOrigin: 2 } as const;
const atrial = { prematureEvery: 4, prematureOrigin: 1 } as const;

/** Width of the part of the ECG above 0.05 mV around a beat's R peak, ms. */
function visibleQrs(clock: ReturnType<typeof createHeartClock>, rPeak: number): number {
  let from = rPeak;
  let to = rPeak;
  while (Math.abs(clock.ecgAt(from - 1)) > 0.05) from -= 1;
  while (Math.abs(clock.ecgAt(to + 1)) > 0.05) to += 1;
  return to - from;
}

describe('resolveParams with premature beats', () => {
  it('accepts both origins and rejects modes they cannot go with', () => {
    expect(resolveParams(ventricular)).toMatchObject({ ...ventricular, prematureCoupling: 0.7 });
    expect(resolveParams(atrial).prematureOrigin).toBe(1);
    expect(() => resolveParams({ prematureEvery: 1, prematureOrigin: 2 })).toThrow(
      /^prematureEvery must be 0 or an integer/,
    );
    expect(() => resolveParams({ prematureEvery: 4 })).toThrow(/both be 0 or both be above 0/);
    expect(() => resolveParams({ prematureOrigin: 2 })).toThrow(/both be 0 or both be above 0/);
    expect(() => resolveParams({ ...atrial, prematureOrigin: 1.5 })).toThrow(
      /^prematureOrigin must be 0, 1 or 2/,
    );
    expect(() => resolveParams({ ...atrial, prematureCoupling: 0.95 })).toThrow(RangeError);
    for (const patch of [
      { pAmplitude: 0 },
      { rrIrregularity: 0.1 },
      { fWaveAmplitude: 0.1 },
      { flutterConduction: 2, flutterAmplitude: 0.2 },
      { pauseEvery: 3, pauseDuration: 2000 },
      { atrialRate: 75, atrialContribution: 0 },
      { atrialPacing: 1 },
      { ventricularPacing: 1 },
      { deltaWave: 40 },
    ]) {
      expect(() => resolveParams({ ...ventricular, ...patch }), JSON.stringify(patch)).toThrow(
        RangeError,
      );
    }
  });
});

describe('ventricular premature beats', () => {
  it('cut the beat before short and keep two rhythm RRs from it to the next sinus beat', () => {
    const clock = createHeartClock({ ...ventricular, heartRate: 75 });
    const beats = clock.beatsBetween(0, 7000);
    expect(beats.map((b) => b.start)).toEqual([0, 800, 1600, 2160, 3200, 4000, 4800, 5360, 6400]);
    expect(beats.map((b) => b.premature)).toEqual([0, 0, 0, 2, 0, 0, 0, 2, 0]);
    expect(beats.map((b) => b.beforePremature)).toEqual([
      false,
      false,
      true,
      false,
      false,
      false,
      true,
      false,
      false,
    ]);
    const [, normal, before, premature] = beats;
    expect(before?.rr).toBeCloseTo(560, 9);
    // The beat before keeps the rhythm's PR, though its other phases follow its shorter RR.
    expect(before?.timing.qOnset).toBeCloseTo(normal?.timing.qOnset ?? 0, 9);
    expect(before?.timing.tEnd).toBeLessThan(normal?.timing.tEnd ?? 0);
    expect(premature?.timing.qOnset).toBe(0);
    expect(premature?.pause).toBeCloseTo(240, 9);
  });

  it('draw no P wave, a QRS wider than 120 ms and wider than the sinus one, and an inverted T', () => {
    const clock = createHeartClock({ ...ventricular, heartRate: 60 });
    const premature = clock.beatAt(3000 - 300 + 1);
    expect(premature.premature).toBe(2);
    const { start, timing, params } = premature;
    expect(params).toMatchObject({ pAmplitude: 0, qrsDuration: 140, tAmplitude: -0.3 });
    const sinus = clock.beatAt(1000);
    const wide = visibleQrs(clock, start + timing.rPeak);
    expect(wide).toBeGreaterThanOrEqual(120);
    expect(wide).toBeGreaterThan(visibleQrs(clock, sinus.start + sinus.timing.rPeak));
    // Before the QRS the line is flat: no P wave of its own.
    for (let t = start - 40; t < start; t += 5) expect(Math.abs(clock.ecgAt(t))).toBeLessThan(0.03);
    const tCentre = start + timing.tEnd - 60;
    expect(clock.ecgAt(tCentre)).toBeLessThan(-0.1);
  });

  it('show filling at the start and in the pause after it, and light no conduction system', () => {
    const clock = createHeartClock({ ...ventricular, heartRate: 60 });
    const premature = clock.beatAt(2701);
    const { start, timing } = premature;
    expect(clock.sample(start + 5).phase).toBe('filling');
    const inPause = clock.sample(start + timing.rr + 100);
    expect(inPause.pause).toBe(true);
    expect(monitorPhase(inPause)).toBe('filling');
    for (let t = start; t < start + timing.jPoint; t += 10) {
      expect(cycleState(clock, t).excited, `${t - start} ms`).toEqual([]);
    }
  });

  it('let the S2 of the beat before come before the S1 of the premature beat', () => {
    const clock = createHeartClock({ ...ventricular, heartRate: 75 });
    const [before, premature] = clock.beatsBetween(1600, 2200) as [Beat, Beat];
    const s2 = soundEvents(before).find((e) => e.sound === 'S2');
    const s1 = soundEvents(premature).find((e) => e.sound === 'S1');
    expect(s2?.time).toBeLessThan(s1?.time ?? 0);
  });

  it('keep the shortened beat and its premature beat together across setParams', () => {
    const clock = createHeartClock({ ...ventricular, heartRate: 60 });
    // Beat 2 (2000–2700) is cut short; switching premature beats off there keeps beat 3 premature.
    clock.beatAt(2200);
    clock.setParams({ prematureEvery: 0, prematureOrigin: 0 }, 2200);
    const beats = clock.beatsBetween(2000, 7000);
    expect(beats.map((b) => b.premature)).toEqual([0, 2, 0, 0, 0, 0]);
    expect(beats[0]?.beforePremature).toBe(true);
    expect(beats.slice(1).every((b) => !b.beforePremature)).toBe(true);
    // And switching them on in the beat before a would-be cut beat does not make a late one.
    const other = createHeartClock({ heartRate: 60 });
    other.beatAt(2500);
    other.setParams(ventricular, 2500);
    const later = other.beatsBetween(2000, 9000);
    for (let i = 1; i < later.length; i += 1) {
      expect(later[i]?.premature === 2).toBe(later[i - 1]?.beforePremature === true);
    }
  });

  it('start a fresh run after a long jump with a sinus beat', () => {
    const clock = createHeartClock({ ...ventricular, heartRate: 60 });
    clock.beatAt(1000);
    expect(clock.beatAt(60_000).premature).toBe(0);
  });

  it('limit the heart rate by the short beat and by the premature beat', () => {
    const params = resolveParams(ventricular);
    // The short beat keeps the rhythm's PR, so its phases stop fitting above 86 bpm.
    expect(heartRateLimits(params)).toEqual([30, 86]);
    expect(() => checkParams({ ...params, heartRate: 87 })).toThrow(RangeError);
    expect(ventricularPrematureParams(params)).toBe(ventricularPrematureParams(params));
  });
});

describe('atrial premature beats', () => {
  it('come early with a P wave and the usual QRS, and reset the sinus node', () => {
    const clock = createHeartClock({ ...atrial, heartRate: 75 });
    const beats = clock.beatsBetween(0, 5000);
    expect(beats.map((b) => b.start)).toEqual([0, 800, 1600, 2160, 2960, 3760, 4560]);
    const premature = beats[3];
    expect(premature?.premature).toBe(1);
    expect(premature?.params).toBe(beats[0]?.params);
    expect(premature?.pause).toBe(0);
    expect(premature?.timing.qOnset).toBeCloseTo(
      prAt(800, premature?.params ?? resolveParams()),
      9,
    );
  });

  it('light the AV node and not the sinus node', () => {
    const clock = createHeartClock({ ...atrial, heartRate: 60 });
    const premature = clock.beatAt(2701);
    expect(premature.premature).toBe(1);
    const { start, timing } = premature;
    expect(cycleState(clock, start + timing.pDuration / 2).excited).toEqual([]);
    expect(cycleState(clock, start + (timing.pDuration + timing.qOnset) / 2).excited).toEqual([
      'av-node',
      'bundle-of-his',
    ]);
  });
});

describe('premature beats off', () => {
  it('change nothing', () => {
    const plain = createHeartClock({ heartRate: 60 }).beatsBetween(0, 5000);
    expect(plain.every((b) => b.premature === 0 && !b.beforePremature)).toBe(true);
  });
});
