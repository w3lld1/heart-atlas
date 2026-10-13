import type { Beat } from '@heart-atlas/heart-clock';

// What a stethoscope hears in one beat of the heart clock, for the heart sounds player:
// docs/plans/2026-10-13-heart-sounds.md. Facts come from MSD Manual Professional and the Russian
// Ministry of Health guidelines (/mnt/project-files/evidence/heart-murmurs.md); numbers not in
// them are marked `assumption`.

export const heartSoundIds = [
  'normal',
  'aortic-stenosis',
  'aortic-regurgitation',
  'mitral-stenosis',
  'mitral-regurgitation',
  'mitral-valve-prolapse',
] as const;

export type HeartSoundId = (typeof heartSoundIds)[number];

export function isHeartSoundId(value: string): value is HeartSoundId {
  return (heartSoundIds as readonly string[]).includes(value);
}

/** Short sounds: the two heart sounds, a systolic click and the opening snap of the mitral valve. */
export type Tone = 'S1' | 'S2' | 'click' | 'opening-snap';

export interface ToneEvent {
  tone: Tone;
  /** Absolute clock time, ms. */
  time: number;
  /** Loudness relative to a normal heart sound. */
  gain: number;
}

/**
 * Pitch and character of a murmur. harsh: a grating ejection murmur; blowing: a high-pitched
 * regurgitant one; rumble: a low-pitched rumbling one.
 */
export type Timbre = 'harsh' | 'blowing' | 'rumble';

export interface MurmurEvent {
  timbre: Timbre;
  /** Absolute clock time, ms. */
  start: number;
  end: number;
  /**
   * Loudness through the murmur as [share of its length 0–1, level 0–1] points, joined by straight
   * lines; the first point is at 0 and the last at 1.
   */
  envelope: readonly (readonly [number, number])[];
}

export interface Auscultation {
  tones: ToneEvent[];
  murmurs: MurmurEvent[];
}

/** assumption: the gap between a heart sound or click and the murmur next to it, ms. */
const gapMs = 20;
/**
 * The opening snap follows the onset of S2 by 0.06–0.11 s (Минздрав 945_1); assumption: 80 ms,
 * inside that range.
 */
export const openingSnapDelayMs = 80;

/**
 * Sounds of one beat. Times come from the clock: S1 at the R peak (mitral closure), S2 at aortic
 * closure; the beat runs from the onset of its P wave to the next one, so the presystolic part of
 * a diastolic murmur is at the start of the beat and the rest at its end.
 */
export function auscultationEvents(beat: Beat, sound: HeartSoundId): Auscultation {
  const s1 = beat.start + beat.timing.rPeak;
  const s2 = beat.start + beat.timing.aorticClosure;
  const end = beat.start + beat.rr;
  switch (sound) {
    case 'normal':
      return { tones: tones(s1, 1, s2, 1), murmurs: [] };
    case 'aortic-stenosis':
      // MSD AS: a harsh crescendo-decrescendo ejection murmur; S2 single and its aortic part soft
      // (Минздрав 37_2: muffled II sound over the aorta). assumption: S2 at half loudness, the
      // murmur from the opening of the aortic valve to just before S2, peaking in the middle (a
      // moderate stenosis; a severe one peaks later).
      return {
        tones: tones(s1, 1, s2, 0.5),
        murmurs: [
          {
            timbre: 'harsh',
            start: beat.start + beat.timing.ejectionStart,
            end: s2 - gapMs,
            envelope: [
              [0, 0],
              [0.5, 1],
              [1, 0],
            ],
          },
        ],
      };
    case 'aortic-regurgitation': {
      // MSD AR: a blowing, high-pitched decrescendo murmur beginning soon after A2. assumption: it
      // fades out over the first two thirds of diastole.
      const start = s2 + gapMs / 2;
      return {
        tones: tones(s1, 1, s2, 1),
        murmurs: [
          {
            timbre: 'blowing',
            start,
            end: start + ((end - start) * 2) / 3,
            envelope: [
              [0, 1],
              [1, 0],
            ],
          },
        ],
      };
    }
    case 'mitral-stenosis': {
      // MSD MS and Минздрав 945_1: a loud S1, an opening snap after S2, then a low-pitched rumbling
      // diastolic murmur with a presystolic crescendo from atrial contraction. assumption: S1 half
      // again as loud; the rumble falls to a third by mid-diastole and rises from the P wave to S1.
      const snap = s2 + openingSnapDelayMs;
      const low = 0.3;
      return {
        tones: [...tones(s1, 1.5, s2, 1), { tone: 'opening-snap', time: snap, gain: 0.6 }],
        murmurs: [
          {
            timbre: 'rumble',
            start: beat.start,
            end: s1 - gapMs / 2,
            envelope: [
              [0, low],
              [1, 1],
            ],
          },
          {
            timbre: 'rumble',
            start: snap + gapMs,
            end,
            envelope: [
              [0, 0.8],
              [0.5, low],
              [1, low],
            ],
          },
        ],
      };
    }
    case 'mitral-regurgitation':
      // MSD MR: a holosystolic murmur of the same intensity from S1 to S2; Минздрав 881_1: it adjoins
      // a weakened S1. assumption: S1 at half loudness.
      return {
        tones: tones(s1, 0.5, s2, 1),
        murmurs: [
          {
            timbre: 'blowing',
            start: s1 + gapMs / 4,
            end: s2,
            envelope: [
              [0, 1],
              [1, 1],
            ],
          },
        ],
      };
    case 'mitral-valve-prolapse': {
      // MSD MVP and Минздрав 881_1: a mid-systolic click and, with regurgitation, a late systolic
      // murmur. assumption: the click halfway between S1 and S2; the murmur grows a little to S2
      // (MSD MR: when its intensity varies it tends to crescendo up to S2).
      const click = (s1 + s2) / 2;
      return {
        tones: [...tones(s1, 1, s2, 1), { tone: 'click', time: click, gain: 0.7 }],
        murmurs: [
          {
            timbre: 'blowing',
            start: click + gapMs,
            end: s2,
            envelope: [
              [0, 0.6],
              [1, 1],
            ],
          },
        ],
      };
    }
  }
}

function tones(s1: number, s1Gain: number, s2: number, s2Gain: number): ToneEvent[] {
  return [
    { tone: 'S1', time: s1, gain: s1Gain },
    { tone: 'S2', time: s2, gain: s2Gain },
  ];
}

/** Murmur level 0–1 at a share of its length, from its envelope. */
export function envelopeAt(envelope: MurmurEvent['envelope'], share: number): number {
  let previous = envelope[0];
  if (!previous) return 0;
  for (const point of envelope) {
    if (point[0] >= share) {
      if (point[0] === previous[0]) return point[1];
      const k = (share - previous[0]) / (point[0] - previous[0]);
      return previous[1] + k * (point[1] - previous[1]);
    }
    previous = point;
  }
  return previous[1];
}
