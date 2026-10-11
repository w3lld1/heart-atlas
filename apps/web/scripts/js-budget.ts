// Checks the gzip size of the JavaScript each article page can load, against the stage 4 budget.
// Run after `pnpm build`: `node scripts/js-budget.ts`. Measures dist/ itself, so the result does
// not depend on whether the preview server compresses responses.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import { articleTypes } from '../src/lib/content.ts';

/** Stage 4 spec: JS on an article page without 3D, gzip. */
export const budgetBytes = 100 * 1024;

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

/** gzip bytes of inline scripts plus every JS file reachable from the page. */
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
    if (!file || seen.has(file)) continue;
    seen.add(file);
    const code = readFileSync(file);
    bytes += gzipSize(code);
    for (const url of jsReferences(code.toString('utf8'))) {
      pending.push(resolveFile(url, file) ?? '');
    }
  }
  return { bytes, files: [...seen].map((file) => relative(dist, file)) };
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
  const pages = articlePages();
  if (pages.length === 0) {
    console.error('js-budget: no article pages in dist/; run `pnpm build` first');
    process.exit(1);
  }
  const results = pages.map((file) => ({ page: relative(dist, file), ...pageJsBytes(file) }));
  results.sort((a, b) => b.bytes - a.bytes);
  const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;
  const over = results.filter((result) => result.bytes > budgetBytes);
  const largest = results[0];
  if (largest) {
    console.log(
      `js-budget: ${results.length} article pages, largest ${largest.page} ${kb(largest.bytes)} gzip (budget ${kb(budgetBytes)})`,
    );
  }
  for (const result of over) {
    console.error(`  over budget: ${result.page} ${kb(result.bytes)}: ${result.files.join(', ')}`);
  }
  if (over.length > 0) process.exit(1);
}
