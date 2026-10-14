import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { currentMotion, MOTION_EVENT } from '../../lib/motion.ts';
import {
  auscultationEvents,
  heartSoundIds,
  type HeartSoundId,
  type MurmurEvent,
  type Tone,
} from './auscultation.ts';
import type { HeartSoundsPlayer } from './player.ts';
import { playerClock } from './player-clock.ts';
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
  'sources.cite',
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
  /**
   * Numbers of each sound's sources in the page's numbered source list (`#source-<n>`), cited after
   * its description, as `<Cite>` does in an article.
   */
  citations: Readonly<Partial<Record<HeartSoundId, readonly number[]>>>;
}

// The diagram: one beat from the onset of the P wave to the next, in SVG user units. Its labels
// are HTML around the drawing, so they keep the text size however wide the drawing is.
const width = 480;
const height = 120;
const baseline = height / 2;
const toneHeight = 50;
const murmurHeight = 30;
const percent = (x: number) => `${((x / width) * 100).toFixed(2)}%`;

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

export default function HeartSounds({ messages: t, sounds, sound, citations }: HeartSoundsProps) {
  const [selected, setSelected] = useState<HeartSoundId>(sound ?? sounds[0] ?? 'normal');
  const [playing, setPlaying] = useState(false);
  const [still, setStill] = useState(true);
  const contextRef = useRef<AudioContext | null>(null);
  const playerRef = useRef<HeartSoundsPlayer | null>(null);
  // The sound the reader asked for while the player's code was still loading.
  const wantedRef = useRef<HeartSoundId | null>(null);
  const disposedRef = useRef(false);
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
      disposedRef.current = true;
      wantedRef.current = null;
      playerRef.current?.stop();
      void contextRef.current?.close();
    },
    [],
  );

  // The audio context is created only here, on a click: browsers block sound before a gesture.
  function toggle() {
    if (playerRef.current?.playing || wantedRef.current !== null) {
      wantedRef.current = null;
      playerRef.current?.stop();
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
    setPlaying(true);
    if (playerRef.current) {
      playerRef.current.play(selected);
      return;
    }
    // The player's code loads on the first "Listen" (docs/plans/2026-10-14-lazy-sound-players.md).
    // The context was created above, inside the click, so the sound may start after the import.
    const context = contextRef.current;
    // Older iOS plays later sounds only if one started inside the click: a silent sample does.
    const silence = context.createBufferSource();
    silence.buffer = context.createBuffer(1, 1, context.sampleRate);
    silence.connect(context.destination);
    silence.start();
    wantedRef.current = selected;
    void import('./player.ts')
      .then(({ HeartSoundsPlayer }) => {
        if (disposedRef.current) return;
        const wanted = wantedRef.current;
        if (wanted === null) return; // Stopped while loading.
        wantedRef.current = null;
        playerRef.current ??= new HeartSoundsPlayer(context);
        playerRef.current.play(wanted);
      })
      .catch(() => {
        if (disposedRef.current) return;
        wantedRef.current = null;
        setPlaying(false);
        void context.suspend().catch(() => undefined);
      });
  }

  function choose(next: HeartSoundId) {
    setSelected(next);
    if (wantedRef.current !== null) wantedRef.current = next;
    // A new sound starts from the beginning of a beat.
    if (playerRef.current?.playing) playerRef.current.play(next);
  }

  const name = t[`heartSounds.sound.${selected}`];
  const descriptionId = `${id}-description`;
  const cited = citations[selected] ?? [];

  return (
    <div className={styles['sounds']}>
      {sounds.length > 1 && (
        <fieldset className={styles['choices']}>
          <legend>{t['heartSounds.choose']}</legend>
          <div className={styles['segments']}>
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
          </div>
        </fieldset>
      )}
      <button type="button" className={styles['listen']} onClick={toggle}>
        <svg className={styles['icon']} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          {playing ? (
            <rect x={3} y={3} width={10} height={10} rx={1} />
          ) : (
            <path d="M4 2.5v11l9.5-5.5z" />
          )}
        </svg>
        {playing ? t['heartSounds.stop'] : t['heartSounds.listen']}
      </button>
      {/* Time runs left to right in every language, as on a phonocardiogram. */}
      <div className={styles['diagram']} dir="ltr">
        <div className={styles['phases']} aria-hidden="true">
          <span style={{ insetInlineStart: percent((s1 + s2) / 2) }}>
            {t['heartSounds.systole']}
          </span>
          <span style={{ insetInlineStart: percent((s2 + width) / 2) }}>
            {t['heartSounds.diastole']}
          </span>
        </div>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={t['heartSounds.diagramLabel'].replace('{sound}', name)}
          aria-describedby={descriptionId}
          data-sound={selected}
        >
          <rect className={styles['systole']} x={s1} y={0} width={s2 - s1} height={height} />
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
            return (
              <g key={tone.tone} data-tone={tone.tone}>
                <line
                  className={styles['tone']}
                  x1={position}
                  x2={position}
                  y1={baseline - half}
                  y2={baseline + half}
                />
              </g>
            );
          })}
          <line
            ref={cursorRef}
            className={styles['cursor']}
            x1={0}
            x2={0}
            y1={0}
            y2={height}
            visibility={playing && !still ? 'visible' : 'hidden'}
          />
        </svg>
        <div className={styles['tones']} aria-hidden="true">
          {tones.map((tone) => {
            const label = toneLabels[tone.tone];
            return (
              <span
                key={tone.tone}
                // Extra sounds sit on a second row: an opening snap is too close to S2 to share one.
                data-row={label ? 2 : 1}
                style={{ insetInlineStart: percent(x(tone.time)) }}
              >
                {label ? t[label] : tone.tone}
              </span>
            );
          })}
        </div>
      </div>
      <p className={styles['description']}>
        {/* The diagram is described by the text alone, without the citation numbers. */}
        <span id={descriptionId}>{t[`heartSounds.sound.${selected}.description`]}</span>
        {cited.length > 0 && (
          <sup className={styles['cite']}>
            [
            {cited.map((n, i) => (
              <span key={n}>
                {i > 0 && ', '}
                <a href={`#source-${n}`} aria-label={t['sources.cite'].replace('{n}', String(n))}>
                  {n}
                </a>
              </span>
            ))}
            ]
          </sup>
        )}
      </p>
    </div>
  );
}
