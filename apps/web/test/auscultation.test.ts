import { createHeartClock, presetParams, type Beat } from '@heart-atlas/heart-clock';
import { describe, expect, it } from 'vitest';
import {
  auscultationEvents,
  envelopeAt,
  heartSoundIds,
  isHeartSoundId,
  openingSnapDelayMs,
  type HeartSoundId,
} from '../src/components/heart-sounds/auscultation.ts';
import { playerHeartRate } from '../src/components/heart-sounds/player-clock.ts';

const rates = [playerHeartRate, 45, 100];

function beatAt(rate: number, index = 2): Beat {
  const clock = createHeartClock({ ...presetParams('normal'), heartRate: rate });
  const beat = clock.beatsBetween(0, 10_000).find((b) => b.index === index);
  if (!beat) throw new Error('no beat');
  return beat;
}

function times(beat: Beat) {
  return {
    start: beat.start,
    s1: beat.start + beat.timing.rPeak,
    ejection: beat.start + beat.timing.ejectionStart,
    s2: beat.start + beat.timing.aorticClosure,
    end: beat.start + beat.rr,
  };
}

function events(sound: HeartSoundId, beat: Beat) {
  return auscultationEvents(beat, sound);
}

describe.each(rates)('auscultationEvents at %i bpm', (rate) => {
  const beat = beatAt(rate);
  const t = times(beat);

  it('puts S1 at mitral closure and S2 at aortic closure for every sound', () => {
    for (const sound of heartSoundIds) {
      const { tones } = events(sound, beat);
      expect(tones.find((x) => x.tone === 'S1')?.time).toBe(t.s1);
      expect(tones.find((x) => x.tone === 'S2')?.time).toBe(t.s2);
    }
  });

  it('keeps every sound inside its beat, with a well-formed envelope', () => {
    for (const sound of heartSoundIds) {
      const { tones, murmurs } = events(sound, beat);
      for (const tone of tones) {
        expect(tone.time).toBeGreaterThanOrEqual(t.start);
        expect(tone.time).toBeLessThan(t.end);
        expect(tone.gain).toBeGreaterThan(0);
      }
      for (const murmur of murmurs) {
        expect(murmur.start).toBeGreaterThanOrEqual(t.start);
        expect(murmur.end).toBeLessThanOrEqual(t.end);
        expect(murmur.end).toBeGreaterThan(murmur.start);
        expect(murmur.envelope[0]?.[0]).toBe(0);
        expect(murmur.envelope.at(-1)?.[0]).toBe(1);
        for (const [share, level] of murmur.envelope) {
          expect(share).toBeGreaterThanOrEqual(0);
          expect(level).toBeGreaterThanOrEqual(0);
          expect(level).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('has no murmur in the normal heart', () => {
    expect(events('normal', beat).murmurs).toEqual([]);
  });

  it('plays the aortic stenosis murmur in ejection, crescendo-decrescendo, with a soft S2', () => {
    const { tones, murmurs } = events('aortic-stenosis', beat);
    expect(murmurs).toHaveLength(1);
    const [murmur] = murmurs;
    expect(murmur?.timbre).toBe('harsh');
    expect(murmur?.start).toBe(t.ejection);
    expect(murmur?.end).toBeLessThan(t.s2);
    const envelope = murmur?.envelope ?? [];
    expect(envelopeAt(envelope, 0.5)).toBeGreaterThan(envelopeAt(envelope, 0.1));
    expect(envelopeAt(envelope, 0.5)).toBeGreaterThan(envelopeAt(envelope, 0.9));
    expect(tones.find((x) => x.tone === 'S2')?.gain).toBeLessThan(1);
  });

  it('starts the aortic regurgitation murmur at S2 and lets it fade within diastole', () => {
    const [murmur, ...rest] = events('aortic-regurgitation', beat).murmurs;
    expect(rest).toEqual([]);
    expect(murmur?.timbre).toBe('blowing');
    expect(murmur?.start).toBeGreaterThan(t.s2);
    expect(murmur?.start).toBeLessThan(t.s2 + 20);
    expect(murmur?.end).toBeLessThan(t.end);
    const envelope = murmur?.envelope ?? [];
    expect(envelopeAt(envelope, 0)).toBe(1);
    expect(envelopeAt(envelope, 1)).toBe(0);
  });

  it('gives mitral stenosis a loud S1, an opening snap and a rumble with a presystolic crescendo', () => {
    const { tones, murmurs } = events('mitral-stenosis', beat);
    expect(tones.find((x) => x.tone === 'S1')?.gain).toBeGreaterThan(1);
    const snap = tones.find((x) => x.tone === 'opening-snap');
    // Минздрав 945_1: 0.06–0.11 s after the onset of S2.
    expect((snap?.time ?? 0) - t.s2).toBeGreaterThanOrEqual(60);
    expect((snap?.time ?? 0) - t.s2).toBeLessThanOrEqual(110);
    expect(openingSnapDelayMs).toBe((snap?.time ?? 0) - t.s2);
    expect(murmurs.every((m) => m.timbre === 'rumble')).toBe(true);
    const presystolic = murmurs.find((m) => m.start === t.start);
    const diastolic = murmurs.find((m) => m.start > t.s2);
    expect(presystolic?.end).toBeLessThan(t.s1);
    expect(presystolic?.end).toBeGreaterThan(t.s1 - 20);
    expect(envelopeAt(presystolic?.envelope ?? [], 1)).toBe(1);
    expect(diastolic?.start).toBeGreaterThan(snap?.time ?? Infinity);
    expect(diastolic?.end).toBe(t.end);
    // The rumble that ends a beat goes on at the same level in the next beat's presystolic part.
    expect(envelopeAt(diastolic?.envelope ?? [], 1)).toBe(
      envelopeAt(presystolic?.envelope ?? [], 0),
    );
  });

  it('plays the mitral regurgitation murmur through systole at one level, with a soft S1', () => {
    const { tones, murmurs } = events('mitral-regurgitation', beat);
    const [murmur] = murmurs;
    expect(murmur?.timbre).toBe('blowing');
    expect(murmur?.start).toBeGreaterThan(t.s1);
    expect(murmur?.start).toBeLessThan(t.s1 + 10);
    expect(murmur?.end).toBe(t.s2);
    expect(new Set(murmur?.envelope.map(([, level]) => level))).toEqual(new Set([1]));
    expect(tones.find((x) => x.tone === 'S1')?.gain).toBeLessThan(1);
  });

  it('puts the prolapse click in mid-systole and a late systolic murmur after it', () => {
    const { tones, murmurs } = events('mitral-valve-prolapse', beat);
    const click = tones.find((x) => x.tone === 'click');
    expect(click?.time).toBeGreaterThan(t.s1);
    expect(click?.time).toBeLessThan(t.s2);
    const [murmur] = murmurs;
    expect(murmur?.start).toBeGreaterThan(click?.time ?? Infinity);
    expect(murmur?.end).toBe(t.s2);
  });
});

describe('envelopeAt', () => {
  it('interpolates between points and holds the ends', () => {
    const envelope = [
      [0, 0],
      [0.5, 1],
      [1, 0],
    ] as const;
    expect(envelopeAt(envelope, 0)).toBe(0);
    expect(envelopeAt(envelope, 0.25)).toBe(0.5);
    expect(envelopeAt(envelope, 0.5)).toBe(1);
    expect(envelopeAt(envelope, 1)).toBe(0);
    expect(envelopeAt(envelope, 2)).toBe(0);
    expect(envelopeAt([], 0.5)).toBe(0);
  });
});

describe('isHeartSoundId', () => {
  it('accepts the listed sounds only', () => {
    expect(heartSoundIds.every(isHeartSoundId)).toBe(true);
    expect(isHeartSoundId('aortic-stenosis')).toBe(true);
    expect(isHeartSoundId('wpw-syndrome')).toBe(false);
  });
});
