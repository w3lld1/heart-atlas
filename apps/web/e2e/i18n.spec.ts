import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { defaultLocale, productionLocales } from '../src/i18n/locales.ts';
import { testLocales } from '../test/fixtures/i18n/locales.ts';
import { axe } from './axe.ts';

const codes = Object.keys(productionLocales);
const testCodes = Object.keys(testLocales);
// Must match the HA_TEST_LOCALES value the site was built with.
const withTestLocales = process.env['HA_TEST_LOCALES'] === '1';

// messages.ts relies on Vite's import.meta.glob, so tests read the strings files directly.
const messages = (locale: string): Record<string, string> =>
  JSON.parse(
    readFileSync(new URL(`../src/i18n/messages/${locale}.json`, import.meta.url), 'utf8'),
  ) as Record<string, string>;

test('root redirects to the default locale', async ({ page, baseURL }) => {
  await page.goto('');
  await expect(page).toHaveURL(`${baseURL}${defaultLocale}/`);
  await expect(page.locator('main#content')).toBeVisible();
});

test('language switcher opens the same page in every locale', async ({ page, baseURL }) => {
  for (const from of codes) {
    for (const to of codes.filter((code) => code !== from)) {
      await page.goto(`${from}/`);
      const nav = page.getByRole('navigation', { name: messages(from)['nav.language'] ?? '' });
      await expect(nav.locator('[aria-current="page"]')).toHaveAttribute('lang', from);
      await nav.locator(`a[lang="${to}"]`).click();
      await expect(page).toHaveURL(`${baseURL}${to}/`);
      await expect(page.locator('html')).toHaveAttribute('lang', to);
    }
  }
});

for (const locale of codes) {
  test(`footer shows the medical disclaimer (${locale})`, async ({ page }) => {
    const t = messages(locale);
    await page.goto(`${locale}/`);
    const footer = page.getByRole('contentinfo');
    await expect(footer.locator('.disclaimer')).toHaveText(t['footer.disclaimer'] ?? '');
    await expect(
      footer.getByRole('link', { name: t['footer.disclaimerLink'] ?? '', exact: true }),
    ).toBeVisible();
  });

  test(`skip link moves focus to the content (${locale})`, async ({ page }) => {
    await page.goto(`${locale}/`);
    await page.keyboard.press('Tab');
    const skip = page.locator('.skip-link');
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(page.locator('main#content')).toBeFocused();
  });
}

test.describe('test locales', () => {
  test.skip(withTestLocales, 'production build only');

  test('are not in the production build', async ({ request }) => {
    for (const code of testCodes) {
      const response = await request.get(`${code}/`);
      expect(response.status()).toBe(404);
    }
  });
});

test.describe('right-to-left test locale', () => {
  test.skip(!withTestLocales, 'needs a build with HA_TEST_LOCALES=1');

  for (const code of testCodes) {
    test(`renders right to left (${code})`, async ({ page }) => {
      await page.goto(`${code}/`);
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      await expect(page.locator('html')).toHaveAttribute('lang', code);
      const header = await page.locator('header').boundingBox();
      const name = await page.locator('.site-name').boundingBox();
      expect(header).not.toBeNull();
      expect(name).not.toBeNull();
      if (header && name) {
        // In right-to-left layout the site name sits at the inline start, on the right.
        expect(name.x + name.width).toBeGreaterThan(header.x + header.width / 2);
      }
      const results = await axe(page).analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
