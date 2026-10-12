// @ts-check
// Checks that every internal link and asset in the built site points to a file that
// exists. Article sources use relative links (../heart-valves/) that only resolve on the
// built site, so lychee checks external links in the sources and this script checks
// internal ones in the build.
// Absolute links to the site itself (canonical, hreflang) are checked too.
// Usage: node scripts/check-internal-links.mjs [dist] [base] [site]
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const ORIGIN = 'https://internal.invalid';
const ATTRIBUTE_PATTERN = /\s(?:href|src)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
// Links inside code samples (the embed builder shows <iframe> code) are text, not links.
const CODE_PATTERN = /<(pre|code|textarea|template)\b[\s\S]*?<\/\1>/gi;

/** Returns the href and src values of an HTML page, without those inside code samples. */
export function extractLinks(html) {
  const text = html.replace(CODE_PATTERN, '');
  return [...text.matchAll(ATTRIBUTE_PATTERN)].map((m) => (m[1] ?? m[2]).trim());
}

/**
 * True for links this script cannot check: other sites, other schemes, same-page anchors.
 * Absolute links to `site` count as internal.
 */
export function isExternal(link, site = '') {
  if (site !== '' && link.startsWith(`${site}/`)) return false;
  return (
    link === '' || link.startsWith('#') || link.startsWith('//') || /^[a-z][a-z\d+.-]*:/i.test(link)
  );
}

/**
 * Maps an HTML file in the build to its URL path: ru/a/index.html → /base/ru/a/,
 * 404.html → /base/404.html.
 */
export function pageUrl(file, base) {
  const path = file.split(sep).join('/');
  return base + (path.endsWith('index.html') ? path.slice(0, -'index.html'.length) : path);
}

/**
 * Resolves a link on a page to a path relative to the build directory, or undefined
 * when the link leaves the site's base path.
 */
export function targetPath(link, page, base) {
  const url = new URL(link, ORIGIN + page);
  const path = decodeURIComponent(url.pathname);
  if (!path.startsWith(base)) return undefined;
  return path.slice(base.length);
}

/** @param {string} path */
async function isFile(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

/** True when a path relative to the build directory is served as a file. */
async function exists(dist, path) {
  const file = join(dist, path);
  if (path === '' || path.endsWith('/')) return isFile(join(file, 'index.html'));
  return (await isFile(file)) || isFile(join(file, 'index.html'));
}

/**
 * Returns the broken internal links of a build as { page, link } pairs.
 * @param {string} dist @param {string} base @param {string} [site] origin, e.g. https://example.org
 */
export async function findBrokenLinks(dist, base, site = '') {
  const entries = await readdir(dist, { recursive: true, withFileTypes: true });
  const pages = entries
    .filter((e) => e.isFile() && e.name.endsWith('.html'))
    .map((e) => relative(dist, join(e.parentPath, e.name)))
    .sort();
  const broken = [];
  for (const file of pages) {
    const page = pageUrl(file, base);
    const html = await readFile(join(dist, file), 'utf8');
    for (const link of new Set(extractLinks(html))) {
      if (isExternal(link, site)) continue;
      const target = targetPath(link, page, base);
      if (target === undefined || !(await exists(dist, target))) broken.push({ page, link });
    }
  }
  return broken;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const dist = process.argv[2] ?? 'apps/web/dist';
  const base = (process.argv[3] ?? process.env.BASE_PATH ?? '/heart-atlas').replace(/\/?$/, '/');
  const site = (process.argv[4] ?? process.env.SITE_URL ?? 'https://w3lld1.github.io').replace(
    /\/$/,
    '',
  );
  const broken = await findBrokenLinks(dist, base, site);
  for (const { page, link } of broken) console.error(`${page}: ${link}`);
  if (broken.length > 0) {
    console.error(`${broken.length} broken internal link(s).`);
    process.exit(1);
  }
  console.log('All internal links resolve.');
}
