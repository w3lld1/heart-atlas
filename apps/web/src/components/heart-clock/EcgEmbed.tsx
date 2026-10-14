import type { PresetId } from '@heart-atlas/heart-clock';
import { useEffect, useState } from 'react';
import type { ClockChoice } from './clock-choice.ts';
import { embedSettings } from './embed-settings.ts';
import HeartClockDemo from './HeartClockDemo.tsx';
import type { HeartClockMessages } from './messages.ts';

interface Props {
  locale: string;
  messages: HeartClockMessages;
  /** Every preset with its own settings, resolved in the build (`clockChoices`). */
  choices: readonly ClockChoice[];
}

interface Settings {
  preset?: PresetId;
  rate?: number;
  choices: readonly ClockChoice[];
}

/**
 * Heart clock monitor configured from the query string (`embed-settings.ts`). The build renders
 * it with default settings, so the page has its final size before scripts run; after hydration
 * the monitor is mounted again with the settings from the URL.
 */
export default function EcgEmbed({ locale, messages, choices }: Props) {
  const [settings, setSettings] = useState<Settings>({ choices });
  useEffect(() => {
    const fromUrl = embedSettings(window.location.search);
    if (fromUrl) setSettings(fromUrl);
  }, []);
  const { preset, rate } = settings;
  return (
    <HeartClockDemo
      key={`${preset ?? ''}:${rate ?? ''}`}
      locale={locale}
      messages={messages}
      choices={settings.choices}
      {...(preset === undefined ? {} : { preset })}
    />
  );
}
