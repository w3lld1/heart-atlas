import {
  Component,
  lazy,
  Suspense,
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
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Small or touch screens get the lighter model. */
function prefersLowDetail(): boolean {
  return window.matchMedia('(pointer: coarse), (max-width: 48rem)').matches;
}

class ErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

type Status = 'idle' | 'active' | 'unsupported';

export default function HeartViewer({
  models,
  poster,
  structures,
  messages: t,
  highlight = [],
  loadOn = 'visible',
}: HeartViewerProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [selected, setSelected] = useState<string | null>(null);
  const [external, setExternal] = useState<string[]>(highlight);
  const [ghost, setGhost] = useState(false);
  const [isolate, setIsolate] = useState(false);
  const [section, setSection] = useState<SectionAxis>('off');
  const [sectionPosition, setSectionPosition] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const id = useId();

  const activate = () => setStatus(hasWebGL() ? 'active' : 'unsupported');

  useEffect(() => {
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (loadOn !== 'visible' || !rootRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect();
          setStatus((s) => (s === 'idle' ? (hasWebGL() ? 'active' : 'unsupported') : s));
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(rootRef.current);
    return () => observer.disconnect();
  }, [loadOn]);

  useEffect(() => {
    const onHighlight = (event: Event) => {
      if (!isHighlightEvent(event)) return;
      setExternal(event.detail.ids);
      setSelected(event.detail.ids[0] ?? null);
    };
    window.addEventListener(HIGHLIGHT_EVENT, onHighlight);
    return () => window.removeEventListener(HIGHLIGHT_EVENT, onHighlight);
  }, []);

  const active = selected ? [selected] : external;
  const highlighted = useMemo(() => meshesFor(active, structures), [active, structures]);
  const labelOf = (structureId: string | null) =>
    structures.find((s) => s.id === structureId)?.label ?? '';
  const url = useMemo(
    () => (status === 'active' && prefersLowDetail() ? models.low : models.high),
    [status, models],
  );

  const select = (structureId: string) =>
    setSelected((s) => (s === structureId ? null : structureId));
  const groupLabel = (group: string) => t[`viewer.group.${group}` as ViewerMessageKey] ?? group;
  const showSchematic = active.some(
    (a) => structures.find((s) => s.id === a)?.group === 'conduction',
  );

  const posterImage = (
    <img
      className={styles.poster}
      src={poster}
      alt={t['viewer.posterAlt']}
      width="640"
      height="640"
    />
  );

  return (
    <div className={styles.viewer} ref={rootRef}>
      <div className={styles.stage}>
        {status === 'active' ? (
          <ErrorBoundary
            fallback={
              <>
                {posterImage}
                <p className={styles.overlay} role="alert">
                  {t['viewer.error']}
                </p>
              </>
            }
          >
            <Suspense
              fallback={
                <>
                  {posterImage}
                  <p className={styles.overlay} role="status">
                    {t['viewer.loading']}
                  </p>
                </>
              }
            >
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
                onSelect={select}
              />
            </Suspense>
          </ErrorBoundary>
        ) : (
          <>
            {posterImage}
            {status === 'idle' ? (
              <button type="button" className={styles.load} onClick={activate}>
                {t['viewer.load']}
              </button>
            ) : (
              <p className={styles.overlay} role="status">
                {t['viewer.unavailable']}
              </p>
            )}
          </>
        )}
      </div>

      <div className={styles.panel}>
        <p id={`${id}-help`} className={styles.help}>
          {t['viewer.keyboardHelp']}
        </p>
        <p className={styles.selected} aria-live="polite">
          <span>{t['viewer.selected']}: </span>
          <strong>{active.length > 0 ? active.map(labelOf).join(', ') : t['viewer.none']}</strong>
          {active.length > 0 && (
            <button
              type="button"
              className={styles.clear}
              onClick={() => {
                setSelected(null);
                setExternal([]);
              }}
            >
              {t['viewer.clear']}
            </button>
          )}
        </p>
        {showSchematic && <p className={styles.note}>{t['viewer.schematic']}</p>}

        {status === 'active' && (
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
                  onChange={(e) => setSectionPosition(Number(e.target.value))}
                />
              </div>
            )}
          </div>
        )}

        <h2 className={styles['list-title']}>{t['viewer.structures']}</h2>
        {groupStructures(structures).map(([group, items]) => (
          <div key={group} className={styles.group}>
            <h3>{groupLabel(group)}</h3>
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
