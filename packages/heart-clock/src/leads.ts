import type { HeartParams } from './params.ts';

/** Limb leads the clock projects the ECG into. */
export const limbLeads = ['I', 'II', 'III'] as const;
export type LimbLead = (typeof limbLeads)[number];

/** Angle of each limb lead in the frontal plane, degrees (Einthoven's triangle). */
export const limbLeadAngles: Readonly<Record<LimbLead, number>> = Object.freeze({
  I: 0,
  II: 60,
  III: 120,
});

/** What a lead multiplies each wave by. */
export interface LeadGains {
  /** P waves, also blocked and dissociated ones. */
  readonly p: number;
  /** Q, R, S and the delta wave. */
  readonly qrs: number;
  readonly t: number;
  readonly st: number;
  /** f and F waves. */
  readonly f: number;
}

export const unitGains: LeadGains = Object.freeze({ p: 1, qrs: 1, t: 1, st: 1, f: 1 });

const radians = Math.PI / 180;
// Lead II always has unit gains, so only I and III are cached.
const cache: Record<'I' | 'III', WeakMap<Readonly<HeartParams>, LeadGains>> = {
  I: new WeakMap(),
  III: new WeakMap(),
};

/**
 * Gains of limb lead `lead` for a beat with these parameters. Amplitudes are what lead II shows, so
 * a wave with axis θ is a vector of length A / cos(θ − 60°), and lead L at angle φ shows
 * A·cos(θ − φ) / cos(θ − 60°). Lead II always gets 1; I + III = II for every wave (Einthoven).
 * Axes stay where cos(θ − 60°) ≥ 0.25 (`paramRanges`), so no wave is near zero in lead II.
 * Spec: docs/plans/2026-10-13-heart-clock-three-leads.md.
 */
export function leadGains(params: Readonly<HeartParams>, lead: LimbLead): LeadGains {
  if (lead === 'II') return unitGains;
  const cached = cache[lead].get(params);
  if (cached) return cached;
  const angle = limbLeadAngles[lead];
  const gain = (axis: number) =>
    Math.cos((axis - angle) * radians) / Math.cos((axis - limbLeadAngles.II) * radians);
  const gains = Object.freeze({
    p: gain(params.pAxis),
    qrs: gain(params.qrsAxis),
    t: gain(params.tAxis),
    st: gain(params.stAxis),
    f: gain(params.fAxis),
  });
  cache[lead].set(params, gains);
  return gains;
}
