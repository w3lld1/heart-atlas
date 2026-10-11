import { paramRanges, type HeartParams } from '@heart-atlas/heart-clock';
import { useEffect, useState } from 'react';
import { integerIn, parseEmbedParams } from '../../lib/embed.ts';
import HeartClockDemo, { type HeartClockMessages } from './HeartClockDemo.tsx';

/** Query parameters the ECG embed accepts; everything else is ignored. */
export const ecgEmbedParams = { rate: integerIn(...paramRanges.heartRate) };

interface Props {
  locale: string;
  messages: HeartClockMessages;
}

const defaults: Partial<HeartParams> = {};

/**
 * Heart clock monitor configured from the query string. The build renders it with default
 * parameters, so the page has its final size before scripts run; after hydration the monitor is
 * mounted again with the parameters from the URL.
 */
export default function EcgEmbed({ locale, messages }: Props) {
  const [params, setParams] = useState(defaults);
  useEffect(() => {
    const { rate } = parseEmbedParams(window.location.search, ecgEmbedParams);
    if (rate !== undefined) setParams({ heartRate: rate });
  }, []);
  return (
    <HeartClockDemo
      key={params.heartRate ?? 'default'}
      locale={locale}
      messages={messages}
      params={params}
    />
  );
}
