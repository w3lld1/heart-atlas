import { readdirSync, readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { defaultLocale, localeCodes, productionLocales } from '../src/i18n/locales.ts';
import { axe } from './axe.ts';

// messages.ts relies on Vite's import.meta.glob, so tests read the strings files directly.
const messages = (locale: string): Record<string, string> => {
  const file =
    locale in productionLocales
      ? `../src/i18n/messages/${locale}.json`
      : `../test/fixtures/i18n/${locale}.json`;
  return JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8')) as Record<string, string>;
};
const text = (locale: string, key: string): string => messages(locale)[key] ?? key;

/** Every built page of a locale, as paths relative to the base URL. */
const builtPages = (locale: string): string[] =>
  readdirSync(new URL(`../dist/${locale}/`, import.meta.url), { recursive: true })
    .map((file) => String(file).replaceAll('\\', '/'))
    .filter((file) => file === 'index.html' || file.endsWith('/index.html'))
    .map((file) => `${locale}/${file.slice(0, -'index.html'.length)}`)
    .sort();

const menu = (page: Page, locale: string) =>
  page.getByRole('banner').getByRole('navigation', { name: text(locale, 'nav.sections') });

/**
 * The first article listed under a section of the menu, and its type. Which
 * sections have articles depends on the content (CI also runs on fictional test articles).
 */
async function firstArticle(page: Page, locale: string): Promise<{ href: string; type: string }> {
  await page.goto(`${locale}/`);
  const sections = await menu(page, locale)
    .getByRole('link')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));
  for (const section of sections) {
    const type = /\/([a-z-]+)\/$/.exec(section)?.[1];
    if (!type || type === 'heart-clock' || type === locale) continue;
    await page.goto(section);
    const href = await page
      .locator('main a')
      .evaluateAll(
        (links, prefix) =>
          links
            .map((link) => link.getAttribute('href') ?? '')
            .find((href) => href.startsWith(prefix) && /^[^/]+\/$/.test(href.slice(prefix.length))),
        section,
      );
    if (href) return { href, type };
  }
  throw new Error('No section lists an article');
}

// localeCodes includes the right-to-left test locale in a build with HA_TEST_LOCALES=1.
for (const locale of localeCodes) {
  test.describe(`header and footer (${locale})`, () => {
    test('menu marks the current page and its section', async ({ page }) => {
      await page.goto(`${locale}/`);
      await expect(
        menu(page, locale).getByRole('link', { name: text(locale, 'nav.home'), exact: true }),
      ).toHaveAttribute('aria-current', 'page');

      await page.goto(`${locale}/heart-clock/`);
      const clock = menu(page, locale).getByRole('link', {
        name: text(locale, 'nav.clock'),
        exact: true,
      });
      await expect(clock).toHaveAttribute('aria-current', 'page');
      await expect(menu(page, locale).locator('[aria-current]')).toHaveCount(1);

      const article = await firstArticle(page, locale);
      await page.goto(article.href);
      const section = menu(page, locale).getByRole('link', {
        name: text(locale, `articles.type.${article.type}`),
        exact: true,
      });
      await expect(section).toHaveAttribute('aria-current', 'true');
    });

    test('menu and footer links open pages that exist', async ({ page, request, baseURL }) => {
      await page.goto(`${locale}/`);
      const base = new URL(baseURL ?? '').pathname;
      const hrefs = await page
        .locator('header nav a, footer a')
        .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));
      const internal = [...new Set(hrefs.filter((href) => href.startsWith('/')))];
      expect(internal.length).toBeGreaterThan(4);
      for (const href of internal) {
        expect(href.startsWith(base), href).toBe(true);
        expect((await request.get(href)).status(), href).toBe(200);
      }
    });

    test('no page scrolls sideways at 320 px', async ({ page }) => {
      // At this width the 3D viewers wait for a tap, so this loop never starts WebGL next to the
      // webgl project.
      test.slow();
      await page.setViewportSize({ width: 320, height: 640 });
      const paths = builtPages(locale);
      expect(paths.length).toBeGreaterThan(5);
      for (const path of paths) {
        await page.goto(path);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, path).toBeLessThanOrEqual(0);
      }
      await page.goto(`${locale}/`);
      // The menu keeps every item: the ones that do not fit scroll inside the menu.
      const last = menu(page, locale).getByRole('listitem').last().getByRole('link');
      await last.focus();
      await expect(last).toBeInViewport();
    });

    for (const colorScheme of ['light', 'dark'] as const) {
      test(`article page has no axe violations (${colorScheme})`, async ({ page }) => {
        await page.emulateMedia({ colorScheme });
        await page.goto((await firstArticle(page, locale)).href);
        const results = await axe(page).analyze();
        expect(results.violations).toEqual([]);
      });
    }
  });
}

test('an unknown address shows the site 404 page in every language, with no axe violations', async ({
  page,
}) => {
  const response = await page.goto('no-such-page/at-all/');
  expect(response?.status()).toBe(404);
  // The default language heads the page; the others follow as sections.
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    text(defaultLocale, 'notFound.title'),
  );
  for (const locale of Object.keys(productionLocales).filter((code) => code !== defaultLocale)) {
    await expect(
      page.getByRole('heading', { level: 2, name: text(locale, 'notFound.title'), exact: true }),
    ).toBeVisible();
  }
  for (const locale of Object.keys(productionLocales)) {
    await expect(
      page.getByRole('link', { name: text(locale, 'notFound.home'), exact: true }).first(),
    ).toHaveAttribute('href', new RegExp(`/${locale}/$`));
    await expect(
      page.getByRole('link', { name: text(locale, 'notFound.search'), exact: true }),
    ).toHaveAttribute('href', new RegExp(`/${locale}/search/$`));
  }
  // The page is in no section, so no menu item is current.
  await expect(menu(page, defaultLocale).locator('a[aria-current]')).toHaveCount(0);
  expect((await axe(page).analyze()).violations).toEqual([]);
});
