import { beatWaves, fWaves } from './ecg.ts';
import { hemodynamics, type Hemodynamics } from './hemodynamics.ts';
import { paramRanges, resolveParams, type HeartParams } from './params.ts';
import { beatTiming, phaseAt, type BeatTiming, type Phase } from './timing.ts';

export interface Beat {
  /** 0 for the first beat of the clock. */
  index: number;
  /** Absolute clock time of the P wave onset, ms. */
  start: number;
  /** Time to the next beat, ms: `timing.rr` plus `pause`. */
  rr: number;
  /** Sinus pause at the end of this beat, ms; 0 for most beats. */
  pause: number;
  timing: BeatTiming;
  /** Parameters this beat was built with; `setParams` affects only later beats. */
  params: Readonly<HeartParams>;
}

export interface ClockSample {
  beat: Beat;
  /** Time since the start of the beat, ms. */
  tInBeat: number;
  phase: Phase;
  /** Whether `t` is in the sinus pause at the end of the beat. */
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
  ecgAt(t: number): number;
  /** Pressures and LV volume at `t`, for the Wiggers diagram. */
  hemodynamicsAt(t: number): Hemodynamics;
  /** ECG at `count` evenly spaced times from `from` to `to`, for drawing a strip in one pass. */
  ecgBetween(from: number, to: number, count: number): Float64Array;
}

/** How far back beats are kept, ms. */
export const historyMs = 10_000;
/** Beats kept after the one that contains the latest queried time. */
const lookAheadBeats = 2;
/** f waves of the previous beat fade into the new ones over this time, ms. */
const fWaveBlendMs = 50;

const minRr = 60000 / paramRanges.heartRate[1];
/** Irregular rhythms are never slower than 40 bpm, or than their mean when that is below 40. */
const slowestRate = 40;

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

/** Sinus pause after beat `index`, ms: after every `pauseEvery`-th beat (assumption: regular). */
function pauseFor(params: HeartParams, index: number): number {
  const every = params.pauseEvery;
  return every > 0 && index % every === every - 1 ? params.pauseDuration : 0;
}

/**
 * Checks that every RR the parameters can produce fits the cardiac cycle, so an invalid
 * combination fails when it is set, not in the middle of playback. The filling margin is not
 * monotonic in RR, so the range is sampled densely.
 */
export function checkParams(params: HeartParams): void {
  const mean = 60000 / params.heartRate;
  const low = clampRr(mean * (1 - params.rrIrregularity), params);
  const high = clampRr(mean * (1 + params.rrIrregularity), params);
  const steps = low === high ? 0 : 256;
  for (let i = 0; i <= steps; i += 1) beatTiming(low + ((high - low) * i) / (steps || 1), params);
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

function smoothstep(x: number): number {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
}

export function createHeartClock(initial: Partial<HeartParams> = {}): HeartClock {
  let params = resolveParams(initial);
  checkParams(params);
  const beats: Beat[] = [];

  function makeBeat(index: number, start: number): Beat {
    const rhythmRr = rrFor(params, index);
    const pause = pauseFor(params, index);
    return {
      index,
      start,
      rr: rhythmRr + pause,
      pause,
      timing: beatTiming(rhythmRr, params),
      params,
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
      last = makeBeat(last.index + 1, last.start + last.rr);
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
  function ecgFrom(i: number, t: number): number {
    const beat = beats[i] as Beat;
    const previous = beats[i - 1];
    let value = fWaves(t, beat.params);
    if (previous && previous.params !== beat.params) {
      // Fade the previous beat's f waves out, so a parameter change does not step the baseline.
      const w = smoothstep((t - beat.start) / fWaveBlendMs);
      value = w * value + (1 - w) * fWaves(t, previous.params);
    }
    for (const b of [previous, beat, beats[i + 1]]) {
      if (b) value += beatWaves(t - b.start, b.timing, b.params);
    }
    return value;
  }

  function beatAt(t: number): Beat {
    return beats[locate(t)] as Beat;
  }

  function ecgAt(t: number): number {
    return ecgFrom(locate(t), t);
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
        phase: phaseAt(tInBeat, beat.timing),
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
    ecgBetween(from, to, count) {
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
        out[k] = ecgFrom(i, t);
      }
      return out;
    },
  };
}
