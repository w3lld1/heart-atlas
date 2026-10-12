import { readdirSync, readFileSync, statSync } from 'node:fs';
import { sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { productionLocales } from '../src/i18n/locales.ts';
import { articlePages, type ArticlePage } from '../src/lib/articles.ts';
import { trackId, trackSchema, trackSteps } from '../src/lib/tracks.ts';

const track = {
  title: 'T',
  description: 'D',
  level: 'all',
  steps: ['anatomy/heart-valves', 'disease/aortic-stenosis'],
};

describe('trackSchema', () => {
  it('accepts a track and rejects bad steps, levels and repeats', () => {
    expect(trackSchema.parse(track).steps).toHaveLength(2);
    for (const change of [
      { steps: [] },
      { steps: ['heart-valves'] },
      { steps: ['anatomy/Heart'] },
      { steps: ['anatomy/a', 'anatomy/a'] },
      { level: 'expert' },
      { title: '' },
    ]) {
      expect(trackSchema.safeParse({ ...track, ...change }).success).toBe(false);
    }
    expect(trackSchema.safeParse({ ...track, extra: 1 }).success).toBe(false);
  });
});

describe('trackId', () => {
  it('maps a track file to an article-shaped id', () => {
    expect(trackId('ru/heart-basics.yaml')).toBe('ru/track/heart-basics');
    expect(() => trackId('heart-basics.yaml')).toThrow();
    expect(() => trackId('ru/a/b.yaml')).toThrow();
  });
});

describe('trackSteps', () => {
  const page = (locale: string, type: string, slug: string): ArticlePage<string> => ({
    locale,
    type,
    slug,
    entry: slug,
    contentLocale: locale,
  });
  const pages = [
    page('ru', 'disease', 'aortic-stenosis'),
    page('ru', 'anatomy', 'heart-valves'),
    page('en', 'anatomy', 'heart-valves'),
  ];

  it('returns the article pages of the steps in order', () => {
    expect(trackSteps(trackSchema.parse(track), 'ru', pages).map((p) => p.slug)).toEqual([
      'heart-valves',
      'aortic-stenosis',
    ]);
  });

  it('fails on a step with no page in the locale', () => {
    expect(() => trackSteps(trackSchema.parse(track), 'en', pages)).toThrow(
      /disease\/aortic-stenosis/,
    );
  });
});

// The build checks steps too, but only for the content it builds; this covers both trees.
const trees = [
  new URL('../../../content/', import.meta.url),
  new URL('fixtures/site-content/', import.meta.url),
];

for (const tree of trees) {
  const dir = fileURLToPath(tree);
  const all = readdirSync(dir, { recursive: true, encoding: 'utf8' }).map((file) =>
    file.split(sep).join('/'),
  );
  const tracks = all.filter((file) => file.startsWith('tracks/') && file.endsWith('.yaml'));
  const articles = all
    .filter((file) => !file.startsWith('tracks/') && file.endsWith('.mdx'))
    .map((file) => ({ id: file.slice(0, -'.mdx'.length) }));

  describe(dir, () => {
    // The collection only loads tracks/<locale>/<id>.yaml; anything else would vanish silently.
    it('has track files only as tracks/<locale>/<id>.yaml', () => {
      const files = all.filter(
        (file) => file.startsWith('tracks/') && statSync(`${dir}${file}`).isFile(),
      );
      expect(files.filter((file) => !/^tracks\/[^/]+\/[^/]+\.yaml$/.test(file))).toEqual([]);
    });

    if (tracks.length > 0) {
      it.each(tracks)('%s is valid and every step has an article', (file) => {
        const id = trackId(file.slice('tracks/'.length));
        const [locale = ''] = id.split('/');
        expect(Object.keys(productionLocales)).toContain(locale);
        const data = trackSchema.parse(parse(readFileSync(`${dir}${file}`, 'utf8')));
        expect(() =>
          trackSteps(data, locale, articlePages(articles, productionLocales)),
        ).not.toThrow();
      });
    }
  });
}
