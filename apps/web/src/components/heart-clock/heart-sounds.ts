import { soundEvents, type HeartClock, type HeartSound } from '@heart-atlas/heart-clock';

/**
 * Stylised S1 and S2: decaying sines, not recordings. The pitch is higher than real heart
 * sounds so phone speakers can play it (model assumption, see the stage 2 spec).
 */
const voices: Record<HeartSound, { frequency: number; duration: number; gain: number }> = {
  S1: { frequency: 110, duration: 0.12, gain: 0.5 },
  S2: { frequency: 170, duration: 0.08, gain: 0.4 },
  // The pulmonary component of a split S2, a little lower and quieter than the aortic one.
  P2: { frequency: 150, duration: 0.08, gain: 0.3 },
};

/** How far ahead sounds are queued on the audio clock, in seconds of real time. */
const lookAheadSeconds = 0.25;

interface Queued {
  beatIndex: number;
  /** Audio time when the sound starts. */
  start: number;
  envelope: GainNode;
  /** Audio time when the sound has finished. */
  end: number;
  sources: OscillatorNode[];
}

/**
 * Plays heart sounds in step with the clock. Sounds are queued on the audio clock
 * (`AudioContext.currentTime`), not with timers, so they do not drift with frame timing.
 */
export class HeartSoundPlayer {
  readonly #context: AudioContext;
  readonly #output: GainNode;
  readonly #queued = new Map<string, Queued>();

  constructor(context: AudioContext) {
    this.#context = context;
    this.#output = context.createGain();
    this.#output.gain.value = 0.8;
    this.#output.connect(context.destination);
  }

  /** Queues the sounds due in the next moments. `now` is clock time, `speed` its playback rate. */
  schedule(clock: HeartClock, now: number, speed: number): void {
    const audioNow = this.#context.currentTime;
    // Forget sounds that have finished playing.
    for (const [key, queued] of this.#queued) {
      if (queued.end < audioNow) this.#queued.delete(key);
    }
    const horizon = now + lookAheadSeconds * 1000 * speed;
    for (const beat of clock.beatsBetween(now, horizon)) {
      for (const event of soundEvents(beat)) {
        const key = `${event.beatIndex}-${event.sound}`;
        if (event.time < now || event.time > horizon || this.#queued.has(key)) continue;
        const when = audioNow + (event.time - now) / 1000 / speed;
        this.#queued.set(key, {
          beatIndex: event.beatIndex,
          start: when,
          end: when + voices[event.sound].duration,
          ...this.#play(event.sound, when),
        });
      }
    }
  }

  /**
   * Cancels queued sounds from beat `fromBeat` on (all of them without an argument). A sound
   * that is already playing fades out quickly instead of stopping, which would click.
   */
  cancel(fromBeat = -Infinity): void {
    const now = this.#context.currentTime;
    for (const [key, queued] of this.#queued) {
      if (queued.beatIndex < fromBeat) continue;
      if (queued.start > now) {
        for (const source of queued.sources) source.stop();
      } else {
        queued.envelope.gain.cancelScheduledValues(now);
        queued.envelope.gain.setTargetAtTime(0.0001, now, 0.01);
      }
      this.#queued.delete(key);
    }
  }

  #play(sound: HeartSound, when: number): { envelope: GainNode; sources: OscillatorNode[] } {
    const { frequency, duration, gain } = voices[sound];
    const envelope = this.#context.createGain();
    envelope.gain.setValueAtTime(0.0001, when);
    envelope.gain.exponentialRampToValueAtTime(gain, when + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    envelope.connect(this.#output);
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
    // Disconnect when done, so finished sounds do not keep nodes alive.
    sources[0]?.addEventListener('ended', () => envelope.disconnect());
    return { envelope, sources };
  }
}
