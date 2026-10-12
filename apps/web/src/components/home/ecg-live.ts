import type { HeartClock } from '@heart-atlas/heart-clock';
import { frameDue } from '../../lib/home-motion.ts';
import { currentMotion, MOTION_EVENT } from '../../lib/motion.ts';
import { traceEcg } from '../heart-clock/ecg-canvas.ts';
import { STRIP } from '../../lib/ecg-strip-scale.ts';

/** Longest clock step between two frames, ms, so a tab coming back does not jump. */
const MAX_FRAME_MS = 100;

/**
 * Runs the home page ECG over its still SVG: the heart clock's own lead, drawn with the monitor's
 * trace code. Every frame in full motion, about 15 a second in calm; in off the SVG stays. Nothing
 * is drawn while the strip is off screen or the tab is hidden.
 */
export function startLiveEcg(root: HTMLElement): void {
  const canvas = root.querySelector('canvas');
  const context = canvas?.getContext('2d');
  if (!canvas || !context) return;

  let clock: HeartClock | null = null;
  let loading = false;
  let onScreen = false;
  let frame = 0;
  // Clock time: starts a strip in, so the trace fills the strip at once.
  let t = STRIP.durationMs;
  let lastTick = 0;
  let lastDraw = 0;
  // Read outside the frame loop: size on resize, colour (it follows the theme) every second or so.
  let width = root.clientWidth;
  let height = root.clientHeight;
  let color = '';
  let draws = 0;
  new ResizeObserver(([entry]) => {
    if (!entry) return;
    width = entry.contentRect.width;
    height = entry.contentRect.height;
  }).observe(root);

  const draw = () => {
    if (!clock) return;
    const ratio = window.devicePixelRatio || 1;
    if (
      canvas.width !== Math.round(width * ratio) ||
      canvas.height !== Math.round(height * ratio)
    ) {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    // Fades in from the left like the still strip.
    if (draws++ % 30 === 0) color = getComputedStyle(root).color;
    const fade = context.createLinearGradient(0, 0, width, 0);
    fade.addColorStop(0, 'transparent');
    fade.addColorStop(0.25, color);
    context.strokeStyle = fade;
    context.lineWidth = 1.8;
    traceEcg(context, clock, t, {
      width,
      pxPerMs: width / STRIP.durationMs,
      baseline: height * STRIP.baseline,
      pxPerMv: height * STRIP.mvHeight,
    });
    root.classList.add('running');
  };

  const tick = (time: number) => {
    frame = 0;
    const level = currentMotion();
    if (level === 'off' || !onScreen || !clock) return;
    t += Math.min(MAX_FRAME_MS, time - lastTick);
    lastTick = time;
    if (frameDue(level, time - lastDraw)) {
      lastDraw = time;
      draw();
    }
    frame = requestAnimationFrame(tick);
  };

  const update = () => {
    const level = currentMotion();
    // The still strip is back at once; the canvas takes over with its first frame.
    if (level === 'off') root.classList.remove('running');
    if (level === 'off' || !onScreen) {
      cancelAnimationFrame(frame);
      frame = 0;
      return;
    }
    if (!clock) {
      if (loading) return;
      loading = true;
      import('@heart-atlas/heart-clock').then(
        ({ createHeartClock }) => {
          clock = createHeartClock({ heartRate: STRIP.heartRate });
          update();
        },
        () => {
          // Without the clock code (offline, stale deploy) the still strip stays.
        },
      );
      return;
    }
    if (!frame) {
      lastTick = performance.now();
      lastDraw = -Infinity;
      draws = 0;
      frame = requestAnimationFrame(tick);
    }
  };

  new IntersectionObserver(([entry]) => {
    onScreen = entry?.isIntersecting ?? false;
    update();
  }).observe(root);
  window.addEventListener(MOTION_EVENT, update);
}
