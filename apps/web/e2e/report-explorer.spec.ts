import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { productionLocales } from '../src/i18n/locales.ts';
import { axe } from './axe.ts';

// The echocardiography report sample: docs/plans/2026-10-14-report-explorer.md.
// Real articles; the HA_TEST_CONTENT build has fixture articles instead.
const fixtures = process.env['HA_TEST_CONTENT'] === '1';

// messages.ts relies on Vite's import.meta.glob, so tests read the strings files directly.
const text = (locale: string, key: string): string =>
  (
    JSON.parse(
      readFileSync(new URL(`../src/i18n/messages/${locale}.json`, import.meta.url), 'utf8'),
    ) as Record<string, string>
  )[key] ?? key;

const sample = (page: Page, locale: string) =>
  page.getByRole('region', { name: text(locale, 'report.title') });

for (const locale of Object.keys(productionLocales)) {
  const article = `${locale}/diagnostic/echocardiography/`;

  test.describe(`report sample (${locale})`, () => {
    test.skip(fixtures, 'needs the production content build');

    test('is titled, marked as made up and has no form', async ({ page }) => {
      await page.goto(article);
      const report = sample(page, locale);
      await expect(report.getByRole('heading', { level: 3 })).toHaveText(
        text(locale, 'report.title'),
      );
      await expect(report.getByRole('note')).toHaveText(text(locale, 'report.fictional'));
      await expect(report.locator('summary').first()).toContainText(
        text(locale, 'report.placeholder'),
      );
      await expect(report.locator('form, input, textarea, select')).toHaveCount(0);
    });

    test('opens a term from the keyboard and leaves the others closed', async ({
      page,
      request,
      baseURL,
    }) => {
      await page.goto(article);
      const report = sample(page, locale);
      const terms = report.locator('details');
      expect(await terms.count()).toBeGreaterThan(1);
      expect((await axe(page).include('section.report').analyze()).violations).toEqual([]);

      // The first term with a "More" link.
      const term = terms.filter({ has: page.locator('.report-more') }).first();
      await term.locator('summary').focus();
      await page.keyboard.press('Enter');
      await expect(term).toHaveAttribute('open', '');
      await expect(term.locator('.report-explanation')).toBeVisible();
      await expect(term.locator('.report-explanation .cite').first()).toBeVisible();
      await expect(report.locator('details[open]')).toHaveCount(1);

      const href = (await term.locator('.report-more a').getAttribute('href')) ?? '';
      expect(href.startsWith(`${new URL(baseURL ?? '').pathname}${locale}/`), href).toBe(true);
      expect((await request.get(href)).status(), href).toBe(200);

      expect((await axe(page).include('section.report').analyze()).violations).toEqual([]);
    });

    test('does not scroll sideways at 320 px', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 640 });
      await page.goto(article);
      for (const summary of await sample(page, locale).locator('summary').all()) {
        await summary.click();
      }
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });

    test('prints every explanation', async ({ page }) => {
      await page.emulateMedia({ media: 'print' });
      await page.goto(article);
      const report = sample(page, locale);
      await expect(report.locator('details[open]')).toHaveCount(0);
      for (const explanation of await report.locator('.report-explanation').all()) {
        await expect(explanation).toBeVisible();
      }
    });
  });

  test.describe(`report sample without JavaScript (${locale})`, () => {
    test.skip(fixtures, 'needs the production content build');
    test.use({ javaScriptEnabled: false });

    test('opens a term on click', async ({ page }) => {
      await page.goto(article);
      const term = sample(page, locale).locator('details').first();
      await expect(term.locator('.report-explanation')).toBeHidden();
      await term.locator('summary').click();
      await expect(term.locator('.report-explanation')).toBeVisible();
    });
  });
}
