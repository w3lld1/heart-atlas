import { describe, expect, it } from 'vitest';
import { counted, fontUrls, jsImports, jsReferences, onDemandEntry } from '../scripts/js-budget.ts';

describe('jsReferences', () => {
  it('finds script, island and preload URLs in HTML', () => {
    const html = `
      <script type="module" src="/heart-atlas/_astro/a.js"></script>
      <astro-island component-url="/heart-atlas/_astro/b.js" renderer-url="/heart-atlas/_astro/c.js"></astro-island>
      <link rel="modulepreload" href="/heart-atlas/_astro/d.js">`;
    expect(jsReferences(html).sort()).toEqual([
      '/heart-atlas/_astro/a.js',
      '/heart-atlas/_astro/b.js',
      '/heart-atlas/_astro/c.js',
      '/heart-atlas/_astro/d.js',
    ]);
  });

  it('finds static and dynamic imports in minified JS', () => {
    const js =
      'import{a as b}from"./e.js";import"./f.js";const g=()=>import("./g.js");' +
      'const h=()=>import(`./h.js`);';
    expect(jsReferences(js).sort()).toEqual(['./e.js', './f.js', './g.js', './h.js']);
    expect(jsImports(js).filter((reference) => reference.dynamic)).toEqual([
      { url: './g.js', dynamic: true },
      { url: './h.js', dynamic: true },
    ]);
  });
});

describe('counted', () => {
  it('leaves out an on-demand entry only when it is loaded with import()', () => {
    expect(counted('_astro/player.C9dE8fGh.js', true, 'a.js')).toBe('');
    expect(() => counted('_astro/player.C9dE8fGh.js', false, 'a.js')).toThrow(/up front/);
    expect(counted('_astro/HeartSounds.xA7Uo7RQ.js', false, 'a.js')).toBe(
      '_astro/HeartSounds.xA7Uo7RQ.js',
    );
  });
});

describe('fontUrls', () => {
  const css =
    '@font-face{font-family:A;src:url(/a-latin.woff2)format("woff2");unicode-range:U+??,U+131}' +
    '@font-face{font-family:A;src:url(/a-cyrillic.woff2)format("woff2");unicode-range:U+0400-045F}' +
    '@font-face{font-family:A;src:url(/a-greek.woff2)format("woff2");unicode-range:U+0370-03FF}';

  it('counts only the faces the text needs, reading minified wildcard ranges', () => {
    expect(fontUrls(css, 'Hello')).toEqual(['/a-latin.woff2']);
    expect(fontUrls(css, 'Привет, мир')).toEqual(['/a-latin.woff2', '/a-cyrillic.woff2']);
  });
});

describe('onDemandEntry', () => {
  it('matches only the entries loaded on demand', () => {
    expect(onDemandEntry.test('hero.DZVkaJ9a.js')).toBe(true);
    expect(onDemandEntry.test('Scene.C1uH2Hdb.js')).toBe(true);
    expect(onDemandEntry.test('heart-sounds.Bq1x2Yz3.js')).toBe(true);
    expect(onDemandEntry.test('player.C9dE8fGh.js')).toBe(true);
    expect(onDemandEntry.test('wiggers-canvas.B2cD4eFg.js')).toBe(true);
    expect(onDemandEntry.test('ecg-canvas.B2cD4eFg.js')).toBe(false);
    expect(onDemandEntry.test('player-clock.Dk3L9mNp.js')).toBe(false);
    expect(onDemandEntry.test('HeartSounds.xA7Uo7RQ.js')).toBe(false);
    expect(onDemandEntry.test('hero-state.CMDD34wJ.js')).toBe(false);
    expect(onDemandEntry.test('HeroScene.DxVQ1ha-.js')).toBe(false);
    expect(onDemandEntry.test('index.astro_astro_type_script_index_0_lang.b.js')).toBe(false);
  });
});
