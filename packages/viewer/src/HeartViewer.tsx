import {
  Component,
  Fragment,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { subscribeCycleSource, type CycleSource } from '@heart-atlas/heart-clock/cycle-source';
import type { PresetId } from '@heart-atlas/heart-clock';
import { diseaseShapes, diseaseView, type DiseaseId } from './disease.ts';
import {
  HIGHLIGHT_EVENT,
  HIGHLIGHT_READY_ATTR,
  isHighlightEvent,
  MOTION_EVENT,
  motionIsOff,
} from './events.ts';
import { groupStructures, meshesFor } from './highlight.ts';
import styles from './HeartViewer.module.css';
import type { HeartViewerProps, SectionAxis, ViewerMessageKey } from './types.ts';

// three.js and the model load only after the reader asks for 3D or scrolls to it.
const Scene = lazy(() => import('./Scene.tsx'));

const SECTIONS: SectionAxis[] = ['off', 'sagittal', 'frontal', 'transverse'];

/** Heart rate control of the viewer's own clock, beats per minute; inside the clock's range. */
const RATE = { min: 40, max: 180, step: 5, initial: 75 } as const;

/** The viewer's own heart clock, loaded with the first start so the page does not pay for it. */
interface OwnClock {
  setRate(rate: number): void;
  source: CycleSource;
}

/**
 * Longest step of the clock between two frames, ms. A tab coming back from the background resumes
 * where it paused instead of jumping past the clock's kept history.
 */
const MAX_FRAME_MS = 100;

async function startOwnClock(rate: number): Promise<OwnClock> {
  const { createHeartClock, cycleState } = await import('@heart-atlas/heart-clock');
  const clock = createHeartClock({ heartRate: rate });
  let t = 0;
  let last = performance.now();
  const now = () => {
    const time = performance.now();
    t += Math.min(MAX_FRAME_MS, time - last);
    last = time;
    return t;
  };
  return {
    setRate: (heartRate) => clock.setParams({ heartRate }, now()),
    source: () => cycleState(clock, now()),
  };
}

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    // Browsers cap live contexts, so the probe gives its context back at once.
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return gl !== null;
  } catch {
    return false;
  }
}

/** Small or touch screens get the lighter model. */
function prefersLowDetail(): boolean {
  return window.matchMedia('(pointer: coarse), (max-width: 48rem)').matches;
}

class ErrorBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch() {
    this.props.onError();
  }
  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

type Phase = 'idle' | 'loading' | 'ready' | 'error' | 'unsupported';

/** Marker text for the shapes that have a marker. */
const MARKER_KEY: Partial<Record<DiseaseId, ViewerMessageKey>> = {
  'atrial-septal-defect': 'viewer.disease.marker.atrial-septal-defect',
};

const STATUS: Partial<Record<Phase, ViewerMessageKey>> = {
  loading: 'viewer.loading',
  error: 'viewer.error',
  unsupported: 'viewer.unavailable',
};

export default function HeartViewer({
  models,
  poster,
  structures,
  messages: t,
  highlight = [],
  loadOn = 'visible',
  headingLevel = 2,
  cycle: cycleMode,
  disease,
  attribution,
  section: initialSection = 'off',
}: HeartViewerProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [selected, setSelected] = useState<string | null>(null);
  const [external, setExternal] = useState<string[]>(highlight);
  const [ghost, setGhost] = useState(false);
  const [isolate, setIsolate] = useState(false);
  const [section, setSection] = useState<SectionAxis>(initialSection);
  const [sectionPosition, setSectionPosition] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  // Set when the reader pressed the load button, so focus follows them into the model.
  const [focusOnReady, setFocusOnReady] = useState(false);
  // Decided after mount, since the build cannot know the screen: 'auto' turns into a click on phones.
  const [waitForClick, setWaitForClick] = useState(loadOn === 'click');
  const [cycle, setCycle] = useState<CycleSource | null>(null);
  // Preset of the page's heart clock, as the model last read it.
  const [cyclePreset, setCyclePreset] = useState<PresetId | null>(null);
  const [rate, setRate] = useState<number>(RATE.initial);
  const rateRef = useRef<number>(RATE.initial);
  const [startingClock, setStartingClock] = useState(false);
  const ownClock = useRef<OwnClock | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const id = useId();

  const start = useCallback(() => {
    setPhase((p) => (p === 'idle' ? (hasWebGL() ? 'loading' : 'unsupported') : p));
  }, []);

  // No inertia when the reader asked for reduced motion or turned the site's motion off.
  useEffect(() => {
    const update = () => setReducedMotion(motionIsOff());
    update();
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    query.addEventListener('change', update);
    window.addEventListener(MOTION_EVENT, update);
    return () => {
      query.removeEventListener('change', update);
      window.removeEventListener(MOTION_EVENT, update);
    };
  }, []);

  useEffect(() => {
    const click = loadOn === 'click' || (loadOn === 'auto' && prefersLowDetail());
    setWaitForClick(click);
    if (click || !rootRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect();
          start();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(rootRef.current);
    return () => observer.disconnect();
  }, [loadOn, start]);

  // Follow the heart clock island on the page; a viewer that loads later gets its source at once.
  useEffect(() => {
    if (cycleMode !== 'page') return;
    // A function in state would be called as an updater, hence the wrapper.
    return subscribeCycleSource((source) => setCycle(() => source));
  }, [cycleMode]);

  // A press while the clock is still loading cancels the start, like a stop. Each start gets a
  // new number; 0 means none is loading.
  const starting = useRef(0);
  const starts = useRef(0);
  const toggleHeartbeat = useCallback(async () => {
    if (ownClock.current || starting.current) {
      ownClock.current = null;
      starting.current = 0;
      setStartingClock(false);
      setCycle(null);
      return;
    }
    const attempt = ++starts.current;
    starting.current = attempt;
    setStartingClock(true);
    try {
      // The rate as it is once loaded, in case the reader moved the slider meanwhile.
      const clock = await startOwnClock(rateRef.current);
      if (starting.current !== attempt) return;
      clock.setRate(rateRef.current);
      ownClock.current = clock;
      setCycle(() => clock.source);
    } catch {
      // The clock code did not load (offline, stale deploy): the heart stays still and the button
      // offers the start again.
    } finally {
      if (starting.current === attempt) {
        starting.current = 0;
        setStartingClock(false);
      }
    }
  }, []);

  const changeRate = useCallback((value: number) => {
    rateRef.current = value;
    setRate(value);
    ownClock.current?.setRate(value);
  }, []);

  const known = useMemo(() => new Set(structures.map((s) => s.id)), [structures]);

  useEffect(() => {
    const onHighlight = (event: Event) => {
      if (!isHighlightEvent(event)) return;
      setSelected(null);
      setExternal(event.detail.ids.filter((x) => known.has(x)));
    };
    window.addEventListener(HIGHLIGHT_EVENT, onHighlight);
    // Tells page scripts that highlight events now reach this viewer (HIGHLIGHT_READY_ATTR).
    rootRef.current?.setAttribute(HIGHLIGHT_READY_ATTR, '');
    return () => window.removeEventListener(HIGHLIGHT_EVENT, onHighlight);
  }, [known]);

  const active = useMemo(() => (selected ? [selected] : external), [selected, external]);
  const highlighted = useMemo(() => meshesFor(active, structures), [active, structures]);
  const labelOf = (structureId: string | null) =>
    structures.find((s) => s.id === structureId)?.label ?? '';
  const scene = phase === 'loading' || phase === 'ready';
  const url = useMemo(
    () => (scene && prefersLowDetail() ? models.low : models.high),
    [scene, models],
  );
  const onReady = useCallback(() => setPhase('ready'), []);
  const onError = useCallback(() => setPhase('error'), []);

  const select = useCallback(
    (structureId: string) => setSelected((s) => (s === structureId ? null : structureId)),
    [],
  );
  const groupLabel = (group: string) => t[`viewer.group.${group}` as ViewerMessageKey] ?? group;
  const showSchematic = active.some(
    (a) => structures.find((s) => s.id === a)?.group === 'conduction',
  );
  // The scene draws the disease at once; captions wait until the model is on screen, so they never
  // describe a poster or a model that failed to load.
  const sceneView = diseaseView(disease, cyclePreset, cycle !== null);
  const view = phase === 'ready' ? sceneView : diseaseView(disease, null, false);
  const shape = sceneView ? diseaseShapes[sceneView.id] : null;
  const markerKey = sceneView && MARKER_KEY[sceneView.id];
  const captions: string[] = [];
  if (view?.still) captions.push(t[`viewer.disease.${view.id}` as ViewerMessageKey]);
  if (view?.beat) captions.push(t[`viewer.disease.${view.id}.beat` as ViewerMessageKey]);
  const extraSources = view ? diseaseShapes[view.id].sources.extra : undefined;
  const status = STATUS[phase];
  const rateText = t['viewer.heartbeat.rateValue'].replace('{rate}', () => String(rate));
  const Title = `h${headingLevel}` as 'h2' | 'h3' | 'h4';
  const GroupTitle = `h${headingLevel + 1}` as 'h3' | 'h4' | 'h5';

  return (
    <div className={styles.viewer} ref={rootRef}>
      <div className={styles.stage} ref={stageRef} tabIndex={-1}>
        {phase !== 'ready' && (
          <img
            className={styles.poster}
            src={poster}
            alt={t['viewer.posterAlt']}
            width="640"
            height="640"
          />
        )}
        {scene && (
          <ErrorBoundary onError={onError}>
            <Suspense fallback={null}>
              <Scene
                url={url}
                highlighted={highlighted}
                labelFor={active[0] ?? null}
                label={labelOf(active[0] ?? null)}
                ghost={ghost}
                isolate={isolate}
                section={section}
                sectionPosition={sectionPosition}
                canvasLabel={t['viewer.canvasLabel']}
                describedBy={captions.length > 0 ? `${id}-help ${id}-disease` : `${id}-help`}
                reducedMotion={reducedMotion}
                focusOnReady={focusOnReady}
                cycle={cycle}
                disease={shape}
                onPreset={setCyclePreset}
                {...(markerKey ? { markerLabel: t[markerKey] } : {})}
                onReady={onReady}
                onSelect={select}
              />
            </Suspense>
          </ErrorBoundary>
        )}
        {phase === 'idle' && waitForClick && (
          <button
            type="button"
            className={styles.load}
            onClick={() => {
              setFocusOnReady(true);
              // The button disappears; keep focus inside the viewer until the model takes it.
              stageRef.current?.focus();
              start();
            }}
          >
            {t['viewer.load']}
          </button>
        )}
        <p className={status ? styles.overlay : styles.hidden} role="status">
          {status ? t[status] : ''}
        </p>
      </div>

      <div className={styles.panel}>
        <p id={`${id}-help`} className={styles.help}>
          {t['viewer.keyboardHelp']}
        </p>
        <div className={styles.selected}>
          <p aria-live="polite">
            <span>{t['viewer.selected']}: </span>
            <strong>{active.length > 0 ? active.map(labelOf).join(', ') : t['viewer.none']}</strong>
          </p>
          {active.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setExternal([]);
              }}
            >
              {t['viewer.clear']}
            </button>
          )}
        </div>
        {showSchematic && <p className={styles.note}>{t['viewer.schematic']}</p>}
        {captions.length > 0 && (
          <div className={styles.disease}>
            {/* Polite, so a preset switched on the clock is read out. */}
            <div id={`${id}-disease`} aria-live="polite">
              {captions.map((caption) => (
                <p key={caption}>{caption}</p>
              ))}
            </div>
            <p className={styles.note}>{t['viewer.disease.note']}</p>
            {extraSources && (
              <>
                <p id={`${id}-disease-sources`} className={styles.note}>
                  {t['viewer.disease.sources']}
                </p>
                <ul className={styles.note} aria-labelledby={`${id}-disease-sources`}>
                  {extraSources.map((source) => (
                    <li key={source.url}>
                      <a href={source.url} rel="noopener">
                        {source.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        {phase === 'ready' && (
          <div className={styles.options}>
            <label>
              <input type="checkbox" checked={ghost} onChange={(e) => setGhost(e.target.checked)} />
              {t['viewer.ghost']}
            </label>
            <label>
              <input
                type="checkbox"
                checked={isolate}
                onChange={(e) => setIsolate(e.target.checked)}
              />
              {t['viewer.isolate']}
            </label>
            <div className={styles.field}>
              <label htmlFor={`${id}-section`}>{t['viewer.section']}</label>
              <select
                id={`${id}-section`}
                value={section}
                onChange={(e) => setSection(e.target.value as SectionAxis)}
              >
                {SECTIONS.map((s) => (
                  <option key={s} value={s}>
                    {t[`viewer.section.${s}`]}
                  </option>
                ))}
              </select>
            </div>
            {cycleMode === 'own' && (
              <div className={styles.heartbeat}>
                <button type="button" onClick={toggleHeartbeat}>
                  {cycle || startingClock
                    ? t['viewer.heartbeat.stop']
                    : t['viewer.heartbeat.start']}
                </button>
                <div className={styles.field}>
                  <label htmlFor={`${id}-rate`}>{t['viewer.heartbeat.rate']}</label>
                  <input
                    id={`${id}-rate`}
                    type="range"
                    min={RATE.min}
                    max={RATE.max}
                    step={RATE.step}
                    value={rate}
                    aria-valuetext={rateText}
                    onChange={(e) => changeRate(Number(e.target.value))}
                  />
                  {/* aria-valuetext already speaks the value; <output> is a live region in Chromium. */}
                  <output htmlFor={`${id}-rate`} aria-hidden="true">
                    {rateText}
                  </output>
                </div>
                {cycle && <p className={styles.note}>{t['viewer.heartbeat.note']}</p>}
              </div>
            )}
            {section !== 'off' && (
              <div className={styles.field}>
                <label htmlFor={`${id}-position`}>{t['viewer.section.position']}</label>
                <input
                  id={`${id}-position`}
                  type="range"
                  min={-1}
                  max={1}
                  step={0.02}
                  value={sectionPosition}
                  aria-valuetext={`${Math.round((sectionPosition + 1) * 50)}%`}
                  onChange={(e) => setSectionPosition(Number(e.target.value))}
                />
              </div>
            )}
          </div>
        )}

        <Title className={styles['list-title']}>{t['viewer.structures']}</Title>
        {groupStructures(structures).map(([group, items]) => (
          <div key={group} className={styles.group}>
            <GroupTitle className={styles['group-title']}>{groupLabel(group)}</GroupTitle>
            <ul>
              {items.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    aria-pressed={active.includes(s.id)}
                    onClick={() => select(s.id)}
                  >
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <p className={styles.attribution}>
          {t['viewer.attribution'].split('{source}').map((piece, i) => (
            <Fragment key={i}>
              {i > 0 &&
                attribution.map((part, j) => (
                  <Fragment key={j}>
                    {j > 0 && '; '}
                    <span lang={part.lang}>{part.text}</span>
                  </Fragment>
                ))}
              {piece}
            </Fragment>
          ))}
        </p>
      </div>
    </div>
  );
}
