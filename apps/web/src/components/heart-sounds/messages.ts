// Server-side only: the island module exports nothing but its component, so these keys stay out
// of the client bundle (#425).
import { heartSoundIds } from './auscultation.ts';

export const heartSoundsMessageKeys = [
  'heartSounds.choose',
  'heartSounds.listen',
  'heartSounds.stop',
  'heartSounds.diagramLabel',
  'heartSounds.systole',
  'heartSounds.diastole',
  'heartSounds.click',
  'heartSounds.openingSnap',
  'sources.cite',
  ...heartSoundIds.flatMap(
    (id) => [`heartSounds.sound.${id}`, `heartSounds.sound.${id}.description`] as const,
  ),
] as const;

export type HeartSoundsMessages = Record<(typeof heartSoundsMessageKeys)[number], string>;
