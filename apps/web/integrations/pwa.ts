import { createHash } from 'node:crypto';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import type { AstroIntegrationLogger } from 'astro';
import { defaultLocale, localeCodes, locales } from '../src/i18n/locales.ts';

const productionMessages = new URL('../src/i18n/messages/', import.meta.url);
const testMessages = new URL('../test/fixtures/i18n/', import.meta.url);
const serviceWorkerSource = new URL('./service-worker.js', import.meta.url);

/** Above this the precache stops being a cheap first install; see the stage 4 spec. */
const precacheBudget = 5 * 1024 * 1024;

/**
 * The lazy 3D scene chunk (packages/viewer Scene.tsx). It also holds three.js for the home page
 * hero (HeroScene imports it), so offline the hero keeps its poster unless the chunk is cached.
 */
export const threeDCode = /[\\/]Scene\.[\w-]+\.js$/;

async function messages(code: string): Promise<Record<string, string>> {
  for (const dir of [productionMessages, testMessages]) {
    try {
      return JSON.parse(await readFile(new URL(`${code}.json`, dir), 'utf8')) as Record<
        string,
        string
      >;
    } catch {
      // Not in this directory; try the next one.
    }
  }
  throw new Error(`No strings file for locale "${code}"`);
}

/**
 * One manifest per locale. They share `id` and `scope`, so installing from any language gives
 * the same app; `start_url` and the names follow the page's language.
 */
export async function writeManifests(site: string, base: string) {
  for (const code of localeCodes) {
    const t = await messages(code);
    const manifest = {
      id: base,
      scope: base,
      start_url: `${base}${code}/`,
      name: t['site.name'],
      short_name: t['site.name'],
      description: t['site.description'],
      lang: code,
      dir: locales[code]?.dir ?? 'ltr',
      display: 'standalone',
      background_color: '#f3f7fc',
      theme_color: '#f3f7fc',
      icons: [
        { src: `${base}icons/icon-192.png`, sizes: '192x192', type: 'image/png' },
        { src: `${base}icons/icon-512.png`, sizes: '512x512', type: 'image/png' },
        {
          src: `${base}icons/icon-maskable-512.png`,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    };
    await writeFile(join(site, `manifest.${code}.webmanifest`), JSON.stringify(manifest, null, 2));
  }
}

async function filesUnder(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));
}

/**
 * Writes <site>/sw.js: the hand-written worker from service-worker.js with its config
 * (precache list, locales, version) prepended. The version is a hash of every precached file,
 * so any change to them installs a new worker.
 */
export async function writeServiceWorker(
  site: string,
  base: string,
  logger: AstroIntegrationLogger,
) {
  const pages = localeCodes.flatMap((code) =>
    ['', 'offline/', 'search/'].map((page) => join(site, code, page, 'index.html')),
  );
  const assets = [
    // The 3D scene code (three.js, about 1 MB) is not shell and does nothing without a model, and
    // models are never precached; the asset cache keeps it once a model has opened on a page the
    // worker controls, like the media cache keeps the model.
    ...(await filesUnder(join(site, '_astro'))).filter((file) => !threeDCode.test(file)),
    // Only what the search page loads: the default UI, the search API, the index itself.
    ...(await filesUnder(join(site, 'pagefind'))).filter(
      (file) => !/pagefind-(component-ui|modular-ui|highlight)\./.test(file),
    ),
    ...(await filesUnder(join(site, 'icons'))),
    join(site, 'favicon.svg'),
    ...localeCodes.map((code) => join(site, `manifest.${code}.webmanifest`)),
  ];

  const hash = createHash('sha256');
  let bytes = 0;
  const urls: string[] = [];
  for (const file of [...pages, ...assets].sort()) {
    const path = relative(site, file).split(sep).join('/');
    hash.update(path).update(await readFile(file));
    bytes += (await stat(file)).size;
    urls.push(`${base}${path.replace(/(^|\/)index\.html$/, '$1')}`);
  }
  const source = await readFile(serviceWorkerSource, 'utf8');
  hash.update(source);

  const config = {
    version: hash.digest('hex').slice(0, 12),
    base,
    locales: localeCodes,
    defaultLocale,
    precache: urls,
  };
  await writeFile(join(site, 'sw.js'), `const CONFIG = ${JSON.stringify(config)};\n${source}`);

  const size = `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes > precacheBudget) {
    // Every first visit downloads the precache, so growth must be a deliberate decision.
    throw new Error(`Service worker precache is ${size}, over the 5 MB budget (stage 4 spec)`);
  }
  logger.info(`Service worker precaches ${urls.length} files (${size})`);
}
