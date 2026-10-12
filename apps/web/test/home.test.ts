import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { localeCodes } from '../src/i18n/locales.ts';
import { getMessages } from '../src/i18n/messages.ts';
import { formatCount } from '../src/i18n/plural.ts';
import { BODY_HEIGHT, BODY_WIDTH, bodyArt } from '../src/lib/body-backdrop.ts';
import { ecgStripPath } from '../src/lib/ecg-strip.ts';
import { handFontCss } from '../src/lib/hand-font.ts';
import { heroPoster, structureIds } from '../src/lib/heart-model.ts';
import { cardPath, stageCards } from '../src/lib/home.ts';

describe('formatCount', () => {
  const ru = '{count, plural, one {# статья} few {# статьи} many {# статей} other {# статьи}}';

  it('picks the plural form of the locale', () => {
    expect(formatCount(ru, 'ru', 1)).toBe('1 статья');
    expect(formatCount(ru, 'ru', 3)).toBe('3 статьи');
    expect(formatCount(ru, 'ru', 20)).toBe('20 статей');
    expect(formatCount(ru, 'ru', 21)).toBe('21 статья');
    expect(formatCount('{count, plural, one {# article} other {# articles}}', 'en', 1)).toBe(
      '1 article',
    );
  });

  it('falls back to "other" and fills plain {count}', () => {
    expect(formatCount('{count, plural, other {# items}}', 'ru', 5)).toBe('5 items');
    expect(formatCount('Total: {count}', 'en', 1200)).toBe('Total: 1,200');
  });

  it('has a valid count message in every locale', () => {
    for (const locale of localeCodes) {
      const t = getMessages(locale);
      const keys = (Object.keys(t) as (keyof typeof t)[]).filter((key) =>
        t[key].includes('{count'),
      );
      expect(keys.length).toBeGreaterThan(3);
      for (const key of keys) {
        expect(formatCount(t[key], locale, 7)).toMatch(/7/);
        expect(formatCount(t[key], locale, 7)).not.toMatch(/[{}]/);
      }
    }
  });
});

describe('bodyArt', () => {
  it('draws the same body on every build', () => {
    expect(bodyArt()).toEqual(bodyArt());
    expect(bodyArt(8)).not.toEqual(bodyArt());
  });

  it('draws the reviewed picture', () => {
    // Changes only when the drawing is changed on purpose: then look at it and update the hash.
    const hash = createHash('sha256').update(JSON.stringify(bodyArt())).digest('hex');
    expect(hash).toBe('9e4f72503750a24255497415fefbc270def9db8517af00dc28ef21bbdef229a1');
  });

  it('marks which trunks are veins, so their flow runs back to the heart', () => {
    const { trunks } = bodyArt();
    expect(trunks.some((t) => t.vein)).toBe(true);
    expect(trunks.some((t) => !t.vein)).toBe(true);
  });

  it('keeps every vessel point inside the picture', () => {
    const art = bodyArt();
    const numbers = [...art.arteries, ...art.veins]
      .flatMap((v) => v.d.match(/-?\d+(\.\d+)?/g) ?? [])
      .map(Number);
    expect(numbers.length).toBeGreaterThan(100);
    // The generator may wander a little past the edges; the SVG clips it.
    expect(Math.min(...numbers)).toBeGreaterThan(-100);
    expect(Math.max(...numbers)).toBeLessThan(Math.max(BODY_WIDTH, BODY_HEIGHT) + 100);
  });

  it('draws a closed, symmetric torso', () => {
    const { silhouette } = bodyArt();
    expect(silhouette.startsWith('M410 0')).toBe(true);
    expect(silhouette.endsWith('Z')).toBe(true);
    // The right half mirrors the left: x = 352 on the left is x = 468 on the right.
    expect(silhouette).toContain('352 104');
    expect(silhouette).toContain('468 104');
  });
});

describe('ecgStripPath', () => {
  const height = 100;
  const d = ecgStripPath({ durationMs: 2800, width: 240, height, heartRate: 64, stepMs: 6 });
  const ys = [...d.matchAll(/[ML][\d.]+ (-?[\d.]+)/g)].map((m) => Number(m[1]));

  it('draws one point per step across the width', () => {
    expect(d.startsWith('M0.0 ')).toBe(true);
    expect(ys).toHaveLength(Math.floor(2800 / 6) + 1);
  });

  it('shows an R wave in every beat: three peaks in 2.8 s at 64 per minute', () => {
    const peak = Math.min(...ys);
    const peaks = ys.filter((y, i) => y < peak + 5 && (ys[i - 1] ?? Infinity) >= peak + 5);
    expect(peaks).toHaveLength(3);
    expect(Math.max(...ys)).toBeLessThan(height);
  });
});

describe('cards around the heart', () => {
  const poster = heroPoster();

  it('points every card at a structure visible on the poster', () => {
    for (const card of stageCards) {
      const anchor = poster.anchors[card.anchor];
      expect(anchor, card.anchor).toBeDefined();
      expect(anchor?.x).toBeGreaterThan(0);
      expect(anchor?.x).toBeLessThan(1);
      expect(anchor?.y).toBeGreaterThan(0);
      expect(anchor?.y).toBeLessThan(1);
      // Enough of it shows for the line to land on it (the sinoatrial node is the smallest).
      expect(anchor?.pixels, card.anchor).toBeGreaterThanOrEqual(20);
    }
  });

  it('lights real structures', () => {
    for (const card of stageCards) {
      for (const group of card.groups) expect(structureIds([group]), group).not.toEqual([]);
    }
    expect(structureIds(['valve'])).toContain('aortic-valve');
  });

  it('links to the article, then to its section, then nowhere', () => {
    const valves = stageCards.find((c) => c.id === 'valves');
    if (!valves) throw new Error('no valves card');
    const yes = () => true;
    const no = () => false;
    expect(cardPath(valves, { article: yes, section: yes })).toBe('anatomy/heart-valves/');
    expect(cardPath(valves, { article: no, section: yes })).toBe('anatomy/');
    expect(
      cardPath({ target: 'disease', fallback: 'disease' }, { article: yes, section: no }),
    ).toBe(null);
  });
});

describe('handFontCss', () => {
  it('inlines only the characters of the line', async () => {
    const css = await handFontCss('Это жизнь.');
    const faces = css.match(/@font-face/g) ?? [];
    // Cyrillic letters and the Latin range (space, full stop).
    expect(faces).toHaveLength(2);
    expect(css).toContain('U+42D');
    expect(css).toContain('U+2E');
    expect(css).not.toContain('U+41,');
    expect(css.length).toBeLessThan(40_000);
  });
});
