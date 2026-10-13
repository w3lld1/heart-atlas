import {
  createHeartClock,
  limbLeads,
  presetIds,
  presetLead,
  presetParams,
} from '@heart-atlas/heart-clock';
import { describe, expect, it } from 'vitest';
import {
  limbStrip,
  pacingSpikeMv,
  pacingSpikes,
  pxPerMs,
  pxPerMv,
  traceEcg,
} from '../src/components/heart-clock/ecg-canvas.ts';
import { drawWiggers, type WiggersColors } from '../src/components/heart-clock/wiggers-canvas.ts';

/** A canvas context that records the vertical segments the trace draws. */
function recorder() {
  const vertical: { x: number; from: number; to: number }[] = [];
  let at = { x: 0, y: 0 };
  let moved = false;
  const context = {
    lineJoin: 'miter',
    beginPath() {},
    stroke() {},
    moveTo(x: number, y: number) {
      at = { x, y };
      moved = true;
    },
    lineTo(x: number, y: number) {
      if (moved && x === at.x) vertical.push({ x, from: at.y, to: y });
      at = { x, y };
      moved = false;
    },
  };
  return { context: context as unknown as CanvasRenderingContext2D, vertical };
}

describe('pacemaker spikes', () => {
  it('sit at the start of every paced beat inside the window', () => {
    const clock = createHeartClock({ heartRate: 60, atrialPacing: 1 });
    expect(pacingSpikes(clock, 500, 3500)).toEqual([1000, 2000, 3000]);
    expect(pacingSpikes(createHeartClock({ heartRate: 60 }), 0, 3000)).toEqual([]);
  });

  it('follow each beat, so a change mid-strip leaves earlier beats without spikes', () => {
    const clock = createHeartClock({ heartRate: 60 });
    clock.setParams({ atrialPacing: 1 }, 1500);
    expect(pacingSpikes(clock, 0, 4500)).toEqual([2000, 3000, 4000]);
  });

  it('sit at the QRS onset of every beat with ventricular pacing, and at the P too with both', () => {
    // PR at 60 bpm is the default 160 ms.
    const ventricular = createHeartClock({ heartRate: 60, ventricularPacing: 1 });
    expect(pacingSpikes(ventricular, 500, 3500)).toEqual([1160, 2160, 3160]);
    // A beat that starts before the window still gives its QRS spike inside it.
    expect(pacingSpikes(ventricular, 1100, 1200)).toEqual([1160]);
    const both = createHeartClock({ heartRate: 60, atrialPacing: 1, ventricularPacing: 1 });
    expect(pacingSpikes(both, 500, 2500)).toEqual([1000, 1160, 2000, 2160]);
  });

  it('are drawn as vertical lines from the baseline, none left of the strip', () => {
    const clock = createHeartClock({ heartRate: 60, atrialPacing: 1 });
    const { context, vertical } = recorder();
    const width = 200;
    const baseline = 72;
    const now = 3100;
    traceEcg(context, clock, now, { width, pxPerMs, baseline, pxPerMv });
    // The strip spans 1100–3100 ms at 0.1 px/ms: beats start at 2000 and 3000.
    const spikes = vertical.filter((segment) => segment.from === baseline);
    expect(spikes.map((segment) => segment.x)).toEqual([90, 190]);
    for (const segment of spikes) {
      expect(segment.to).toBe(baseline - pacingSpikeMv * pxPerMv);
      expect(segment.x).toBeGreaterThanOrEqual(0);
    }
  });

  it('line up with the trace while the strip is still filling from the left', () => {
    const clock = createHeartClock({ heartRate: 60, atrialPacing: 1 });
    const { context, vertical } = recorder();
    // At 500 ms only 50 px of trace exist, drawn at the right of a 200 px strip.
    traceEcg(context, clock, 500, { width: 200, pxPerMs, baseline: 72, pxPerMv });
    expect(vertical.filter((segment) => segment.from === 72).map((segment) => segment.x)).toEqual([
      150,
    ]);
  });
});

describe('Wiggers ECG row', () => {
  /** x of every vertical segment drawWiggers draws; other context calls do nothing. */
  function verticals(clock: ReturnType<typeof createHeartClock>, now: number): number[] {
    const { context, vertical } = recorder();
    const canvas = new Proxy(context as unknown as Record<string, unknown>, {
      get: (target, key) => (key in target ? target[key as string] : () => {}),
      set: () => true,
    });
    const colors = new Proxy({}, { get: () => '#000' }) as WiggersColors;
    drawWiggers(canvas as unknown as CanvasRenderingContext2D, 400, now, clock, colors, {
      pressure: 'p',
      volume: 'v',
      ecg: 'e',
    });
    return vertical.map((segment) => segment.x);
  }

  it('draws a spike at the P onset for atrial pacing and at the QRS onset for ventricular', () => {
    const now = 2500;
    const plain = verticals(createHeartClock({ heartRate: 60 }), now);
    const extra = (params: object) => {
      const xs = verticals(createHeartClock({ heartRate: 60, ...params }), now);
      return xs.filter((x) => !plain.includes(x));
    };
    const [atrial] = extra({ atrialPacing: 1 });
    const [ventricular] = extra({ ventricularPacing: 1 });
    expect(extra({ atrialPacing: 1 })).toHaveLength(1);
    expect(extra({ ventricularPacing: 1 })).toHaveLength(1);
    expect(extra({ atrialPacing: 1, ventricularPacing: 1 })).toEqual([atrial, ventricular]);
    expect(ventricular).toBeGreaterThan(atrial ?? Infinity);
  });
});

describe('limb lead strips', () => {
  it('fit every preset drawn in lead II, in every limb lead, with its spikes', () => {
    const top = limbStrip.baseline / pxPerMv;
    const bottom = (limbStrip.height - limbStrip.baseline) / pxPerMv;
    for (const id of presetIds.filter((preset) => presetLead(preset) === 'II')) {
      const clock = createHeartClock(presetParams(id));
      // 30 s in windows inside the clock's history, so pauses and premature beats all show.
      for (let from = 0; from < 30000; from += 9000) {
        for (const lead of limbLeads) {
          const values = clock.ecgBetween(from, from + 9000, 9001, lead);
          expect(Math.max(...values, pacingSpikeMv), `${id} in ${lead}`).toBeLessThan(top);
          expect(Math.min(...values), `${id} in ${lead}`).toBeGreaterThan(-bottom);
        }
      }
    }
  });
});
