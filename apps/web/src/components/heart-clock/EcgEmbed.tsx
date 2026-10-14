import {
  hasPulse,
  isPresetId,
  paramRanges,
  presetIds,
  presetParams,
  type PresetId,
} from '@heart-atlas/heart-clock';
import { useEffect, useMemo, useState } from 'react';
import { integerIn, parseEmbedParams } from '../../lib/embed.ts';
import HeartClockDemo from './HeartClockDemo.tsx';
import type { HeartClockMessages } from './messages.ts';

/** Query parameters the ECG embed accepts; everything else is ignored. */
export const ecgEmbedParams = {
  rate: integerIn(...paramRanges.heartRate),
  preset: (value: string): PresetId | undefined => (isPresetId(value) ? value : undefined),
};

interface Props {
  locale: string;
  messages: HeartClockMessages;
}

interface Settings {
  rate?: number;
  preset?: PresetId;
}

/**
 * Heart clock monitor configured from the query string. The build renders it with default
 * settings, so the page has its final size before scripts run; after hydration the monitor is
 * mounted again with the settings from the URL.
 */
export default function EcgEmbed({ locale, messages }: Props) {
  const [settings, setSettings] = useState<Settings>({});
  useEffect(() => {
    setSettings(parseEmbedParams(window.location.search, ecgEmbedParams));
  }, []);
  const { preset } = settings;
  // A preset without a pulse (ventricular fibrillation) has no heart rate to set.
  const rate = preset !== undefined && !hasPulse(presetParams(preset)) ? undefined : settings.rate;
  // A stable object: the monitor rebuilds its clock whenever `params` changes.
  const params = useMemo(() => (rate === undefined ? undefined : { heartRate: rate }), [rate]);
  return (
    <HeartClockDemo
      key={`${preset ?? ''}:${rate ?? ''}`}
      locale={locale}
      messages={messages}
      presets={presetIds}
      {...(preset === undefined ? {} : { preset })}
      {...(params === undefined ? {} : { params })}
    />
  );
}
