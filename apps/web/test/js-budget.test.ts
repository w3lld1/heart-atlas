import { describe, expect, it } from 'vitest';
import { fontUrls, jsReferences, lazy3dEntry } from '../scripts/js-budget.ts';

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

describe('lazy3dEntry', () => {
  it('matches only the entries of 3D loaded on demand', () => {
    expect(lazy3dEntry.test('hero.DZVkaJ9a.js')).toBe(true);
    expect(lazy3dEntry.test('Scene.C1uH2Hdb.js')).toBe(true);
    expect(lazy3dEntry.test('hero-state.CMDD34wJ.js')).toBe(false);
    expect(lazy3dEntry.test('HeroScene.DxVQ1ha-.js')).toBe(false);
    expect(lazy3dEntry.test('index.astro_astro_type_script_index_0_lang.b.js')).toBe(false);
  });
});
