import { paramRanges } from '@heart-atlas/heart-clock';
import { useMemo } from 'react';
import { integerIn, parseEmbedParams } from '../../lib/embed.ts';
import HeartClockDemo, { type HeartClockMessages } from './HeartClockDemo.tsx';

/** Query parameters the ECG embed accepts; everything else is ignored. */
export const ecgEmbedParams = { rate: integerIn(...paramRanges.heartRate) };

interface Props {
  locale: string;
  messages: HeartClockMessages;
}

/** Heart clock monitor configured from the query string. Rendered on the client only. */
export default function EcgEmbed({ locale, messages }: Props) {
  const params = useMemo(() => {
    const { rate } = parseEmbedParams(window.location.search, ecgEmbedParams);
    return rate === undefined ? {} : { heartRate: rate };
  }, []);
  return <HeartClockDemo locale={locale} messages={messages} params={params} />;
}
