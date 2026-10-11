import { readFile } from 'node:fs/promises';
import type { AstroIntegrationLogger } from 'astro';
import * as pagefind from 'pagefind';

/**
 * Builds the Pagefind index into <site>/pagefind/. Only pages whose <main> carries
 * data-pagefind-body are indexed (see BaseLayout `searchable`).
 */
export async function buildSearchIndex(site: string, logger: AstroIntegrationLogger) {
  try {
    const { index, errors } = await pagefind.createIndex({});
    if (!index) throw new Error(`Pagefind: ${errors.join('; ')}`);
    const added = await index.addDirectory({ path: site });
    if (added.errors.length > 0) throw new Error(`Pagefind: ${added.errors.join('; ')}`);
    const written = await index.writeFiles({ outputPath: `${site}pagefind` });
    if (written.errors.length > 0) throw new Error(`Pagefind: ${written.errors.join('; ')}`);
    const entry = JSON.parse(await readFile(`${site}pagefind/pagefind-entry.json`, 'utf8')) as {
      languages: Record<string, { page_count: number }>;
    };
    const counts = Object.entries(entry.languages).map(
      ([lang, { page_count }]) => `${lang}: ${page_count}`,
    );
    logger.info(`Pagefind indexed pages (${counts.join(', ')})`);
  } finally {
    await pagefind.close();
  }
}
