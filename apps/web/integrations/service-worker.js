// Heart Atlas service worker. post-build.ts prepends `const CONFIG = {...}` and writes the
// result to dist/sw.js. Plain JavaScript on purpose: it is copied, not bundled.
//
// Caches (all prefixed: the w3lld1.github.io origin is shared with other projects):
// - precache, versioned: app shell, home, search and offline pages, the search index;
// - pages: HTML the reader opened, network-first;
// - assets: hashed /_astro/ files not in the current precache (old pages still need them);
// - media: models and sounds, stale-while-revalidate.

const PRECACHE = `heart-atlas-precache-${CONFIG.version}`;
const PAGES = 'heart-atlas-pages';
const ASSETS = 'heart-atlas-assets';
const MEDIA = 'heart-atlas-media';
const MEDIA_FILE = /\.(glb|gltf|bin|ktx2|mp3|ogg|wav|webm)$/;
const ANY = { ignoreSearch: true, ignoreVary: true };

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE)
      // `reload` skips the HTTP cache, so a new version never stores files from the old one.
      .then((cache) =>
        cache.addAll(CONFIG.precache.map((url) => new Request(url, { cache: 'reload' }))),
      ),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('heart-atlas-precache-') && key !== PRECACHE)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
});

// The page asks for this when the reader accepts the "new version" notice.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

function segments(url) {
  return url.pathname.slice(CONFIG.base.length).split('/');
}

function localeOf(url) {
  const first = segments(url)[0];
  return CONFIG.locales.includes(first) ? first : CONFIG.defaultLocale;
}

async function match(cacheNames, request, options) {
  for (const name of cacheNames) {
    const response = await (await caches.open(name)).match(request, options);
    if (response) return response;
  }
  return undefined;
}

/** Stores a full, same-origin response; storage errors never affect what the reader gets. */
async function store(cacheName, request, response, max) {
  if (response.status !== 200 || response.type !== 'basic') return;
  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response);
    const keys = await cache.keys();
    await Promise.all(
      keys.slice(0, Math.max(0, keys.length - max)).map((key) => cache.delete(key)),
    );
  } catch {
    // Quota or eviction: the site still works online.
  }
}

async function page(event) {
  const { request } = event;
  const url = new URL(request.url);
  try {
    const response = await fetch(request);
    event.waitUntil(store(PAGES, request, response.clone(), 100));
    return response;
  } catch {
    const home = `${CONFIG.base}${localeOf(url)}/`;
    // The site root and "/ru" without a slash are the locale home page.
    const isHome = segments(url).filter(Boolean).length <= 1 && !url.pathname.endsWith('.html');
    return (
      (await match([PRECACHE, PAGES], request, ANY)) ??
      (isHome ? await match([PRECACHE], home, ANY) : undefined) ??
      (await match([PRECACHE], `${CONFIG.base}${localeOf(url)}/offline/`, ANY)) ??
      Response.error()
    );
  }
}

async function asset(event) {
  const { request } = event;
  const cached = await match([PRECACHE, ASSETS], request, { ignoreVary: true });
  if (cached) return cached;
  const response = await fetch(request);
  event.waitUntil(store(ASSETS, request, response.clone(), 300));
  return response;
}

async function media(event) {
  const { request } = event;
  const network = fetch(request).then((response) => {
    event.waitUntil(store(MEDIA, request, response.clone(), 20));
    return response;
  });
  const cached = await match([MEDIA], request, { ignoreVary: true });
  if (cached) {
    // Serve the saved copy now and refresh it in the background.
    event.waitUntil(network.catch(() => undefined));
    return cached;
  }
  return network;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(CONFIG.base)) return;
  // Embedded modules live inside other sites; leave them to the network. The builder page
  // /<locale>/embed/ itself is a normal site page.
  if (segments(url)[1] === 'embed' && segments(url)[2]) return;
  // Range requests (audio and video seeking) return partial responses that cannot be cached.
  if (request.headers.has('range')) return;

  if (request.mode === 'navigate') {
    event.respondWith(page(event));
  } else if (MEDIA_FILE.test(url.pathname)) {
    event.respondWith(media(event));
  } else if (url.pathname.startsWith(`${CONFIG.base}_astro/`)) {
    event.respondWith(asset(event));
  } else {
    // Pagefind requests pagefind-entry.json?ts=…, so its query is ignored. ignoreVary: module
    // imports send Origin, and a `Vary: Origin` response would otherwise never match.
    const ignoreSearch = url.pathname.startsWith(`${CONFIG.base}pagefind/`);
    event.respondWith(
      match([PRECACHE], request, { ignoreSearch, ignoreVary: true }).then(
        (cached) => cached ?? fetch(request),
      ),
    );
  }
});
