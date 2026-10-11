import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import { writeManifests, writeServiceWorker } from './pwa.ts';
import { buildSearchIndex } from './search-index.ts';

/**
 * Runs after `astro build`, in a fixed order: the search index first, because the service
 * worker precaches it; then the per-locale manifests; then the service worker.
 */
export default function postBuild(): AstroIntegration {
  let base = '/';
  return {
    name: 'heart-atlas:post-build',
    hooks: {
      'astro:config:done': ({ config }) => {
        base = config.base;
      },
      'astro:build:done': async ({ dir, logger }) => {
        const site = fileURLToPath(dir);
        await buildSearchIndex(site, logger);
        await writeManifests(site, base);
        await writeServiceWorker(site, base, logger);
      },
    },
  };
}
