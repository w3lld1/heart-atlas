// Checks the gzip size of the JavaScript each article page and home page can load, against the
// stage 4 budget, and the web fonts of the home page against the budget of the home page spec.
// Run after `pnpm build`: `node scripts/js-budget.ts`. Measures dist/ itself, so the result does
// not depend on whether the preview server compresses responses.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import { articleTypes } from '../src/lib/content.ts';

/** Stage 4 spec: JS on an article page without 3D, gzip. */
export const budgetBytes = 100 * 1024;

/** Home page spec: woff2 files the home page loads for its text (Cyrillic and Latin today). */
export const fontBudgetBytes = 150 * 1024;

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
// Same normalisation as astro.config.mjs.
const base = (process.env['BASE_PATH'] ?? '/heart-atlas').replace(/\/?$/, '/');

const gzipSize = (text: string | Buffer) => gzipSync(text, { level: 9 }).length;

/** URLs of JS modules referenced from HTML or JS: script src, island URLs, static and dynamic imports. */
export function jsReferences(source: string): string[] {
  const patterns = [
    /<script[^>]*\ssrc="([^"]+\.js)"/g,
    /(?:component-url|renderer-url|before-hydration-url)="([^"]+\.js)"/g,
    /<link[^>]*rel="modulepreload"[^>]*href="([^"]+\.js)"/g,
    // Minified output quotes dynamic imports with backticks.
    /\bfrom\s*["'`]([^"'`]+\.js)["'`]/g,
    /\bimport\s*\(?\s*["'`]([^"'`]+\.js)["'`]/g,
  ];
  return patterns.flatMap((pattern) =>
    [...source.matchAll(pattern)].map((match) => match[1] ?? ''),
  );
}

function resolveFile(url: string, from: string): string | undefined {
  if (/^[a-z]+:/i.test(url)) return undefined;
  if (url.startsWith(base)) return join(dist, url.slice(base.length));
  if (url.startsWith('/')) {
    // A root URL outside the base means BASE_PATH differs from the build; files would be missed.
    throw new Error(
      `js-budget: ${url} is outside BASE_PATH ${base}; set BASE_PATH as for the build`,
    );
  }
  return join(dirname(from), url);
}

/**
 * Entries of 3D that pages import only on demand, so they and what only they reach are the 3D the
 * budget leaves out: the live heart on the home page (`@heart-atlas/viewer/hero`, motion "full" or
 * the "Rotate in 3D" button) and the viewer's scene (`Scene.tsx`, after the load button; disease
 * articles show the viewer with its poster until then).
 */
export const lazy3dEntry = /^(hero|Scene)\.[\w-]+\.js$/;

/** gzip bytes of inline scripts plus every JS file reachable from the page, without the 3D heart. */
export function pageJsBytes(htmlFile: string): { bytes: number; files: string[] } {
  const html = readFileSync(htmlFile, 'utf8');
  let bytes = 0;
  const pending: string[] = [];
  for (const match of html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
    const code = match[1] ?? '';
    if (code.trim() === '') continue;
    bytes += gzipSize(code);
    for (const url of jsReferences(code)) pending.push(resolveFile(url, htmlFile) ?? '');
  }
  for (const url of jsReferences(html)) pending.push(resolveFile(url, htmlFile) ?? '');

  const seen = new Set<string>();
  while (pending.length > 0) {
    const file = pending.pop();
    if (!file || seen.has(file) || lazy3dEntry.test(basename(file))) continue;
    seen.add(file);
    const code = readFileSync(file);
    bytes += gzipSize(code);
    for (const url of jsReferences(code.toString('utf8'))) {
      pending.push(resolveFile(url, file) ?? '');
    }
  }
  return { bytes, files: [...seen].map((file) => relative(dist, file)) };
}

/**
 * woff2 URLs of the @font-face rules a browser downloads for `text`: those whose unicode-range
 * covers a character of it. Counts every family, so it overstates a little and never understates.
 */
export function fontUrls(css: string, text: string): string[] {
  const codePoints = new Set([...text].map((char) => char.codePointAt(0) ?? 0));
  const urls: string[] = [];
  for (const face of css.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
    const body = face[1] ?? '';
    const range = /unicode-range:\s*([^;]+)/.exec(body)?.[1];
    // A face without a range covers every character.
    const covers =
      range === undefined ||
      range.split(',').some((part) => {
        const [from = '', to = from] = part.trim().replace(/^U\+/i, '').split('-');
        // Minifiers write wildcard ranges: U+?? is U+00-FF.
        const low = Number.parseInt(from.replaceAll('?', '0'), 16);
        const high = Number.parseInt(to.replaceAll('?', 'F'), 16);
        for (const cp of codePoints) if (cp >= low && cp <= high) return true;
        return false;
      });
    if (!covers) continue;
    for (const url of body.matchAll(/url\(["']?([^"')]+\.woff2)["']?\)/g)) urls.push(url[1] ?? '');
  }
  return urls;
}

/** Visible text of a page: what its fonts have to draw. */
function pageText(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z]+;|&#\d+;/g, ' ');
}

/** Bytes of the woff2 files a page's stylesheets (linked or inline) load for the page's text. */
export function pageFontBytes(htmlFile: string): { bytes: number; files: string[] } {
  const html = readFileSync(htmlFile, 'utf8');
  const text = pageText(html);
  const sheets: { css: string; from: string }[] = [];
  for (const match of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
    sheets.push({ css: match[1] ?? '', from: htmlFile });
  }
  for (const match of html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)) {
    const file = resolveFile(match[1] ?? '', htmlFile);
    if (file) sheets.push({ css: readFileSync(file, 'utf8'), from: file });
  }
  const files = new Set<string>();
  for (const { css, from } of sheets) {
    for (const url of fontUrls(css, text)) {
      const file = resolveFile(url, from);
      if (file) files.add(file);
    }
  }
  let bytes = 0;
  for (const file of files) bytes += statSync(file).size;
  // Fonts inlined as data URLs (the handwritten line of the home page) count too.
  let inline = 0;
  for (const { css } of sheets) {
    for (const data of css.matchAll(/url\(["']?data:font\/woff2;base64,([A-Za-z0-9+/=]+)/g)) {
      inline += Buffer.from(data[1] ?? '', 'base64').byteLength;
    }
  }
  const names = [...files].map((file) => relative(dist, file));
  return { bytes: bytes + inline, files: inline > 0 ? [...names, 'inline fonts'] : names };
}

/** Home page of each locale. */
function homePages(): string[] {
  return readdirSync(dist)
    .map((locale) => join(dist, locale, 'index.html'))
    .filter((file) => statSync(file, { throwIfNoEntry: false })?.isFile());
}

function articlePages(): string[] {
  const pages: string[] = [];
  for (const locale of readdirSync(dist)) {
    for (const type of articleTypes) {
      const dir = join(dist, locale, type);
      if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) continue;
      for (const slug of readdirSync(dir)) {
        const file = join(dir, slug, 'index.html');
        if (statSync(file, { throwIfNoEntry: false })?.isFile()) pages.push(file);
      }
    }
  }
  return pages;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const homes = homePages();
  const pages = [...articlePages(), ...homes];
  if (pages.length === homes.length || homes.length === 0) {
    console.error('js-budget: no article or home pages in dist/; run `pnpm build` first');
    process.exit(1);
  }
  const results = pages.map((file) => ({ page: relative(dist, file), ...pageJsBytes(file) }));
  results.sort((a, b) => b.bytes - a.bytes);
  const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;
  const over = results.filter((result) => result.bytes > budgetBytes);
  const largest = results[0];
  if (largest) {
    console.log(
      `js-budget: ${results.length} article and home pages, largest ${largest.page} ${kb(largest.bytes)} gzip (budget ${kb(budgetBytes)})`,
    );
  }
  for (const result of over) {
    console.error(`  over budget: ${result.page} ${kb(result.bytes)}: ${result.files.join(', ')}`);
  }
  const fonts = homes.map((file) => ({ page: relative(dist, file), ...pageFontBytes(file) }));
  const fontsOver = fonts.filter((result) => result.bytes > fontBudgetBytes);
  const heaviest = fonts.sort((a, b) => b.bytes - a.bytes)[0];
  if (heaviest) {
    console.log(
      `js-budget: fonts of ${fonts.length} home pages, largest ${heaviest.page} ${kb(heaviest.bytes)} (budget ${kb(fontBudgetBytes)})`,
    );
  }
  for (const result of fontsOver) {
    console.error(
      `  fonts over budget: ${result.page} ${kb(result.bytes)}: ${result.files.join(', ')}`,
    );
  }
  if (over.length > 0 || fontsOver.length > 0) process.exit(1);
}
