// Server-side only: the island module exports nothing but its component, so these keys stay out
// of the client bundle (#425).
import { presetIds } from '@heart-atlas/heart-clock';
import { presetGroups } from './preset-groups.ts';

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
