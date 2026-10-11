import { expect, test } from '@playwright/test';
import { productionLocales } from '../src/i18n/locales.ts';
import en from '../src/i18n/messages/en.json' with { type: 'json' };
import ru from '../src/i18n/messages/ru.json' with { type: 'json' };
import { axe } from './axe.ts';

// Real anatomy and diagnostic articles; the fixture build has none of them.
test.skip(process.env['HA_TEST_CONTENT'] === '1', 'needs the production content build');

const messages: Partial<Record<string, typeof en>> = { en, ru };

for (const locale of Object.keys(productionLocales)) {
  const t = messages[locale] ?? en;

  test.describe(`anatomy and diagnostic articles (${locale})`, () => {
    test('the anatomy page lists the anatomy articles', async ({ page }) => {
      await page.goto(`${locale}/anatomy/`);
      const list = page.getByRole('region', { name: t['anatomy.articles'] });
      await expect(list.getByRole('link')).not.toHaveCount(0);
      await list.locator('a[href$="/anatomy/heart-chambers/"]').click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/anatomy/heart-chambers/$`));
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });

    test('a diagram switches between diastole and systole', async ({ page }) => {
      await page.goto(`${locale}/anatomy/heart-chambers/`);
      const diagram = page.locator('figure.diagram');
      const diastole = diagram.locator('.diagram-caption[data-only="diastole"]');
      const systole = diagram.locator('.diagram-caption[data-only="systole"]');
      await expect(diagram.getByRole('radio', { name: t['diagram.state.diastole'] })).toBeChecked();
      await expect(diastole).toBeVisible();
      await expect(systole).toBeHidden();
      await diagram.getByText(t['diagram.state.systole'], { exact: true }).click();
      await expect(systole).toBeVisible();
      await expect(diastole).toBeHidden();
      const results = await axe(page).analyze();
      expect(results.violations).toEqual([]);
    });

    test('the ECG article embeds the heart clock monitor', async ({ page }) => {
      await page.goto(`${locale}/diagnostic/ecg/`);
      const monitor = page.locator('figure.ecg-monitor');
      await expect(monitor.getByRole('img').first()).toBeVisible();
      await expect(page.locator('.review-notice')).toBeVisible();
      const results = await axe(page).analyze();
      expect(results.violations).toEqual([]);
    });

    test('the embed builder offers anatomy and diagnostic articles', async ({ page }) => {
      await page.goto(`${locale}/embed/`);
      for (const type of ['anatomy', 'diagnostic'] as const) {
        const group = page.locator(
          `select[name="module"] optgroup[label="${t[`articles.type.${type}`]}"]`,
        );
        await expect(group.locator(`option[value*="/embed/${type}/"]`)).not.toHaveCount(0);
      }
      await page.goto(`${locale}/embed/diagnostic/holter-monitoring/`);
      await expect(page.locator('header')).toHaveCount(0);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        new RegExp(`/${locale}/diagnostic/holter-monitoring/$`),
      );
      await expect(page.locator('figure.diagram')).toBeVisible();
      const results = await axe(page).analyze();
      expect(results.violations).toEqual([]);
    });
  });
}
