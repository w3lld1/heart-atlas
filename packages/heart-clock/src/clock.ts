import { leadGains, unitGains, type LimbLead } from './leads.ts';
import { beatWaves, dissociatedP, flutterWaves, fWaves, pWave } from './ecg.ts';
import { hemodynamics, type Hemodynamics } from './hemodynamics.ts';
import { defaultRateLimits, paramRanges, resolveParams, type HeartParams } from './params.ts';
import { beatTiming, phaseAt, prAt, type BeatTiming, type Phase } from './timing.ts';

export interface Beat {
  /** 0 for the first beat of the clock. */
  index: number;
  /** Absolute clock time of the P wave onset, ms. */
  start: number;
  /** Time to the next beat, ms: `timing.rr` plus `pause`. */
  rr: number;
  /**
   * Pause at the end of this beat, ms; 0 for most beats. A sinus pause is silent; with `blockedP`
   * it is one rhythm RR that starts with a P wave without a QRS; after a ventricular premature beat
   * it lasts until the next sinus beat.
   */
  pause: number;
  /** 0 for a sinus beat, 1 for an atrial and 2 for a ventricular premature beat. */
  premature: 0 | 1 | 2;
  /** Whether this beat is cut short because the next one is premature. */
  beforePremature: boolean;
  timing: BeatTiming;
  /** Parameters this beat was built with; `setParams` affects only later beats. */
  params: Readonly<HeartParams>;
}

export interface ClockSample {
  beat: Beat;
  /** Time since the start of the beat, ms. */
  tInBeat: number;
  phase: Phase;
  /**
   * Whether `t` is in the pause at the end of the beat: a sinus pause, a blocked P wave, or the
   * wait for the next sinus beat after a ventricular premature beat.
   */
  pause: boolean;
  /** ECG, mV. */
  ecg: number;
}

export interface HeartClock {
  /** Parameters for beats that have not started yet. */
  readonly params: Readonly<HeartParams>;
  /**
   * Applies a patch from the first beat that starts after `t` and rebuilds the beats after it.
   * Returns the index of the first rebuilt beat, so a caller that scheduled sound for look-ahead
   * beats can cancel what it queued from that beat on. Throws RangeError if the patch is invalid.
   */
  setParams(patch: Partial<HeartParams>, t: number): number;
  /** The beat that contains `t`; a beat owns its start and not its end. */
  beatAt(t: number): Beat;
  /** Beats that overlap [from, to]. The span must fit in the kept history. */
  beatsBetween(from: number, to: number): Beat[];
  sample(t: number): ClockSample;
  /**
   * ECG at `t`, mV. With `lead` it is limb lead I, II or III (`leadGains`); without it the beat's
   * amplitudes are drawn as they are, which is lead II, or V1 for a clock with V1 parameters. A V1
   * clock has no limb leads: asking it for one draws nothing meaningful.
   */
  ecgAt(t: number, lead?: LimbLead): number;
  /** Pressures and LV volume at `t`, for the Wiggers diagram. */
  hemodynamicsAt(t: number): Hemodynamics;
  /** ECG at `count` evenly spaced times from `from` to `to`, for drawing a strip in one pass. */
  ecgBetween(from: number, to: number, count: number, lead?: LimbLead): Float64Array;
}

/** How far back beats are kept, ms. */
export const historyMs = 10_000;
/** Beats kept after the one that contains the latest queried time. */
const lookAheadBeats = 2;
/** f and F waves and P waves on their own clock of the previous beat fade into the new ones over this time, ms. */
const fWaveBlendMs = 50;

const minRr = 60000 / paramRanges.heartRate[1];
/** Irregular rhythms are never slower than 40 bpm, or than their mean when that is below 40. */
const slowestRate = defaultRateLimits[0];

/** Uniform number in [0, 1) from a seed and a beat index; the same inputs give the same number. */
function unitRandom(seed: number, index: number): number {
  let x = (seed ^ Math.imul(index + 1, 0x9e3779b9)) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 2 ** 32;
}

function clampRr(rr: number, params: HeartParams): number {
  const maxRr = 60000 / Math.min(slowestRate, params.heartRate);
  return Math.min(maxRr, Math.max(minRr, rr));
}

function rrFor(params: HeartParams, index: number): number {
  const mean = 60000 / params.heartRate;
  const spread = params.rrIrregularity * (2 * unitRandom(params.seed, index) - 1);
  return clampRr(mean * (1 + spread), params);
}

/**
 * Pause after beat `index`, ms: after every `pauseEvery`-th beat (assumption: regular). A sinus
 * pause lasts `pauseDuration`; with `blockedP` the sinus node goes on, and the pause is the rhythm
 * RR (`rhythmRr`) of the P wave that is not conducted. f waves (`fWaveAmplitude`) are atrial
 * activity, so they go on through a pause.
 */
function pauseFor(params: HeartParams, index: number, rhythmRr: number): number {
  const every = params.pauseEvery;
  if (every === 0 || index % every !== every - 1) return 0;
  return params.blockedP === 1 ? rhythmRr : params.pauseDuration;
}

/** Extra PR of beat `index`, ms: `prStep` for every beat before it in its group (Mobitz I). */
function prExtraFor(params: HeartParams, index: number): number {
  return params.pauseEvery > 0 ? (index % params.pauseEvery) * params.prStep : 0;
}

/**
 * Shape of a ventricular premature beat: no P wave, one wide R wave, a T wave the other way.
 * assumption: QRS 140 ms (sources: at least 120 ms), T -0.3 mV, no atrial share of filling.
 * Spec: docs/plans/2026-10-13-heart-clock-premature-beats.md.
 */
const ventricularPrematureShape = {
  pAmplitude: 0,
  qrsDuration: 140,
  qAmplitude: 0,
  sAmplitude: 0,
  rNotch: 0,
  tAmplitude: -0.3,
  stShift: 0,
  stSlope: 0,
  atrialContribution: 0,
  prematureEvery: 0,
  prematureOrigin: 0,
  // Idiopathic premature beats from a ventricular outflow tract have a vertical downward axis,
  // with a near-isoelectric QRS in lead I (MSD Manuals, Ventricular Premature Beats, 2024); the
  // T wave points opposite to the QRS (ESC 2022 ventricular arrhythmias, §3.1). The model draws
  // that kind. assumption: +85° for both, so lead I keeps a small QRS rather than a flat line; the
  // T is negative already.
  qrsAxis: 85,
  tAxis: 85,
} as const satisfies Partial<HeartParams>;

const ventricularPrematureCache = new WeakMap<HeartParams, Readonly<HeartParams>>();

/** Parameters of a ventricular premature beat in a rhythm with these parameters. */
export function ventricularPrematureParams(params: Readonly<HeartParams>): Readonly<HeartParams> {
  let result = ventricularPrematureCache.get(params);
  if (!result) {
    result = resolveParams(ventricularPrematureShape, params);
    ventricularPrematureCache.set(params, result);
  }
  return result;
}

/**
 * Timing of the beat before a premature beat: it lasts `coupling` of the rhythm RR, so its phases
 * come from that shorter RR (they do not fit the rhythm's), but it keeps the rhythm's PR.
 */
function beforePrematureTiming(rr: number, params: HeartParams): BeatTiming {
  const cut = params.prematureCoupling * rr;
  return beatTiming(cut, params, prAt(rr, params) - prAt(cut, params));
}

/** Timing of a ventricular premature beat: its QRS starts with the beat. */
function ventricularPrematureTiming(rr: number, params: HeartParams): BeatTiming {
  return beatTiming(rr, params, -prAt(rr, params));
}

/**
 * Checks that every RR the parameters can produce fits the cardiac cycle, so an invalid
 * combination fails when it is set, not in the middle of playback. The filling margin is not
 * monotonic in RR, so the range is sampled densely.
 */
export function checkParams(params: HeartParams): void {
  // Complete AV block: by definition the P wave rate is above the QRS rate (MSD Manuals,
  // Atrioventricular Block, 2024). Checked here, so the heart rate limits respect it.
  if (params.atrialRate > 0 && params.atrialRate <= params.heartRate) {
    throw new RangeError(
      `atrialRate (${params.atrialRate}) must be above heartRate (${params.heartRate})`,
    );
  }
  const mean = 60000 / params.heartRate;
  const low = clampRr(mean * (1 - params.rrIrregularity), params);
  const high = clampRr(mean * (1 + params.rrIrregularity), params);
  const steps = low === high ? 0 : 256;
  // With `prStep` the last beat of a group has the longest PR. A longer PR moves R and every later
  // moment by the same amount, so only the end of the beat can stop fitting: the longest PR is the
  // one to check.
  const longest = params.pauseEvery > 0 ? (params.pauseEvery - 1) * params.prStep : 0;
  const premature = params.prematureEvery > 0 ? ventricularPrematureParams(params) : undefined;
  for (let i = 0; i <= steps; i += 1) {
    const rr = low + ((high - low) * i) / (steps || 1);
    beatTiming(rr, params, longest);
    if (premature) {
      beforePrematureTiming(rr, params);
      if (params.prematureOrigin === 2) ventricularPrematureTiming(rr, premature);
    }
  }
}

/**
 * The widest unbroken range of whole heart rates, beats per minute, at which these parameters fit,
 * so a heart rate control can offer only those. A wide QRS, for example, does not fit the fastest
 * rates. Every rate inside the range is checked, so a gap cannot hide in it.
 */
export function heartRateLimits(params: HeartParams): readonly [min: number, max: number] {
  const [low, high] = paramRanges.heartRate;
  const fits = (heartRate: number) => {
    try {
      checkParams({ ...params, heartRate });
      return true;
    } catch (error) {
      if (error instanceof RangeError) return false;
      throw error;
    }
  };
  let best: [number, number] | undefined;
  let start: number | undefined;
  for (let rate = Math.ceil(low); rate <= Math.floor(high) + 1; rate += 1) {
    if (rate <= high && fits(rate)) {
      start ??= rate;
    } else if (start !== undefined) {
      if (!best || rate - 1 - start > best[1] - best[0]) best = [start, rate - 1];
      start = undefined;
    }
  }
  if (!best) throw new RangeError('These parameters do not fit any heart rate');
  return best;
}

/**
 * What the monitor shows at a sample: the phase, or a sinus pause. A pause with a blocked P wave,
 * or after a ventricular premature beat, keeps the sinus node going, so it shows as filling.
 */
export function monitorPhase(sample: ClockSample): Phase | 'pause' {
  const { beat } = sample;
  return sample.pause && beat.params.blockedP === 0 && beat.premature !== 2
    ? 'pause'
    : sample.phase;
}

function smoothstep(x: number): number {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
}

export function createHeartClock(initial: Partial<HeartParams> = {}): HeartClock {
  let params = resolveParams(initial);
  checkParams(params);
  const beats: Beat[] = [];

  /**
   * Beat `index` starting at `start`. A premature beat follows a beat marked `beforePremature`
   * and is built from that beat's parameters, which passed `checkParams` together with it, so a
   * parameter change between them cannot leave one without the other or make a beat that does
   * not fit.
   */
  function makeBeat(index: number, start: number, previous?: Beat): Beat {
    const before = previous?.beforePremature ? previous : undefined;
    const beatParams = before ? before.params : params;
    const origin = before ? beatParams.prematureOrigin : 0;
    const rhythmRr = rrFor(beatParams, index);
    if (origin === 2) {
      // Full compensatory pause: the next sinus beat comes two rhythm RRs after the start of the
      // beat before this one (assumption: the sources do not define it in RRs).
      const prematureParams = ventricularPrematureParams(beatParams);
      const pause = (1 - beatParams.prematureCoupling) * rhythmRr;
      return {
        index,
        start,
        rr: rhythmRr + pause,
        pause,
        premature: 2,
        beforePremature: false,
        timing: ventricularPrematureTiming(rhythmRr, prematureParams),
        params: prematureParams,
      };
    }
    const every = beatParams.prematureEvery;
    const beforePremature = every > 0 && index % every === every - 2;
    const pause = pauseFor(beatParams, index, rhythmRr);
    const timing = beforePremature
      ? beforePrematureTiming(rhythmRr, beatParams)
      : beatTiming(rhythmRr, beatParams, prExtraFor(beatParams, index));
    return {
      index,
      start,
      rr: timing.rr + pause,
      pause,
      // An atrial premature beat resets the sinus node: the next beat comes one rhythm RR after it.
      premature: origin === 1 ? 1 : 0,
      beforePremature,
      timing,
      params: beatParams,
    };
  }

  function checkTime(t: number): void {
    if (!Number.isFinite(t) || t < 0) throw new RangeError(`Clock time must be ≥ 0, got ${t}`);
    const first = beats[0];
    if (first && t < first.start) {
      throw new RangeError(`Clock time ${t} ms is older than the kept history`);
    }
  }

  /** Extends the schedule to cover `t` plus the look-ahead; prunes history older than `t`. */
  function extend(t: number, prune: boolean): void {
    if (beats.length === 0) beats.push(makeBeat(0, 0));
    let last = beats[beats.length - 1] as Beat;
    // After a long jump (a tab in the background) start a fresh run of beats at `t`
    // instead of generating every beat in between.
    if (t - (last.start + last.rr) > historyMs) {
      beats.length = 0;
      last = makeBeat(last.index + 1, t);
      beats.push(last);
    }
    let ahead = 0;
    for (let i = beats.length - 1; i >= 0 && (beats[i] as Beat).start > t; i -= 1) ahead += 1;
    while (ahead < lookAheadBeats) {
      last = makeBeat(last.index + 1, last.start + last.rr, last);
      beats.push(last);
      if (last.start > t) ahead += 1;
    }
    if (prune) {
      let drop = 0;
      while (
        drop < beats.length - 1 &&
        (beats[drop] as Beat).start + (beats[drop] as Beat).rr < t - historyMs
      ) {
        drop += 1;
      }
      if (drop > 0) beats.splice(0, drop);
    }
  }

  /** Index in `beats` of the beat that contains `t` (binary search; beats are sorted). */
  function find(t: number): number {
    let low = 0;
    let high = beats.length - 1;
    while (low < high) {
      const mid = (low + high + 1) >> 1;
      if ((beats[mid] as Beat).start <= t) low = mid;
      else high = mid - 1;
    }
    return low;
  }

  function locate(t: number, prune = true): number {
    checkTime(t);
    extend(t, prune);
    checkTime(t);
    return find(t);
  }

  /** ECG at `t` given the index of the beat that contains it. */
  function ecgFrom(i: number, t: number, lead?: LimbLead): number {
    const beat = beats[i] as Beat;
    const previous = beats[i - 1];
    const gainsOf = (b: Beat) => (lead ? leadGains(b.params, lead) : unitGains);
    const atrial = (b: Beat) => {
      const gains = gainsOf(b);
      return (
        gains.f * (fWaves(t, b.params) + flutterWaves(t - b.start, b.timing, b.params)) +
        gains.p * dissociatedP(t, b.params)
      );
    };
    let value = atrial(beat);
    if (previous && previous.params !== beat.params) {
      // Fade the previous beat's f or F waves out, so a parameter change does not step the baseline.
      const w = smoothstep((t - beat.start) / fWaveBlendMs);
      value = w * value + (1 - w) * atrial(previous);
    }
    for (const b of [previous, beat, beats[i + 1]]) {
      if (!b) continue;
      const gains = gainsOf(b);
      value += beatWaves(t - b.start, b.timing, b.params, gains);
      // Second-degree AV block: the P wave at the start of the pause has no QRS after it.
      if (b.pause > 0 && b.params.blockedP === 1) {
        value += gains.p * pWave(t - b.start - b.timing.rr, b.timing.pDuration, b.params);
      }
    }
    return value;
  }

  function beatAt(t: number): Beat {
    return beats[locate(t)] as Beat;
  }

  function ecgAt(t: number, lead?: LimbLead): number {
    return ecgFrom(locate(t), t, lead);
  }

  return {
    get params() {
      return params;
    },
    setParams(patch, t) {
      const next = resolveParams(patch, params);
      checkParams(next);
      const current = locate(t, false);
      params = next;
      beats.splice(current + 1);
      extend(t, false);
      return (beats[current] as Beat).index + 1;
    },
    beatAt,
    beatsBetween(from, to) {
      if (to < from) throw new RangeError(`beatsBetween: to (${to}) is before from (${from})`);
      locate(to, false);
      const first = locate(from);
      const result: Beat[] = [];
      for (let i = first; i < beats.length && (beats[i] as Beat).start <= to; i += 1) {
        result.push(beats[i] as Beat);
      }
      return result;
    },
    sample(t) {
      const i = locate(t);
      const beat = beats[i] as Beat;
      const tInBeat = t - beat.start;
      return {
        beat,
        tInBeat,
        phase: phaseAt(tInBeat, beat.timing, beat.params),
        pause: tInBeat >= beat.timing.rr,
        ecg: ecgFrom(i, t),
      };
    },
    ecgAt,
    hemodynamicsAt(t) {
      const i = locate(t);
      const beat = beats[i] as Beat;
      // Before the first beat there is no previous one; a copy of this beat stands in for it.
      const previous = beats[i - 1] ?? {
        ...beat,
        index: beat.index - 1,
        start: beat.start - beat.rr,
      };
      return hemodynamics(t - beat.start, beat, previous, beats[i + 1] as Beat);
    },
    ecgBetween(from, to, count, lead) {
      if (!Number.isInteger(count) || count < 2) {
        throw new RangeError(`ecgBetween: count must be an integer ≥ 2, got ${count}`);
      }
      if (to < from) throw new RangeError(`ecgBetween: to (${to}) is before from (${from})`);
      locate(to, false);
      let i = locate(from);
      const out = new Float64Array(count);
      const step = (to - from) / (count - 1);
      for (let k = 0; k < count; k += 1) {
        const t = from + k * step;
        while (i + 1 < beats.length && (beats[i + 1] as Beat).start <= t) i += 1;
        out[k] = ecgFrom(i, t, lead);
      }
      return out;
    },
  };
}
