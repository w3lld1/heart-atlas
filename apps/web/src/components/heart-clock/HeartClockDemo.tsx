import {
  createHeartClock,
  cycleState,
  presetIds,
  presetLead,
  presetParams,
  presetRateLimits,
  publishCycleSource,
  setsHeartRate,
  switchedHeartRate,
  withdrawCycleSource,
  type CycleSource,
  type HeartParams,
  type Lead,
  type Phase,
  type PresetId,
} from '@heart-atlas/heart-clock';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { currentMotion, MOTION_EVENT } from '../../lib/motion.ts';
import { drawEcg, ecgHeight, maxEcgWidth, readColors, windowMs } from './ecg-canvas.ts';
import { HeartSoundPlayer } from './heart-sounds.ts';
import { drawWiggers, readWiggersColors, wiggersHeight } from './wiggers-canvas.ts';
import styles from './HeartClockDemo.module.css';

export const heartClockMessageKeys = [
  'heartClock.play',
  'heartClock.pause',
  'heartClock.heartRate',
  'heartClock.speed',
  'heartClock.phase',
  'heartClock.phase.atrial-systole',
  'heartClock.phase.isovolumic-contraction',
  'heartClock.phase.ejection',
  'heartClock.phase.isovolumic-relaxation',
  'heartClock.phase.filling',
  'heartClock.phase.pause',
  'heartClock.ecgLabel',
  'heartClock.soundOn',
  'heartClock.soundOff',
  'heartClock.wiggers.title',
  'heartClock.wiggers.label',
  'heartClock.wiggers.description',
  'heartClock.wiggers.pressure',
  'heartClock.wiggers.volume',
  'heartClock.wiggers.ecg',
  'heartClock.wiggers.lv',
  'heartClock.wiggers.aorta',
  'heartClock.wiggers.la',
  'heartClock.wiggers.lvVolume',
  'heartClock.wiggers.systole',
  'heartClock.condition',
  ...presetIds.flatMap(
    (id) =>
      [
        `heartClock.preset.${id}`,
        `heartClock.preset.${id}.summary`,
        `heartClock.preset.${id}.ecg`,
      ] as const,
  ),
] as const;

export type HeartClockMessages = Record<(typeof heartClockMessageKeys)[number], string>;

export interface HeartClockDemoProps {
  /** Locale code from the registry, for number formatting. */
  locale: string;
  messages: HeartClockMessages;
  /** Presets the reader can switch between; without them there is no switch. */
  presets?: readonly PresetId[];
  /** Preset to start with; the first of `presets` by default. */
  preset?: PresetId;
  /** Clock parameters applied on top of the preset. */
  params?: Partial<HeartParams>;
  /** Level of the island's own headings, so they nest under the page's section heading. */
  headingLevel?: 2 | 3;
  /**
   * Lead for every preset, so an article compares normal with its disease in the disease's lead.
   * Without it each preset is drawn in its own lead (`presetLead`).
   */
  lead?: Lead;
}

/** Parameters of a preset with the caller's overrides, or undefined if the two do not fit. */
function mergedParams(id: PresetId, params: Partial<HeartParams> | undefined, lead: Lead) {
  const merged = { ...presetParams(id, lead), ...params };
  try {
    const limits = presetRateLimits(id, merged);
    // presetRateLimits checks every rate itself, so a caller's rate outside them would only fail
    // later, when the clock is created; keep it inside instead. A preset with a rate floor
    // (SVT) also keeps a caller's slower rate at the floor.
    return { params: { ...merged, heartRate: clamp(merged.heartRate, limits) }, limits, lead };
  } catch (error) {
    if (error instanceof RangeError) return undefined;
    throw error;
  }
}

/** The caller's parameters without their heart rate. */
function withoutHeartRate(params: Partial<HeartParams> | undefined): Partial<HeartParams> {
  const rest = { ...params };
  delete rest.heartRate;
  return rest;
}

function clamp(value: number, [min, max]: readonly [number, number]): number {
  return Math.min(max, Math.max(min, value));
}

const speeds = [0.25, 0.5, 1] as const;
/** Longest frame step, so a background tab does not jump the trace when it comes back. */
const maxFrameMs = 100;

export default function HeartClockDemo({
  locale,
  messages: t,
  presets,
  preset,
  params,
  headingLevel = 2,
  lead,
}: HeartClockDemoProps) {
  const Heading = headingLevel === 3 ? 'h3' : 'h2';
  // Presets that fit the caller's parameters, with their parameters and heart rate limits.
  const choices = useMemo(() => {
    const ids = presets ?? [preset ?? 'normal'];
    const initial = preset ?? ids[0];
    // A caller's rate (an embed's ?rate=) applies to the preset the monitor starts with; a preset
    // that sets its own rate (SVT) still starts at it when the reader switches to it later.
    const rateless = withoutHeartRate(params);
    return ids.flatMap((id) => {
      const merged = mergedParams(
        id,
        setsHeartRate(id) && id !== initial ? rateless : params,
        lead ?? presetLead(id),
      );
      return merged ? [{ id, ...merged }] : [];
    });
  }, [presets, preset, params, lead]);
  // The reader's choice, with the heart rate it starts at: the reader's own, or the preset's when
  // switching to or from a preset that sets its rate (switchedHeartRate).
  const [selection, setSelection] = useState<{ id: PresetId; rate: number } | undefined>();
  const choice = choices.find((item) => item.id === (selection?.id ?? preset)) ?? choices[0];
  if (!choice) throw new RangeError('No preset fits these heart clock parameters');
  const presetId = choice.id;
  const limits = choice.limits;
  const selectedRate = selection?.rate;
  // A preset change builds a new clock, so the whole strip and the current beat of the Wiggers
  // diagram show the new preset at once, also while paused.
  const clock = useMemo(
    () =>
      createHeartClock(
        selectedRate === undefined
          ? choice.params
          : { ...choice.params, heartRate: clamp(selectedRate, choice.limits) },
      ),
    [choice, selectedRate],
  );
  const [heartRate, setHeartRate] = useState(clock.params.heartRate);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  // A sinus pause shows as its own phase, though the model keeps the ventricles filling in it. In the
  // pause of second-degree AV block (`blockedP`) the sinus node works, so the phase is filling.
  const [phase, setPhase] = useState<Phase | 'pause'>('atrial-systole');
  const [width, setWidth] = useState(0);
  const [dpr, setDpr] = useState(1);
  const [soundOn, setSoundOn] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wiggersRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  // Clock time shown at the right edge of the strip. Starts one strip in, so the paused
  // first frame already shows a full trace.
  const nowRef = useRef(windowMs(maxEcgWidth));
  // The clock nowRef belongs to: a new clock keeps no history, so time starts over with it.
  const nowClockRef = useRef(clock);
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const audioRef = useRef<AudioContext | null>(null);
  // Set only while sound is on.
  const playerRef = useRef<HeartSoundPlayer | null>(null);

  const wiggersLabels = useMemo(
    () => ({
      pressure: t['heartClock.wiggers.pressure'],
      volume: t['heartClock.wiggers.volume'],
      ecg: t['heartClock.wiggers.ecg'],
    }),
    [t],
  );

  const id = useId();
  const descriptionId = `${id}-description`;

  useEffect(() => {
    setHeartRate(clock.params.heartRate);
  }, [clock]);

  // Motion starts on its own unless the reader asked for reduced motion or turned the site's motion
  // off; turning it off later pauses the clock, and the play button still starts it.
  useEffect(() => {
    const still = () =>
      window.matchMedia('(prefers-reduced-motion: reduce)').matches || currentMotion() === 'off';
    setPlaying(!still());
    const onMotion = () => {
      if (currentMotion() === 'off') setPlaying(false);
    };
    window.addEventListener(MOTION_EVENT, onMotion);
    return () => window.removeEventListener(MOTION_EVENT, onMotion);
  }, []);

  // Redraws sharp after zooming or moving the window to a screen with another pixel ratio.
  useEffect(() => {
    const ratio = window.devicePixelRatio || 1;
    setDpr(ratio);
    const query = window.matchMedia(`(resolution: ${ratio}dppx)`);
    const onChange = () => setDpr(window.devicePixelRatio || 1);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [dpr]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.min(maxEcgWidth, Math.floor(entry.contentRect.width)));
    });
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  // Lets a 3D viewer on the page beat with this clock and show the preset's disease signs. It reads
  // the same time as the strip, so the model matches the monitor; a clock that nowRef has not
  // moved to yet gives no state.
  useEffect(() => {
    const source: CycleSource = () =>
      nowClockRef.current === clock
        ? { ...cycleState(clock, nowRef.current), preset: presetId }
        : null;
    publishCycleSource(source);
    return () => withdrawCycleSource(source);
  }, [clock, presetId]);

  // Draws one frame now and, while playing, on every animation frame.
  useEffect(() => {
    if (nowClockRef.current !== clock) {
      nowClockRef.current = clock;
      nowRef.current = windowMs(maxEcgWidth);
    }
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    const wiggers = wiggersRef.current;
    const wiggersContext = wiggers?.getContext('2d');
    if (!canvas || !context || !wiggers || !wiggersContext || width === 0) return;

    for (const [element, ctx, height] of [
      [canvas, context, ecgHeight],
      [wiggers, wiggersContext, wiggersHeight],
    ] as const) {
      element.width = Math.round(width * dpr);
      element.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    let colors = readColors(canvas);
    let wiggersColors = readWiggersColors(wiggers);
    const scheme = window.matchMedia('(prefers-color-scheme: dark)');
    const onScheme = () => {
      colors = readColors(canvas);
      wiggersColors = readWiggersColors(wiggers);
      render();
    };
    scheme.addEventListener('change', onScheme);

    function render() {
      if (!context || !wiggersContext) return;
      drawEcg(context, width, nowRef.current, clock, colors);
      drawWiggers(wiggersContext, width, nowRef.current, clock, wiggersColors, wiggersLabels);
      const sample = clock.sample(nowRef.current);
      setPhase(sample.pause && sample.beat.params.blockedP === 0 ? 'pause' : sample.phase);
    }

    let frame = 0;
    let last: number | undefined;
    const tick = (time: number) => {
      const step = last === undefined ? 0 : Math.min(maxFrameMs, time - last);
      last = time;
      nowRef.current += step * speedRef.current;
      render();
      playerRef.current?.schedule(clock, nowRef.current, speedRef.current);
      frame = requestAnimationFrame(tick);
    };
    render();
    if (playing) frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      scheme.removeEventListener('change', onScheme);
      playerRef.current?.cancel();
    };
  }, [clock, playing, width, dpr, wiggersLabels]);

  // Closes the audio context when the island goes away.
  useEffect(
    () => () => {
      void audioRef.current?.close();
    },
    [],
  );

  function changeHeartRate(value: number) {
    setHeartRate(value);
    const firstChanged = clock.setParams({ heartRate: value }, nowRef.current);
    playerRef.current?.cancel(firstChanged);
  }

  function changePreset(next: PresetId) {
    const nextChoice = choices.find((item) => item.id === next);
    if (!nextChoice) return;
    const rate = clamp(
      switchedHeartRate(presetId, next, heartRate, nextChoice.params.heartRate),
      nextChoice.limits,
    );
    // Sounds queued for the old clock would play out of step.
    playerRef.current?.cancel();
    setSelection({ id: next, rate });
    setHeartRate(rate);
  }

  function changeSpeed(value: number) {
    setSpeed(value);
    // Queued sounds were timed for the old speed; the next frame queues them again.
    playerRef.current?.cancel();
  }

  // The audio context is created only here, on a click: browsers block sound before a gesture.
  // Everything up to resume() runs synchronously inside the click, so a quick second click
  // sees the player and turns sound off instead of starting a second one.
  function toggleSound() {
    const player = playerRef.current;
    if (player) {
      player.cancel();
      playerRef.current = null;
      setSoundOn(false);
      void audioRef.current?.suspend().catch(() => undefined);
      return;
    }
    // Safari: play through the silent switch, like a media player (not in the TS DOM types yet).
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session) session.type = 'playback';
    try {
      audioRef.current ??= new AudioContext();
    } catch {
      return; // No Web Audio: the button stays off.
    }
    void audioRef.current.resume().catch(() => undefined);
    playerRef.current = new HeartSoundPlayer(audioRef.current);
    setSoundOn(true);
    // Sound follows the trace, so turning it on also starts the trace.
    setPlaying(true);
  }

  const [minRate, maxRate] = limits;
  const speedFormat = new Intl.NumberFormat(locale);
  const description = t[`heartClock.preset.${presetId}.ecg`].replace('{rate}', String(heartRate));

  return (
    <div className={styles['demo']}>
      {choices.length > 1 && (
        <fieldset className={styles['presets']} aria-describedby={`${id}-summary`}>
          <legend>{t['heartClock.condition']}</legend>
          {choices.map((choice) => (
            <label key={choice.id}>
              <input
                type="radio"
                name={`${id}-preset`}
                value={choice.id}
                checked={presetId === choice.id}
                onChange={() => changePreset(choice.id)}
              />
              {t[`heartClock.preset.${choice.id}`]}
            </label>
          ))}
        </fieldset>
      )}
      {choices.length > 1 && (
        <p id={`${id}-summary`} className={styles['summary']}>
          {t[`heartClock.preset.${presetId}.summary`]}
        </p>
      )}
      <div className={styles['controls']}>
        <button
          type="button"
          className={styles['play']}
          onClick={() => setPlaying((value) => !value)}
        >
          {playing ? t['heartClock.pause'] : t['heartClock.play']}
        </button>
        <button type="button" className={styles['play']} onClick={toggleSound}>
          {soundOn ? t['heartClock.soundOff'] : t['heartClock.soundOn']}
        </button>
        <div className={styles['rate']}>
          <label htmlFor={`${id}-rate`}>{t['heartClock.heartRate']}</label>
          <input
            id={`${id}-rate`}
            type="range"
            min={minRate}
            max={maxRate}
            step={1}
            value={heartRate}
            onChange={(event) => changeHeartRate(Number(event.currentTarget.value))}
          />
          <output htmlFor={`${id}-rate`}>{heartRate}</output>
        </div>
        <fieldset className={styles['speed']}>
          <legend>{t['heartClock.speed']}</legend>
          {speeds.map((value) => (
            <label key={value}>
              <input
                type="radio"
                name={`${id}-speed`}
                value={value}
                checked={speed === value}
                onChange={() => changeSpeed(value)}
              />
              ×{speedFormat.format(value)}
            </label>
          ))}
        </fieldset>
      </div>
      <p className={styles['phase']}>
        {t['heartClock.phase']}:{' '}
        <strong data-phase={phase}>{t[`heartClock.phase.${phase}`]}</strong>
      </p>
      {/* ECG paper runs left to right in every language. */}
      <div ref={wrapperRef} className={styles['strip']} dir="ltr">
        <canvas
          ref={canvasRef}
          className={styles['ecg']}
          role="img"
          aria-label={t['heartClock.ecgLabel'].replace('{lead}', choice.lead)}
          aria-describedby={descriptionId}
          style={{ inlineSize: width ? `${width}px` : '100%', blockSize: `${ecgHeight}px` }}
        />
      </div>
      <p id={descriptionId} className={styles['description']}>
        {description}
      </p>
      <Heading className={styles['wiggers-title']}>{t['heartClock.wiggers.title']}</Heading>
      <div className={styles['strip']} dir="ltr">
        <canvas
          ref={wiggersRef}
          className={styles['wiggers']}
          role="img"
          aria-label={t['heartClock.wiggers.label']}
          aria-describedby={`${id}-wiggers`}
          style={{ inlineSize: width ? `${width}px` : '100%', blockSize: `${wiggersHeight}px` }}
        />
      </div>
      <ul className={styles['legend']}>
        {(
          [
            ['lv', 'heartClock.wiggers.lv'],
            ['aorta', 'heartClock.wiggers.aorta'],
            ['la', 'heartClock.wiggers.la'],
            ['volume', 'heartClock.wiggers.lvVolume'],
            ['systole', 'heartClock.wiggers.systole'],
          ] as const
        ).map(([key, label]) => (
          <li key={key} data-series={key}>
            {t[label]}
          </li>
        ))}
      </ul>
      <p id={`${id}-wiggers`} className={styles['description']}>
        {t['heartClock.wiggers.description']}
      </p>
    </div>
  );
}
