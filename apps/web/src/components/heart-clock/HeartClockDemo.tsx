import {
  createHeartClock,
  cycleState,
  hasPulse,
  monitorPhase,
  presetIds,
  presetLead,
  presetParams,
  presetRateLimits,
  publishCycleSource,
  setsHeartRate,
  switchedHeartRate,
  withdrawCycleSource,
  type CycleSource,
  limbLeads,
  type HeartParams,
  type Lead,
  type LimbLead,
  type Phase,
  type PresetId,
} from '@heart-atlas/heart-clock';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { currentMotion, MOTION_EVENT } from '../../lib/motion.ts';
import { drawEcg, ecgHeight, limbStrip, maxEcgWidth, readColors, windowMs } from './ecg-canvas.ts';
import type { HeartSoundPlayer } from './heart-sounds.ts';
import { drawWiggers, readWiggersColors, wiggersHeight } from './wiggers-canvas.ts';
import { maxSwitchChoices, presetGroup, presetGroups } from './preset-groups.ts';
import styles from './HeartClockDemo.module.css';

export const heartClockMessageKeys = [
  'heartClock.play',
  'heartClock.pause',
  'heartClock.heartRate',
  'heartClock.noPulse',
  'heartClock.speed',
  'heartClock.phase',
  'heartClock.phase.atrial-systole',
  'heartClock.phase.isovolumic-contraction',
  'heartClock.phase.ejection',
  'heartClock.phase.isovolumic-relaxation',
  'heartClock.phase.filling',
  'heartClock.phase.pause',
  'heartClock.phase.fibrillation',
  'heartClock.ecgLabel',
  'heartClock.soundOn',
  'heartClock.soundOff',
  'heartClock.noSounds',
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
  'heartClock.wiggers.noCycles',
  'heartClock.condition',
  ...presetGroups.map((group) => `heartClock.group.${group}` as const),
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
  /**
   * Whether to show the Wiggers diagram. It draws the left ventricle as the one that pumps to the
   * body, so an article where the right ventricle does (corrected transposition) turns it off.
   */
  wiggers?: boolean;
  /**
   * Shows limb leads I, II and III at once for presets drawn in lead II (the default); presets
   * drawn in V1 keep one strip. Spec: docs/plans/2026-10-13-heart-clock-three-leads.md.
   */
  limbLeads?: boolean;
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
  wiggers: showWiggers = true,
  limbLeads: showLimbLeads = true,
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
  // A sinus pause shows as its own phase, though the model keeps the ventricles filling in it
  // (`monitorPhase`).
  const [phase, setPhase] = useState<Phase | 'pause'>('atrial-systole');
  const [width, setWidth] = useState(0);
  const [dpr, setDpr] = useState(1);
  const [soundOn, setSoundOn] = useState(false);
  // Ventricular fibrillation: no pulse, so no rate to set, no heart sounds and no cycles to draw.
  const pulse = hasPulse(choice.params);

  // One strip per limb lead, or one strip with the clock's own trace (lead II or V1).
  const threeStrips = showLimbLeads && choice.lead === 'II';
  const strips: readonly (LimbLead | undefined)[] = useMemo(
    () => (threeStrips ? limbLeads : [undefined]),
    [threeStrips],
  );
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
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
  /** Counts sound on/off clicks, so a player that finishes loading after sound went off is dropped. */
  const soundToken = useRef(0);
  const soundOnRef = useRef(false);

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
    const ecgs = strips.flatMap((lead, k) => {
      const element = canvasRefs.current[k];
      const ctx = element?.getContext('2d');
      return element && ctx ? [{ element, ctx, lead }] : [];
    });
    const canvas = ecgs[0]?.element;
    const wiggers = wiggersRef.current;
    const wiggersContext = wiggers?.getContext('2d');
    if (!canvas || ecgs.length !== strips.length || width === 0) return;

    const canvases: [HTMLCanvasElement, CanvasRenderingContext2D, number][] = ecgs.map(
      ({ element, ctx, lead }) => [element, ctx, lead ? limbStrip.height : ecgHeight],
    );
    if (wiggers && wiggersContext) canvases.push([wiggers, wiggersContext, wiggersHeight]);
    for (const [element, ctx, height] of canvases) {
      element.width = Math.round(width * dpr);
      element.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    let colors = readColors(canvas);
    let wiggersColors = wiggers && readWiggersColors(wiggers);
    const scheme = window.matchMedia('(prefers-color-scheme: dark)');
    const onScheme = () => {
      colors = readColors(canvas);
      wiggersColors = wiggers && readWiggersColors(wiggers);
      render();
    };
    scheme.addEventListener('change', onScheme);

    function render() {
      for (const { ctx, lead } of ecgs) drawEcg(ctx, width, nowRef.current, clock, colors, lead);
      if (wiggersContext && wiggersColors) {
        drawWiggers(wiggersContext, width, nowRef.current, clock, wiggersColors, wiggersLabels);
      }
      const sample = clock.sample(nowRef.current);
      setPhase(monitorPhase(sample));
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
    // showWiggers, pulse and the strips mount and unmount canvases, so their refs must be read again.
  }, [clock, playing, width, dpr, wiggersLabels, showWiggers, pulse, strips]);

  // Closes the audio context when the island goes away.
  useEffect(
    () => () => {
      soundToken.current += 1;
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
  // `soundOnRef` changes synchronously inside the click, so a quick second click turns sound off
  // instead of starting a second player.
  function toggleSound() {
    if (soundOnRef.current) {
      soundOnRef.current = false;
      // Turning sound off while the player's code loads drops the load too (`soundToken`).
      soundToken.current += 1;
      playerRef.current?.cancel();
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
    // The player's code loads on the first click (docs/plans/2026-10-14-lazy-sound-players.md).
    // The context was created above, inside the click, so the sound may start after the import.
    const context = audioRef.current;
    const token = (soundToken.current += 1);
    void import('./heart-sounds.ts')
      .then(({ HeartSoundPlayer }) => {
        if (soundToken.current === token) playerRef.current = new HeartSoundPlayer(context);
      })
      .catch(() => {
        if (soundToken.current !== token) return;
        soundToken.current += 1;
        soundOnRef.current = false;
        setSoundOn(false);
        void context.suspend().catch(() => undefined);
      });
    soundOnRef.current = true;
    setSoundOn(true);
    // Sound follows the trace, so turning it on also starts the trace.
    setPlaying(true);
  }

  const [minRate, maxRate] = limits;
  const speedFormat = new Intl.NumberFormat(locale);
  const description = t[`heartClock.preset.${presetId}.ecg`].replace('{rate}', String(heartRate));

  return (
    <div className={styles['demo']}>
      {choices.length > maxSwitchChoices ? (
        <div className={styles['picker']}>
          <label htmlFor={`${id}-preset`}>{t['heartClock.condition']}</label>
          <select
            id={`${id}-preset`}
            value={presetId}
            aria-describedby={`${id}-summary`}
            onChange={(event) => changePreset(event.currentTarget.value as PresetId)}
          >
            {choices
              .filter((choice) => presetGroup[choice.id] === null)
              .map((choice) => (
                <option key={choice.id} value={choice.id}>
                  {t[`heartClock.preset.${choice.id}`]}
                </option>
              ))}
            {presetGroups.map((group) => {
              const members = choices.filter((choice) => presetGroup[choice.id] === group);
              return (
                members.length > 0 && (
                  <optgroup key={group} label={t[`heartClock.group.${group}`]}>
                    {members.map((choice) => (
                      <option key={choice.id} value={choice.id}>
                        {t[`heartClock.preset.${choice.id}`]}
                      </option>
                    ))}
                  </optgroup>
                )
              );
            })}
          </select>
        </div>
      ) : (
        choices.length > 1 && (
          <fieldset className={styles['presets']} aria-describedby={`${id}-summary`}>
            <legend>{t['heartClock.condition']}</legend>
            <div className={styles['segments']}>
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
            </div>
          </fieldset>
        )
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
          <svg className={styles['icon']} viewBox="0 0 16 16" aria-hidden="true">
            {playing ? <path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" /> : <path d="M4 2.5v11l9.5-5.5z" />}
          </svg>
          {playing ? t['heartClock.pause'] : t['heartClock.play']}
        </button>
        <button
          type="button"
          className={styles['sound']}
          onClick={toggleSound}
          aria-describedby={pulse ? undefined : `${id}-no-sounds`}
        >
          <svg className={styles['icon']} viewBox="0 0 16 16" aria-hidden="true">
            <path d="M2 6h3l4-3.5v11L5 10H2z" />
            {soundOn ? (
              <path d="M11 5.5q1.5 2.5 0 5M12.5 4q3 4 0 8" className={styles['wave']} />
            ) : (
              <path d="M11 6l4 4M15 6l-4 4" className={styles['wave']} />
            )}
          </svg>
          {soundOn ? t['heartClock.soundOff'] : t['heartClock.soundOn']}
        </button>
        {/* The button stays, so silence does not look like a broken sound. */}
        {!pulse && (
          <span id={`${id}-no-sounds`} className={styles['note']}>
            {t['heartClock.noSounds']}
          </span>
        )}
        {pulse ? (
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
        ) : (
          <div className={styles['rate']}>
            <span id={`${id}-rate-label`} className={styles['rate-label']}>
              {t['heartClock.heartRate']}
            </span>
            <output aria-labelledby={`${id}-rate-label`}>{t['heartClock.noPulse']}</output>
          </div>
        )}
        <fieldset className={styles['speed']}>
          <legend>{t['heartClock.speed']}</legend>
          <div className={styles['segments']}>
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
          </div>
        </fieldset>
      </div>
      <p className={styles['phase']}>
        {t['heartClock.phase']}:{' '}
        <strong data-phase={phase}>{t[`heartClock.phase.${phase}`]}</strong>
      </p>
      {/* ECG paper runs left to right in every language. */}
      <div ref={wrapperRef} className={styles['strip']} dir="ltr">
        {strips.map((lead, k) => (
          <canvas
            key={lead ?? choice.lead}
            ref={(element) => {
              canvasRefs.current[k] = element;
            }}
            className={styles['ecg']}
            role="img"
            aria-label={t['heartClock.ecgLabel'].replace('{lead}', lead ?? choice.lead)}
            // The rhythm description is read once, with the strip it describes: II, or V1.
            aria-describedby={(lead ?? choice.lead) === choice.lead ? descriptionId : undefined}
            style={{
              inlineSize: width ? `${width}px` : '100%',
              blockSize: `${lead ? limbStrip.height : ecgHeight}px`,
            }}
          />
        ))}
      </div>
      <p id={descriptionId} className={styles['description']}>
        {description}
      </p>
      {showWiggers && (
        <>
          <Heading className={styles['wiggers-title']}>{t['heartClock.wiggers.title']}</Heading>
          {pulse ? (
            <>
              <div className={styles['strip']} dir="ltr">
                <canvas
                  ref={wiggersRef}
                  className={styles['wiggers']}
                  role="img"
                  aria-label={t['heartClock.wiggers.label']}
                  aria-describedby={`${id}-wiggers`}
                  style={{
                    inlineSize: width ? `${width}px` : '100%',
                    blockSize: `${wiggersHeight}px`,
                  }}
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
            </>
          ) : (
            <p className={styles['no-cycles']}>{t['heartClock.wiggers.noCycles']}</p>
          )}
        </>
      )}
    </div>
  );
}
