import {
  Component,
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
import { HIGHLIGHT_EVENT, isHighlightEvent } from './events.ts';
import { groupStructures, meshesFor } from './highlight.ts';
import styles from './HeartViewer.module.css';
import type { HeartViewerProps, SectionAxis, ViewerMessageKey } from './types.ts';

// three.js and the model load only after the reader asks for 3D or scrolls to it.
const Scene = lazy(() => import('./Scene.tsx'));

const SECTIONS: SectionAxis[] = ['off', 'sagittal', 'frontal', 'transverse'];

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
}: HeartViewerProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [selected, setSelected] = useState<string | null>(null);
  const [external, setExternal] = useState<string[]>(highlight);
  const [ghost, setGhost] = useState(false);
  const [isolate, setIsolate] = useState(false);
  const [section, setSection] = useState<SectionAxis>('off');
  const [sectionPosition, setSectionPosition] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  // Set when the reader pressed the load button, so focus follows them into the model.
  const [focusOnReady, setFocusOnReady] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const id = useId();

  const start = useCallback(() => {
    setPhase((p) => (p === 'idle' ? (hasWebGL() ? 'loading' : 'unsupported') : p));
  }, []);

  useEffect(() => {
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (loadOn !== 'visible' || !rootRef.current) return;
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

  const known = useMemo(() => new Set(structures.map((s) => s.id)), [structures]);

  useEffect(() => {
    const onHighlight = (event: Event) => {
      if (!isHighlightEvent(event)) return;
      setSelected(null);
      setExternal(event.detail.ids.filter((x) => known.has(x)));
    };
    window.addEventListener(HIGHLIGHT_EVENT, onHighlight);
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
  const status = STATUS[phase];
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
                describedBy={`${id}-help`}
                reducedMotion={reducedMotion}
                focusOnReady={focusOnReady}
                onReady={onReady}
                onSelect={select}
              />
            </Suspense>
          </ErrorBoundary>
        )}
        {phase === 'idle' && loadOn === 'click' && (
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
        <p className={styles.attribution}>{t['viewer.attribution']}</p>
      </div>
    </div>
  );
}
