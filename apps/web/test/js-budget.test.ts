import { describe, expect, it } from 'vitest';
import { jsReferences } from '../scripts/js-budget.ts';

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
