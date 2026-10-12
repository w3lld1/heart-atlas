/**
 * The live heart of the home page. The page imports this module only when the heart should load
 * (see docs/plans/2026-10-12-home-redesign.md, "Сердце"), so three.js never weighs on the first
 * screen. It draws over the poster with the poster's camera, so the swap does not move anything.
 */
import { lazy, StrictMode, Suspense, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { CycleSource } from './cycle.ts';
import { HIGHLIGHT_EVENT, isHighlightEvent } from './events.ts';
import { heroBehaviour, type HeroMotion, type Share } from './hero-state.ts';
import { meshesFor } from './highlight.ts';
import type { ViewerModels, ViewerStructure } from './types.ts';

const HeroScene = lazy(() => import('./HeroScene.tsx'));

/** Heart rate of the home page heart, beats per minute, as in the spec. */
const RATE = 64;
/** Longest clock step between two frames, ms, so a tab coming back does not jump. */
const MAX_FRAME_MS = 100;

export interface HeroHeartOptions {
  models: ViewerModels;
  structures: readonly ViewerStructure[];
  /** Points on the poster, as shares of its size, keyed by mesh name. */
  anchors: Readonly<Record<string, { x: number; y: number }>>;
  /** Width / height of the poster the canvas draws over. */
  posterAspect: number;
  /** Accessible name of the model. */
  label: string;
  motion: HeroMotion;
  /** Called once the model is drawn, so the page can hide the poster under it. */
  onReady: () => void;
  /** Where the anchors are now, as shares of the canvas; called when they move. */
  onAnchors: (points: Record<string, Share>) => void;
  /** The model could not be drawn; the page keeps the poster. */
  onError: () => void;
}

export interface HeroHeartHandle {
  setMotion(motion: HeroMotion): void;
  /** Removes the heart; the handle does nothing afterwards. */
  destroy(): void;
}

async function ownClock(): Promise<CycleSource> {
  const { createHeartClock, cycleState } = await import('@heart-atlas/heart-clock');
  const clock = createHeartClock({ heartRate: RATE });
  let t = 0;
  let last = performance.now();
  return () => {
    const time = performance.now();
    t += Math.min(MAX_FRAME_MS, time - last);
    last = time;
    return cycleState(clock, t);
  };
}

function lowDetail(): boolean {
  return window.matchMedia('(pointer: coarse), (max-width: 48rem)').matches;
}

function HeroHeart({
  options,
  motion,
  root,
}: {
  options: HeroHeartOptions;
  motion: HeroMotion;
  root: HTMLElement;
}) {
  const [ids, setIds] = useState<string[]>([]);
  const [ghost, setGhost] = useState(false);
  const [cycle, setCycle] = useState<CycleSource | null>(null);
  const [visible, setVisible] = useState(true);
  const { beat, turn } = heroBehaviour(motion);
  const url = useMemo(() => (lowDetail() ? options.models.low : options.models.high), [options]);
  const highlighted = useMemo(() => meshesFor(ids, options.structures), [ids, options]);

  useEffect(() => {
    const onHighlight = (event: Event) => {
      if (!isHighlightEvent(event)) return;
      setIds(event.detail.ids);
      setGhost(event.detail.ghost === true);
    };
    window.addEventListener(HIGHLIGHT_EVENT, onHighlight);
    return () => window.removeEventListener(HIGHLIGHT_EVENT, onHighlight);
  }, []);

  // Nothing is drawn while the heart is off screen.
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) =>
      setVisible(entry?.isIntersecting ?? true),
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, [root]);

  useEffect(() => {
    if (!beat) {
      setCycle(null);
      return;
    }
    let live = true;
    ownClock().then(
      (source) => live && setCycle(() => source),
      () => {
        // Without the clock code (offline, stale deploy) the heart stays still.
      },
    );
    return () => {
      live = false;
    };
  }, [beat]);

  return (
    <Suspense fallback={null}>
      <HeroScene
        url={url}
        highlighted={highlighted}
        ghost={ghost}
        anchors={options.anchors}
        posterAspect={options.posterAspect}
        label={options.label}
        turn={turn}
        cycle={cycle}
        visible={visible}
        onReady={options.onReady}
        onAnchors={options.onAnchors}
      />
    </Suspense>
  );
}

/** Draws the live heart into `root`, which sits exactly over the poster. */
export function mountHeroHeart(root: HTMLElement, options: HeroHeartOptions): HeroHeartHandle {
  const reactRoot = createRoot(root, { onUncaughtError: options.onError });
  const render = (motion: HeroMotion) =>
    reactRoot.render(
      <StrictMode>
        <HeroHeart options={options} motion={motion} root={root} />
      </StrictMode>,
    );
  let live = true;
  render(options.motion);
  return {
    setMotion: (motion) => {
      if (live) render(motion);
    },
    destroy: () => {
      if (!live) return;
      live = false;
      // Not from inside React's own error callback, which may still be on the stack.
      queueMicrotask(() => reactRoot.unmount());
    },
  };
}
