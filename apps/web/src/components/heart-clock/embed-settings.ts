import {
  hasPulse,
  isPresetId,
  paramRanges,
  presetIds,
  presetParams,
  type PresetId,
} from '@heart-atlas/heart-clock';
import { integerIn, parseEmbedParams } from '../../lib/embed.ts';
import { clockChoices, type ClockChoice } from './choices.ts';

// The ECG embed's own module: the preset table it needs to read its URL stays out of the monitor
// island that articles load (#425).

/** Query parameters the ECG embed accepts; everything else is ignored. */
export const ecgEmbedParams = {
  rate: integerIn(...paramRanges.heartRate),
  preset: (value: string): PresetId | undefined => (isPresetId(value) ? value : undefined),
};

/** The embed's monitor settings from a query string, or undefined when it sets nothing. */
export function embedSettings(
  search: string,
): { preset?: PresetId; rate?: number; choices: ClockChoice[] } | undefined {
  const { preset, rate: asked } = parseEmbedParams(search, ecgEmbedParams);
  // A preset without a pulse (ventricular fibrillation) has no heart rate to set.
  const rate = preset !== undefined && !hasPulse(presetParams(preset)) ? undefined : asked;
  if (preset === undefined && rate === undefined) return undefined;
  return {
    ...(preset === undefined ? {} : { preset }),
    ...(rate === undefined ? {} : { rate }),
    choices: clockChoices(presetIds, preset, rate === undefined ? undefined : { heartRate: rate }),
  };
}
