import reactRenderer from '@astrojs/react/server.js';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';
import HeartSounds from '../src/components/HeartSounds.astro';
import { heartSoundIds } from '../src/components/heart-sounds/auscultation.ts';
import { heartSoundsMessageKeys } from '../src/components/heart-sounds/HeartSounds.tsx';
import { heartSoundSources } from '../src/components/heart-sounds/sources.ts';
import { localeCodes } from '../src/i18n/locales.ts';
import { getMessages, type MessageKey } from '../src/i18n/messages.ts';

let container: AstroContainer;
beforeAll(async () => {
  // The player is a React island, so the container needs the React renderer.
  container = await AstroContainer.create();
  container.addServerRenderer({ renderer: reactRenderer });
  container.addClientRenderer({ name: '@astrojs/react', entrypoint: '@astrojs/react/client.js' });
});

describe('HeartSounds', () => {
  it('compares the article sound with normal and draws its murmur', async () => {
    const html = await container.renderToString(HeartSounds, {
      locals: { locale: 'ru' },
      props: { sound: 'aortic-stenosis' },
    });
    const sounds = [...html.matchAll(/type="radio" name="[^"]*-sound"[^>]*?value="([^"]+)"/g)].map(
      (m) => m[1],
    );
    expect(sounds).toEqual(['normal', 'aortic-stenosis']);
    const t = getMessages('ru');
    expect(html).toContain(t['heartSounds.sound.aortic-stenosis.description']);
    expect(html).toMatch(/<polygon[^>]*data-timbre="harsh"/);
    // No autoplay: the button offers to listen.
    expect(html).toContain(`>${t['heartSounds.listen']}</button>`);
  });

  it('rejects an unknown sound', async () => {
    await expect(
      container.renderToString(HeartSounds, {
        locals: { locale: 'en' },
        props: { sound: 'wpw-syndrome' },
      }),
    ).rejects.toThrow(/unknown sound/);
  });
});

describe('heart sounds strings and sources', () => {
  it('has every player string in every locale', () => {
    for (const locale of localeCodes) {
      const t = getMessages(locale) as Record<MessageKey, string>;
      for (const key of heartSoundsMessageKeys) expect(t[key], `${locale} ${key}`).toBeTruthy();
    }
  });

  it('gives every sound at least one source, and every disease a guideline', () => {
    for (const id of heartSoundIds) {
      const sources = heartSoundSources[id];
      expect(sources.length).toBeGreaterThan(0);
      if (id !== 'normal') {
        expect(sources.some((s) => s.href.startsWith('https://cr.minzdrav.gov.ru/'))).toBe(true);
      }
    }
  });
});
