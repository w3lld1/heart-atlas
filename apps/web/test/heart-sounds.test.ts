import reactRenderer from '@astrojs/react/server.js';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';
import HeartSounds from '../src/components/HeartSounds.astro';
import { heartSoundIds } from '../src/components/heart-sounds/auscultation.ts';
import { heartSoundsMessageKeys } from '../src/components/heart-sounds/messages.ts';
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

const articleLocals = {
  locale: 'ru',
  article: { locale: 'ru', type: 'disease', slug: 'mitral-stenosis' },
};

describe('HeartSounds', () => {
  it('compares the article sound with normal and draws its murmur', async () => {
    const urls = [
      'https://example.org/guideline',
      ...heartSoundSources['aortic-stenosis'].map((source) => source.href),
    ];
    const html = await container.renderToString(HeartSounds, {
      locals: { ...articleLocals, sourceUrls: urls },
      props: { sound: 'aortic-stenosis' },
    });
    const sounds = [...html.matchAll(/type="radio" name="[^"]*-sound"[^>]*?value="([^"]+)"/g)].map(
      (m) => m[1],
    );
    expect(sounds).toEqual(['normal', 'aortic-stenosis']);
    const t = getMessages('ru');
    expect(html).toContain(t['heartSounds.sound.aortic-stenosis.description']);
    expect(html).toMatch(/<polygon[^>]*data-timbre="harsh"/);
    // The murmur cites the article's numbered sources, not a list of its own.
    expect(html).toMatch(/href="#source-2"[^>]*>2<\/a>/);
    expect(html).not.toContain('<ul');
    // No autoplay: the button offers to listen.
    expect(html).toContain(`>${t['heartSounds.listen']}</button>`);
  });

  it('rejects an unknown sound', async () => {
    await expect(
      container.renderToString(HeartSounds, {
        locals: { ...articleLocals, sourceUrls: [] },
        props: { sound: 'wpw-syndrome' },
      }),
    ).rejects.toThrow(/unknown sound/);
  });

  it('asks for a source the article lacks', async () => {
    await expect(
      container.renderToString(HeartSounds, {
        locals: { ...articleLocals, sourceUrls: [] },
        props: { sound: 'mitral-stenosis' },
      }),
    ).rejects.toThrow(
      /add https:\/\/www\.msdmanuals\.com\/.+ to the sources of ru\/disease\/mitral-stenosis/,
    );
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
