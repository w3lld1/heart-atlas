import { expect, test } from '@playwright/test';
import { productionLocales } from '../src/i18n/locales.ts';
import { axe } from './axe.ts';

const locale = Object.keys(productionLocales)[0] ?? 'en';
const html = (page: import('@playwright/test').Page) => page.locator('html');

test.describe('motion setting', () => {
  test('starts in auto and follows the device', async ({ page }) => {
    // Pin the device signals so the automatic level is known.
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
      Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
    });
    await page.goto(`${locale}/`);
    await expect(html(page)).toHaveAttribute('data-motion-choice', 'auto');
    await expect(html(page)).toHaveAttribute('data-motion', 'full');
    await expect(page.locator('[data-set-motion="auto"]')).toHaveAttribute('aria-pressed', 'true');
    // The level Auto picked is outlined and named for screen readers.
    const full = page.locator('[data-set-motion="full"]');
    await expect(full).toHaveClass(/effective/);
    await expect(page.locator('[data-motion-effective]')).toHaveText(
      (await full.textContent())?.trim() ?? '',
    );
  });

  test('calms down on a weak device in auto', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 2 });
    });
    await page.goto(`${locale}/`);
    await expect(html(page)).toHaveAttribute('data-motion', 'calm');
    await expect(page.locator('[data-set-motion="calm"]')).toHaveClass(/effective/);
  });

  test('keeps the reader’s choice across pages and returns to auto', async ({ page }) => {
    await page.goto(`${locale}/`);
    await page.locator('[data-set-motion="off"]').click();
    await expect(html(page)).toHaveAttribute('data-motion', 'off');
    await expect(page.locator('[data-set-motion="off"]')).toHaveAttribute('aria-pressed', 'true');

    await page.goto(`${locale}/heart-clock/`);
    await expect(html(page)).toHaveAttribute('data-motion', 'off');
    await expect(html(page)).toHaveAttribute('data-motion-choice', 'off');

    await page.locator('[data-set-motion="auto"]').click();
    await expect(html(page)).toHaveAttribute('data-motion-choice', 'auto');
    await page.reload();
    await expect(html(page)).toHaveAttribute('data-motion-choice', 'auto');
    await expect(page.locator('[data-set-motion="auto"]')).toHaveAttribute('aria-pressed', 'true');
  });

  test('turns animation off under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`${locale}/`);
    await expect(html(page)).toHaveAttribute('data-motion', 'off');
    // A manual "full" is softened to "calm", never full strength.
    await page.locator('[data-set-motion="full"]').click();
    await expect(html(page)).toHaveAttribute('data-motion', 'calm');
  });

  test('switch has no axe violations', async ({ page }) => {
    await page.goto(`${locale}/`);
    const results = await axe(page).include('.motion-switch').analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe('motion setting without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('hides the switch', async ({ page }) => {
    await page.goto(`${locale}/`);
    await expect(page.locator('.motion-switch')).toBeHidden();
  });
});
