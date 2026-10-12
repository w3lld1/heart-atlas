import { expect, test } from '@playwright/test';
import ru from '../src/i18n/messages/ru.json' with { type: 'json' };
import { axe } from './axe.ts';

// Runs against the fixture build: `pnpm build:test-content`, then `HA_TEST_CONTENT=1 pnpm e2e`.
// Tracks: test/fixtures/site-content/tracks/.
test.skip(process.env['HA_TEST_CONTENT'] !== '1', 'needs the HA_TEST_CONTENT=1 build');

test.describe('learning tracks', () => {
  test('the menu and the list lead to a track with its steps in order', async ({ page }) => {
    await page.goto('ru/');
    await page.getByRole('navigation').getByRole('link', { name: ru['nav.tracks'] }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(ru['tracks.title']);
    await expect(page.getByText('Для всех · 2 статьи')).toBeVisible();
    let results = await axe(page).analyze();
    expect(results.violations).toEqual([]);

    await page.getByRole('link', { name: 'Тестовый трек' }).click();
    await expect(page).toHaveURL(/\/ru\/tracks\/test-track\/$/);
    const steps = page.locator('.track-steps > li');
    await expect(steps).toHaveCount(2);
    await expect(steps.nth(0).getByRole('link')).toHaveText('Тестовое состояние');
    // The second article is shown from its English original, and marked so.
    await expect(steps.nth(1)).toHaveAttribute('lang', 'en');
    await expect(steps.nth(1).getByRole('link')).toHaveAttribute(
      'href',
      /\/ru\/disease\/another-condition\/$/,
    );
    results = await axe(page).analyze();
    expect(results.violations).toEqual([]);
  });

  test('a track without a translation is shown from its original and marked', async ({ page }) => {
    await page.goto('ru/tracks/english-track/');
    await expect(page.getByRole('note')).toHaveText(ru['tracks.translationMissing']);
    await expect(page.getByRole('heading', { level: 1 })).toHaveAttribute('lang', 'en');
    // Search engines get the original, not a second copy.
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      /\/en\/tracks\/english-track\/$/,
    );
    await expect(page.locator('link[rel="alternate"][hreflang="ru"]')).toHaveCount(0);
  });

  test('a language lists only the tracks it can show', async ({ page }) => {
    await page.goto('en/tracks/');
    await expect(page.getByRole('link', { name: 'English track' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Тестовый трек' })).toHaveCount(0);
  });
});

test.describe('learning tracks right to left', () => {
  test.skip(process.env['HA_TEST_LOCALES'] !== '1', 'needs the HA_TEST_LOCALES=1 build');

  test('marks a fallback track left to right on a right-to-left page', async ({ page }) => {
    await page.goto('qps-plocm/tracks/english-track/');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toHaveAttribute('lang', 'en');
    await expect(heading).toHaveAttribute('dir', 'ltr');
    const results = await axe(page).analyze();
    expect(results.violations).toEqual([]);
  });
});
