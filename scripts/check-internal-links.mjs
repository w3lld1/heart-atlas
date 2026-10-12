// @ts-check
// Checks that every internal link and asset in the built site points to a file that
// exists. Article sources use relative links (../heart-valves/) that only resolve on the
// built site, so lychee checks external links in the sources and this script checks
// internal ones in the build.
// Absolute links to the site itself (canonical, hreflang) are checked too. Not covered:
// links in CSS, the web manifests and the service worker, and the test-content build.
// Usage: node scripts/check-internal-links.mjs [dist] [base] [site]
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const ORIGIN = 'https://internal.invalid';
const ATTRIBUTE_PATTERN = /\s(href|src|srcset|action|poster)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
// Links inside code samples (the embed builder shows <iframe> code) are text, not links.
const CODE_PATTERN = /<(pre|code|textarea|template)(?=[\s>])[\s\S]*?<\/\1>/gi;
// Script bodies too; the <script src> tag itself stays.
const SCRIPT_BODY_PATTERN = /(<script(?=[\s>])[^>]*>)[\s\S]*?<\/script>/gi;
/** @type {Record<string, string>} */
const ENTITIES = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' };

/** @param {string} value */
function decodeEntities(value) {
  return value.replace(/&(amp|quot|apos|lt|gt);/g, (_, name) => ENTITIES[name] ?? '');
}

/**
 * Returns the link values of an HTML page (href, src, each srcset candidate, form action,
 * video poster), without those inside code samples and script bodies.
 */
export function extractLinks(html) {
  const text = html.replace(CODE_PATTERN, '').replace(SCRIPT_BODY_PATTERN, '$1</script>');
  return [...text.matchAll(ATTRIBUTE_PATTERN)].flatMap((m) => {
    const value = decodeEntities((m[2] ?? m[3]).trim());
    if (m[1].toLowerCase() !== 'srcset') return [value];
    return value
      .split(',')
      .map((candidate) => candidate.trim().split(/\s+/)[0])
      .filter(Boolean);
  });
}

/**
 * True for links this script cannot check: other sites, other schemes, same-page anchors.
 * Absolute links to `site` count as internal.
 */
export function isExternal(link, site = '') {
  if (site !== '' && link.toLowerCase().startsWith(`${site.toLowerCase()}/`)) return false;
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
 * when the link leaves the site's base path or cannot be decoded.
 */
export function targetPath(link, page, base) {
  const url = new URL(link, ORIGIN + page);
  let path;
  try {
    path = decodeURIComponent(url.pathname);
  } catch {
    return undefined; // A malformed escape cannot name a file: report the link as broken.
  }
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
  const site = (process.argv[4] ?? (process.env.SITE_URL || 'https://w3lld1.github.io')).replace(
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
