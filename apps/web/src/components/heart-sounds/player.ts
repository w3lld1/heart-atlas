import type { HeartClock } from '@heart-atlas/heart-clock';
import {
  auscultationEvents,
  type HeartSoundId,
  type MurmurEvent,
  type Timbre,
  type Tone,
} from './auscultation.ts';
import { playerClock } from './player-clock.ts';

// Stylised sounds, not recordings. Pitches are higher than real heart sounds so phone speakers can
// play them (model assumption, as for the heart clock's S1 and S2).
const tones: Record<Tone, { frequency: number; duration: number; gain: number }> = {
  S1: { frequency: 110, duration: 0.12, gain: 0.5 },
  S2: { frequency: 170, duration: 0.08, gain: 0.4 },
  // assumption: clicks and the opening snap are higher and shorter than S1 and S2 (MSD).
  click: { frequency: 420, duration: 0.03, gain: 0.35 },
  'opening-snap': { frequency: 320, duration: 0.04, gain: 0.35 },
};

/**
 * Murmurs are filtered white noise. assumption: the band and its width give the timbre: a wide
 * band for a harsh murmur, a higher band for a blowing one, a low band with a 25 Hz flutter for a
 * rumble.
 */
const timbres: Record<Timbre, { frequency: number; q: number; gain: number; flutter?: number }> = {
  harsh: { frequency: 320, q: 0.7, gain: 1.4 },
  blowing: { frequency: 650, q: 1.2, gain: 1.1 },
  rumble: { frequency: 180, q: 1.5, gain: 2.4, flutter: 25 },
};

/**
 * How far ahead sounds are queued on the audio clock, s: a whole beat at the player's rate, so a
 * slowed timer (a background tab) still finds the next beat queued in time.
 */
const lookAheadSeconds = 1;
/** How often the queue is topped up, ms. A timer, not animation frames: those stop in a background tab. */
const tickMs = 50;
/** Delay before the first beat, s, so its first sound is not cut. */
const startDelaySeconds = 0.1;

/**
 * Plays the sounds of one variant in step with the heart clock. Sounds are queued on the audio
 * clock (`AudioContext.currentTime`), and `position` reads the same clock, so a cursor drawn
 * from it matches what is heard.
 */
export class HeartSoundsPlayer {
  readonly #context: AudioContext;
  readonly #noise: AudioBuffer;
  #session:
    | {
        clock: HeartClock;
        sound: HeartSoundId;
        /** Audio time of clock time 0. */
        origin: number;
        output: GainNode;
        timer: ReturnType<typeof setInterval>;
        /** Index of the next beat to queue. */
        next: number;
      }
    | undefined;

  constructor(context: AudioContext) {
    this.#context = context;
    // Two seconds of white noise, shared by every murmur.
    const length = context.sampleRate * 2;
    this.#noise = context.createBuffer(1, length, context.sampleRate);
    const data = this.#noise.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  }

  get playing(): boolean {
    return this.#session !== undefined;
  }

  /** Starts the sound from the beginning of a beat; a sound already playing stops first. */
  play(sound: HeartSoundId): void {
    this.stop();
    const output = this.#context.createGain();
    output.gain.value = 0.8;
    output.connect(this.#context.destination);
    const session = {
      clock: playerClock(),
      sound,
      origin: this.#context.currentTime + startDelaySeconds,
      output,
      timer: setInterval(() => this.#queue(), tickMs),
      next: 0,
    };
    this.#session = session;
    this.#queue();
  }

  /** Stops the sound. The output fades out quickly instead of stopping, which would click. */
  stop(): void {
    const session = this.#session;
    if (!session) return;
    this.#session = undefined;
    clearInterval(session.timer);
    const now = this.#context.currentTime;
    session.output.gain.cancelScheduledValues(now);
    session.output.gain.setTargetAtTime(0, now, 0.01);
    // Sounds queued ahead still play into the output; disconnecting it silences them for good.
    setTimeout(() => session.output.disconnect(), 100);
  }

  /** Where the sound is: the share of the current beat played, 0–1, or undefined when stopped. */
  position(): number | undefined {
    const session = this.#session;
    if (!session) return undefined;
    const t = (this.#context.currentTime - session.origin) * 1000;
    if (t < 0) return 0;
    const { beat, tInBeat } = session.clock.sample(t);
    return tInBeat / beat.rr;
  }

  #queue(): void {
    const session = this.#session;
    if (!session) return;
    const now = this.#context.currentTime;
    const clockNow = Math.max(0, (now - session.origin) * 1000);
    const horizon = (now + lookAheadSeconds - session.origin) * 1000;
    for (const beat of session.clock.beatsBetween(clockNow, horizon)) {
      // A beat is queued whole once it starts within the look-ahead, so its sounds are never late.
      if (beat.index < session.next || beat.start > horizon) continue;
      session.next = beat.index + 1;
      const { tones: toneEvents, murmurs } = auscultationEvents(beat, session.sound);
      const at = (time: number) => session.origin + time / 1000;
      // A beat queued late (a timer held back) drops what is already past instead of playing it
      // all at once.
      for (const event of toneEvents) {
        if (at(event.time) >= now)
          this.#tone(session.output, event.tone, event.gain, at(event.time));
      }
      for (const murmur of murmurs) {
        if (at(murmur.start) >= now) this.#murmur(session.output, murmur, at);
      }
    }
  }

  #tone(output: AudioNode, tone: Tone, level: number, when: number): void {
    const { frequency, duration, gain } = tones[tone];
    const envelope = this.#context.createGain();
    envelope.gain.setValueAtTime(0.0001, when);
    envelope.gain.exponentialRampToValueAtTime(gain * level, when + 0.006);
    envelope.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    envelope.connect(output);
    // A fundamental and a quieter overtone sound less like a pure beep.
    const sources = [1, 2.1].map((multiple, i) => {
      const oscillator = this.#context.createOscillator();
      oscillator.frequency.value = frequency * multiple;
      const partial = this.#context.createGain();
      partial.gain.value = i === 0 ? 1 : 0.3;
      oscillator.connect(partial).connect(envelope);
      oscillator.start(when);
      oscillator.stop(when + duration + 0.02);
      return oscillator;
    });
    sources[0]?.addEventListener('ended', () => envelope.disconnect());
  }

  #murmur(output: AudioNode, murmur: MurmurEvent, at: (time: number) => number): void {
    const { frequency, q, gain, flutter } = timbres[murmur.timbre];
    const start = at(murmur.start);
    const end = at(murmur.end);
    const source = this.#context.createBufferSource();
    source.buffer = this.#noise;
    source.loop = true;
    const filter = this.#context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = q;
    const envelope = this.#context.createGain();
    // Short fades at the ends keep a murmur that starts or stops loud from clicking.
    const fade = 0.008;
    envelope.gain.setValueAtTime(0, start);
    for (const [share, level] of murmur.envelope) {
      const time = start + share * (end - start);
      envelope.gain.linearRampToValueAtTime(
        gain * level,
        Math.min(Math.max(time, start + fade), end - fade),
      );
    }
    envelope.gain.linearRampToValueAtTime(0, end);
    let last: AudioNode = filter;
    if (flutter !== undefined) {
      // A rumble: the noise swells and fades many times a second.
      const tremolo = this.#context.createGain();
      tremolo.gain.value = 0.6;
      const lfo = this.#context.createOscillator();
      lfo.frequency.value = flutter;
      const depth = this.#context.createGain();
      depth.gain.value = 0.4;
      lfo.connect(depth).connect(tremolo.gain);
      lfo.start(start);
      lfo.stop(end + 0.02);
      filter.connect(tremolo);
      last = tremolo;
    }
    source.connect(filter);
    last.connect(envelope).connect(output);
    // Start the shared noise at a random point, so neighbouring murmurs do not repeat it exactly.
    source.start(start, Math.random() * 1.5);
    source.stop(end + 0.02);
    source.addEventListener('ended', () => envelope.disconnect());
  }
}
