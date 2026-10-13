import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { currentMotion, MOTION_EVENT } from '../../lib/motion.ts';
import type { ClockSource } from '../heart-clock/sources.ts';
import {
  auscultationEvents,
  heartSoundIds,
  type HeartSoundId,
  type MurmurEvent,
  type Tone,
} from './auscultation.ts';
import { HeartSoundsPlayer, playerClock } from './player.ts';
import styles from './HeartSounds.module.css';

export const heartSoundsMessageKeys = [
  'heartSounds.choose',
  'heartSounds.listen',
  'heartSounds.stop',
  'heartSounds.diagramLabel',
  'heartSounds.systole',
  'heartSounds.diastole',
  'heartSounds.click',
  'heartSounds.openingSnap',
  'heartSounds.sources',
  ...heartSoundIds.flatMap(
    (id) => [`heartSounds.sound.${id}`, `heartSounds.sound.${id}.description`] as const,
  ),
] as const;

export type HeartSoundsMessages = Record<(typeof heartSoundsMessageKeys)[number], string>;

export interface HeartSoundsProps {
  messages: HeartSoundsMessages;
  /** Sounds the reader can switch between; one sound shows no switch. */
  sounds: readonly HeartSoundId[];
  /** Sound to start with; the first of `sounds` by default. */
  sound?: HeartSoundId;
  /** Sources of each sound, listed under its description. */
  sources: Readonly<Partial<Record<HeartSoundId, readonly ClockSource[]>>>;
}

// The diagram: one beat from the onset of the P wave to the next, in SVG user units.
// Narrow, so labels stay readable when a phone scales the drawing down.
const width = 480;
const height = 150;
const baseline = 90;
const toneHeight = 50;
const murmurHeight = 30;

const toneLabels: Record<Tone, keyof HeartSoundsMessages | undefined> = {
  S1: undefined,
  S2: undefined,
  click: 'heartSounds.click',
  'opening-snap': 'heartSounds.openingSnap',
};

/** The murmur as a filled shape around the baseline, as on a phonocardiogram. */
function murmurPoints(murmur: MurmurEvent, x: (time: number) => number): string {
  const top = murmur.envelope.map(
    ([share, level]) =>
      `${x(murmur.start + share * (murmur.end - murmur.start)).toFixed(1)},${(baseline - level * murmurHeight).toFixed(1)}`,
  );
  const bottom = [...murmur.envelope]
    .reverse()
    .map(
      ([share, level]) =>
        `${x(murmur.start + share * (murmur.end - murmur.start)).toFixed(1)},${(baseline + level * murmurHeight).toFixed(1)}`,
    );
  return [...top, ...bottom].join(' ');
}

export default function HeartSounds({ messages: t, sounds, sound, sources }: HeartSoundsProps) {
  const [selected, setSelected] = useState<HeartSoundId>(sound ?? sounds[0] ?? 'normal');
  const [playing, setPlaying] = useState(false);
  const [still, setStill] = useState(true);
  const contextRef = useRef<AudioContext | null>(null);
  const playerRef = useRef<HeartSoundsPlayer | null>(null);
  const cursorRef = useRef<SVGLineElement>(null);
  const id = useId();

  // One beat of the clock the player follows; the diagram is drawn from the same events as the sound.
  const beat = useMemo(() => playerClock().beatAt(0), []);
  const { tones, murmurs } = useMemo(() => auscultationEvents(beat, selected), [beat, selected]);
  const x = (time: number) => ((time - beat.start) / beat.rr) * width;
  const s1 = x(beat.start + beat.timing.rPeak);
  const s2 = x(beat.start + beat.timing.aorticClosure);

  // The cursor moves only when the reader allows motion; the sound plays either way.
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setStill(reduced.matches || currentMotion() === 'off');
    update();
    reduced.addEventListener('change', update);
    window.addEventListener(MOTION_EVENT, update);
    return () => {
      reduced.removeEventListener('change', update);
      window.removeEventListener(MOTION_EVENT, update);
    };
  }, []);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!playing || still || !cursor) return;
    let frame = 0;
    const tick = () => {
      const share = playerRef.current?.position();
      if (share !== undefined) cursor.setAttribute('transform', `translate(${share * width} 0)`);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      cursor.setAttribute('transform', 'translate(0 0)');
    };
  }, [playing, still]);

  // Stops the sound and closes the audio context when the island goes away.
  useEffect(
    () => () => {
      playerRef.current?.stop();
      void contextRef.current?.close();
    },
    [],
  );

  // The audio context is created only here, on a click: browsers block sound before a gesture.
  function toggle() {
    if (playerRef.current?.playing) {
      playerRef.current.stop();
      setPlaying(false);
      // A running context can hold the device's audio session (media controls on iOS).
      void contextRef.current?.suspend().catch(() => undefined);
      return;
    }
    // Safari: play through the silent switch, like a media player (not in the TS DOM types yet).
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session) session.type = 'playback';
    try {
      contextRef.current ??= new AudioContext();
    } catch {
      return; // No Web Audio: the button stays off.
    }
    void contextRef.current.resume().catch(() => undefined);
    playerRef.current ??= new HeartSoundsPlayer(contextRef.current);
    playerRef.current.play(selected);
    setPlaying(true);
  }

  function choose(next: HeartSoundId) {
    setSelected(next);
    // A new sound starts from the beginning of a beat.
    if (playerRef.current?.playing) playerRef.current.play(next);
  }

  const name = t[`heartSounds.sound.${selected}`];
  const descriptionId = `${id}-description`;
  const selectedSources = sources[selected] ?? [];

  return (
    <div className={styles['sounds']}>
      {sounds.length > 1 && (
        <fieldset className={styles['choices']}>
          <legend>{t['heartSounds.choose']}</legend>
          {sounds.map((item) => (
            <label key={item}>
              <input
                type="radio"
                name={`${id}-sound`}
                value={item}
                checked={selected === item}
                onChange={() => choose(item)}
              />
              {t[`heartSounds.sound.${item}`]}
            </label>
          ))}
        </fieldset>
      )}
      <button type="button" className={styles['listen']} onClick={toggle}>
        {playing ? t['heartSounds.stop'] : t['heartSounds.listen']}
      </button>
      {/* Time runs left to right in every language, as on a phonocardiogram. */}
      <div className={styles['diagram']} dir="ltr">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={t['heartSounds.diagramLabel'].replace('{sound}', name)}
          aria-describedby={descriptionId}
          data-sound={selected}
        >
          <rect className={styles['systole']} x={s1} y={10} width={s2 - s1} height={height - 20} />
          <text className={styles['phase']} x={(s1 + s2) / 2} y={24} textAnchor="middle">
            {t['heartSounds.systole']}
          </text>
          <text className={styles['phase']} x={(s2 + width) / 2} y={24} textAnchor="middle">
            {t['heartSounds.diastole']}
          </text>
          <line className={styles['baseline']} x1={0} x2={width} y1={baseline} y2={baseline} />
          {murmurs.map((murmur) => (
            <polygon
              key={`${murmur.start}`}
              className={styles['murmur']}
              data-timbre={murmur.timbre}
              points={murmurPoints(murmur, x)}
            />
          ))}
          {tones.map((tone) => {
            const position = x(tone.time);
            const half = (toneHeight * Math.min(tone.gain, 1.5)) / 1.5;
            const label = toneLabels[tone.tone];
            return (
              <g key={tone.tone} data-tone={tone.tone}>
                <line
                  className={styles['tone']}
                  x1={position}
                  x2={position}
                  y1={baseline - half}
                  y2={baseline + half}
                />
                <text className={styles['label']} x={position} y={height - 4} textAnchor="middle">
                  {label ? t[label] : tone.tone}
                </text>
              </g>
            );
          })}
          <line
            ref={cursorRef}
            className={styles['cursor']}
            x1={0}
            x2={0}
            y1={10}
            y2={height - 20}
            visibility={playing && !still ? 'visible' : 'hidden'}
          />
        </svg>
      </div>
      <p id={descriptionId} className={styles['description']}>
        {t[`heartSounds.sound.${selected}.description`]}
      </p>
      {selectedSources.length > 0 && (
        <div className={styles['sources']}>
          <p>{t['heartSounds.sources']}</p>
          <ul>
            {selectedSources.map((source) => (
              <li key={source.href}>
                <a href={source.href} lang={source.lang}>
                  {source.text}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
