import { readFileSync } from 'node:fs';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { productionLocales } from '../src/i18n/locales.ts';
import { testLocales } from '../test/fixtures/i18n/locales.ts';
import { axe } from './axe.ts';

// Must match the flags the site was built with.
const withTestLocales = process.env['HA_TEST_LOCALES'] === '1';
const withTestContent = process.env['HA_TEST_CONTENT'] === '1';

const registry = withTestLocales ? { ...productionLocales, ...testLocales } : productionLocales;
const codes = Object.keys(registry);
const [locale = 'ru', other = 'en'] = Object.keys(productionLocales);

const messages = (code: string): Record<string, string> => {
  const dir = code in productionLocales ? '../src/i18n/messages/' : '../test/fixtures/i18n/';
  return JSON.parse(readFileSync(new URL(`${dir}${code}.json`, import.meta.url), 'utf8')) as Record<
    string,
    string
  >;
};

test.use({ serviceWorkers: 'allow' });

/** Opens a page and waits until the worker has installed and precached everything. */
async function install(page: Page, path: string) {
  await page.goto(path);
  return page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
}

/**
 * setOffline does not cut requests to localhost, so the worker's own network requests are
 * aborted instead: everything the page gets must come from the worker's caches.
 */
async function goOffline(context: BrowserContext) {
  await context.setOffline(true);
  await context.route('**/*', (route) =>
    route.request().serviceWorker() ? route.abort('internetdisconnected') : route.continue(),
  );
}

for (const code of codes) {
  test(`manifest describes the app (${code})`, async ({ page, request, baseURL }) => {
    const base = new URL(baseURL ?? '').pathname;
    await page.goto(`${code}/`);
    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    const response = await request.get(href ?? '');
    expect(response.ok()).toBe(true);
    const manifest = (await response.json()) as Record<string, unknown> & {
      icons: { src: string; sizes: string; purpose?: string }[];
    };
    expect(manifest).toMatchObject({
      id: base,
      scope: base,
      start_url: `${base}${code}/`,
      lang: code,
      dir: registry[code as keyof typeof registry].dir,
      name: messages(code)['site.name'],
    });
    expect(manifest.icons.map((icon) => icon.sizes)).toEqual(
      expect.arrayContaining(['192x192', '512x512']),
    );
    expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
    for (const icon of manifest.icons) {
      expect((await request.get(icon.src)).ok()).toBe(true);
    }
  });
}

test('works offline after the first visit', async ({ page, context, baseURL }) => {
  const base = new URL(baseURL ?? '').pathname;
  const t = messages(locale);

  const scope = await install(page, `${locale}/`);
  expect(new URL(scope).pathname).toBe(base);
  await expect(page.locator('.update-notice')).toBeHidden();

  await goOffline(context);

  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  await page.goto(`${other}/`);
  await expect(page.locator('html')).toHaveAttribute('lang', other);

  // The root redirect page is not cached; offline it opens the locale home instead.
  await page.goto('');
  await expect(page.locator('main#content')).toBeVisible();

  await page.goto(`${locale}/not-cached/`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(t['offline.title'] ?? '');
  expect((await axe(page).analyze()).violations).toEqual([]);

  await page.goto(`${locale}/search/?q=${encodeURIComponent('анатомия')}`);
  await expect(page.locator('.pagefind-ui__result-link').first()).toBeVisible();
});

test('pages come from the network while online', async ({ page, context }) => {
  await install(page, `${locale}/`);
  await page.reload();
  // A changed page on the server must win over the cached copy.
  await context.route(`**/${locale}/`, async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace('</main>', '<p id="fresh">fresh</p></main>');
    return route.fulfill({ response, body });
  });
  await page.reload();
  await expect(page.locator('#fresh')).toBeVisible();
});

test.describe('articles', () => {
  test.skip(!withTestContent, 'needs the HA_TEST_CONTENT=1 build');

  test('an article read online opens offline with its scripts', async ({ page, context }) => {
    await install(page, `${locale}/`);
    await page.goto(`${locale}/disease/test-condition/`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await goOffline(context);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // The level switch needs its script, so this works only if the script came from a cache.
    await page.getByRole('button', { name: messages(locale)['level.student'] ?? '' }).click();
    await expect(page.locator('.level[data-level="student"]')).toBeVisible();
  });
});
