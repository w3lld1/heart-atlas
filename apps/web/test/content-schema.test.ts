import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  createArticleSchema,
  isSourcesCheckStale,
  isValidIsbn,
  parseTrustedSources,
} from '../src/lib/content';
import { readFrontmatter } from './frontmatter';

const trusted = parseTrustedSources(
  readFileSync(new URL('../../../content/trusted-sources.yaml', import.meta.url), 'utf8'),
);
const articleSchema = createArticleSchema(trusted);
const fixture = (name: string) =>
  readFrontmatter(new URL(`fixtures/content/${name}.mdx`, import.meta.url));

describe('trusted-sources.yaml', () => {
  it('lists the organizations from the spec', () => {
    expect(trusted.esc).toEqual({ name: 'European Society of Cardiology', tier: 'guideline' });
    expect(trusted.statpearls?.tier).toBe('reference');
  });

  it('rejects an organization with an unknown tier', () => {
    expect(() => parseTrustedSources('acme: { name: Acme, tier: blog }')).toThrow();
  });
});

describe('article schema', () => {
  it.each(['valid-disease', 'valid-anatomy'])('accepts %s', (name) => {
    expect(articleSchema.safeParse(fixture(name)).error).toBeUndefined();
  });

  it('defaults review to null and coerces sources_checked to a Date', () => {
    const article = articleSchema.parse(fixture('valid-anatomy'));
    expect(article.review).toBeNull();
    expect(article.sources_checked).toEqual(new Date('2026-10-11'));
  });

  it.each([
    ['invalid-single-source', 'needs at least two sources'],
    ['invalid-no-guideline', 'needs at least one guideline source'],
    ['invalid-unknown-org', 'Unknown org "unknown-society"'],
    ['invalid-tier-mismatch', 'is listed as reference, not guideline'],
    ['invalid-review-without-doi', 'A review source needs a doi'],
    ['invalid-textbook-bad-isbn', 'ISBN check digit is invalid'],
    ['invalid-no-sources', 'An article needs at least one source'],
  ])('rejects %s', (name, message) => {
    const result = articleSchema.safeParse(fixture(name));
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toContainEqual(
      expect.stringContaining(message),
    );
  });

  const valid = () => structuredClone(fixture('valid-anatomy')) as Record<string, unknown>;

  it('defaults aliases to an empty list and trims them', () => {
    expect(articleSchema.parse(valid()).aliases).toEqual([]);
    expect(articleSchema.parse({ ...valid(), aliases: [' ФП '] }).aliases).toEqual(['ФП']);
  });

  it('rejects an empty alias and a plain string', () => {
    expect(articleSchema.safeParse({ ...valid(), aliases: ['  '] }).success).toBe(false);
    expect(articleSchema.safeParse({ ...valid(), aliases: 'ФП' }).success).toBe(false);
  });

  it('rejects an alias that repeats another alias or the title', () => {
    const article = valid();
    for (const aliases of [['ФП', 'фп'], [String(article['title']).toUpperCase()]]) {
      const result = articleSchema.safeParse({ ...article, aliases });
      expect(result.error?.issues.map((issue) => issue.message)).toContainEqual(
        expect.stringContaining('repeats the title or another alias'),
      );
    }
  });

  it('accepts a disease preset and rejects normal or an unknown one', () => {
    expect(articleSchema.parse({ ...valid(), preset: 'aortic-stenosis' }).preset).toBe(
      'aortic-stenosis',
    );
    expect(articleSchema.safeParse({ ...valid(), preset: 'normal' }).success).toBe(false);
    expect(articleSchema.safeParse({ ...valid(), preset: 'af' }).success).toBe(false);
    // A state after treatment comes only with its disease (presetTreated).
    expect(
      articleSchema.safeParse({ ...valid(), preset: 'sick-sinus-syndrome-paced' }).success,
    ).toBe(false);
  });

  it('accepts more presets after the main one', () => {
    const preset = 'av-block-first-degree';
    const more = ['av-block-second-degree-mobitz-1', 'av-block-second-degree-mobitz-2'];
    expect(articleSchema.parse({ ...valid(), preset, morePresets: more }).morePresets).toEqual(
      more,
    );
    expect(articleSchema.parse(valid()).morePresets).toEqual([]);
    const messages = (frontmatter: object) =>
      articleSchema
        .safeParse({ ...valid(), ...frontmatter })
        .error?.issues.map((issue) => issue.message) ?? [];
    expect(messages({ morePresets: more })).toContain('morePresets needs preset');
    expect(messages({ preset, morePresets: [preset] })).toContainEqual(
      expect.stringContaining('already on the page'),
    );
    expect(messages({ preset, morePresets: [more[0], more[0]] })).toContainEqual(
      expect.stringContaining('already on the page'),
    );
    // The switch draws every preset in the lead of the main one.
    expect(messages({ preset: 'wpw-syndrome', morePresets: ['brugada-syndrome'] })).toContainEqual(
      expect.stringContaining('is drawn in lead V1, not II'),
    );
    // The same exclusions as `preset`.
    for (const id of ['normal', 'sick-sinus-syndrome-paced', 'af']) {
      expect(articleSchema.safeParse({ ...valid(), preset, morePresets: [id] }).success).toBe(
        false,
      );
    }
  });

  it('turns the Wiggers diagram off only for an article with a preset', () => {
    expect(articleSchema.parse(valid()).wiggers).toBe(true);
    const preset = 'av-block-third-degree';
    expect(articleSchema.parse({ ...valid(), preset, wiggers: false }).wiggers).toBe(false);
    expect(articleSchema.safeParse({ ...valid(), wiggers: false }).success).toBe(false);
  });

  it('rejects unknown frontmatter keys', () => {
    expect(articleSchema.safeParse({ ...valid(), source: [] }).success).toBe(false);
  });

  it('rejects a source with neither doi, isbn nor url', () => {
    const article = valid();
    article.sources = [{ tier: 'reference', org: 'statpearls', title: 'Fixture', year: 2025 }];
    expect(articleSchema.safeParse(article).success).toBe(false);
  });

  it('rejects a non-https url and a malformed doi', () => {
    const base = { tier: 'review', title: 'Fixture', year: 2023 };
    for (const source of [
      { ...base, doi: '10.1234/x', url: 'http://example.org' },
      { ...base, doi: 'doi:10.1234/x' },
    ]) {
      expect(articleSchema.safeParse({ ...valid(), sources: [source] }).success).toBe(false);
    }
  });

  it.each([null, 0, 2026, true, '11.10.2026', '2999-01-01'])(
    'rejects sources_checked %j',
    (value) => {
      expect(articleSchema.safeParse({ ...valid(), sources_checked: value }).success).toBe(false);
    },
  );

  it('accepts sources_checked given as a quoted string', () => {
    const article = articleSchema.parse({ ...valid(), sources_checked: '2026-10-11' });
    expect(article.sources_checked).toEqual(new Date('2026-10-11'));
  });

  it('rejects an unknown org on any tier', () => {
    const source = {
      tier: 'textbook',
      org: 'esc-typo',
      title: 'Fixture',
      year: 2020,
      isbn: '978-0-306-40615-7',
    };
    expect(articleSchema.safeParse({ ...valid(), sources: [source] }).success).toBe(false);
  });

  it('accepts an unhyphenated ISBN that YAML reads as a number', () => {
    const source = { tier: 'textbook', title: 'Fixture', year: 2020, isbn: 9780306406157 };
    const article = articleSchema.parse({ ...valid(), sources: [source] });
    expect(article.sources[0]?.isbn).toBe('9780306406157');
  });

  it('accepts a review object once a physician has checked the article', () => {
    const result = articleSchema.parse({
      ...valid(),
      review: { reviewer: 'Fixture Reviewer', date: '2026-10-11' },
    });
    expect(result.review?.date).toEqual(new Date('2026-10-11'));
  });
});

describe('isValidIsbn', () => {
  it.each(['978-0-306-40615-7', '0-306-40615-2', '0 8044 2957 X'])('accepts %s', (isbn) => {
    expect(isValidIsbn(isbn)).toBe(true);
  });

  it.each(['978-0-306-40615-8', '0-306-40615-3', '12345'])('rejects %s', (isbn) => {
    expect(isValidIsbn(isbn)).toBe(false);
  });
});

describe('isSourcesCheckStale', () => {
  const now = new Date('2026-10-11');

  it('is false within two years', () => {
    expect(isSourcesCheckStale(new Date('2024-10-11'), now)).toBe(false);
  });

  it('is true after two years', () => {
    expect(isSourcesCheckStale(new Date('2024-10-10'), now)).toBe(true);
  });
});
