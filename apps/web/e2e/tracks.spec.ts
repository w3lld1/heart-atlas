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
    await expect(steps.nth(1).locator('div').first()).toHaveAttribute('lang', 'en');
    await expect(steps.nth(1).getByRole('link')).toHaveAttribute(
      'href',
      /\/ru\/disease\/another-condition\/\?track=test-track$/,
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

test.describe('track progress', () => {
  test('marks steps read, shows a passed quiz and where to continue', async ({ page }) => {
    await page.goto('ru/tracks/test-track/');
    const next = page.locator('.track-continue');
    await expect(next).toHaveText('Начать: Тестовое состояние');
    await expect(next.getByRole('link')).toHaveAttribute(
      'href',
      /\/ru\/disease\/test-condition\/\?track=test-track$/,
    );
    const boxes = page.getByRole('checkbox', { name: new RegExp(`^${ru['tracks.read']} `) });
    await expect(boxes).toHaveCount(2);
    // Each box is named after its step.
    await expect(boxes.first()).toHaveAccessibleName(`${ru['tracks.read']} Тестовое состояние`);
    await expect(page.locator('.track-quiz:visible')).toHaveCount(0);

    await boxes.first().check();
    await expect(next).toHaveText('Продолжить: Another test condition');
    await expect(next.locator('a > span')).toHaveAttribute('lang', 'en');

    // A saved quiz result shows up on the track after a reload; the read mark stays.
    await page.evaluate(() =>
      localStorage.setItem(
        'ha:quiz:ru/disease/test-condition',
        JSON.stringify({ patient: { correct: 1, total: 2, date: '2026-10-12' } }),
      ),
    );
    await page.reload();
    await expect(boxes.first()).toBeChecked();
    await expect(
      page.locator('.track-step').first().getByText(ru['tracks.quizDone']),
    ).toBeVisible();

    await boxes.nth(1).check();
    await expect(next).toHaveText(ru['tracks.finished']);
    // The English fallback step is stored under the article the reader actually read.
    expect(
      await page.evaluate(() => localStorage.getItem('ha:read:en/disease/another-condition')),
    ).not.toBeNull();
    const results = await axe(page).analyze();
    expect(results.violations).toEqual([]);
  });

  test('an article opened from a track shows the step and the next one', async ({ page }) => {
    await page.goto('ru/disease/test-condition/?track=test-track');
    const block = page.getByRole('complementary', { name: ru['tracks.stepLabel'] });
    await expect(block).toBeVisible();
    await expect(block.locator('.track-step-title')).toHaveText('Трек «Тестовый трек»: шаг 1 из 2');
    await expect(block.locator('.track-step-previous')).toBeHidden();
    const next = block.getByRole('link', { name: 'Дальше: Another test condition' });
    await expect(next).toHaveAttribute(
      'href',
      /\/ru\/disease\/another-condition\/\?track=test-track$/,
    );
    await block.getByRole('checkbox', { name: ru['tracks.read'] }).check();
    let results = await axe(page).analyze();
    expect(results.violations).toEqual([]);

    await next.click();
    await expect(block.locator('.track-step-title')).toHaveText('Трек «Тестовый трек»: шаг 2 из 2');
    await expect(block.getByRole('link', { name: 'Назад: Тестовое состояние' })).toBeVisible();
    await expect(block.locator('.track-step-next')).toBeHidden();
    results = await axe(page).analyze();
    expect(results.violations).toEqual([]);

    // The mark made under the article shows on the track page.
    await block.getByRole('link', { name: 'Тестовый трек' }).click();
    await expect(page.locator('.track-read input').first()).toBeChecked();
  });

  test('without the parameter the article loads neither the block nor its data', async ({
    page,
  }) => {
    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));
    await page.goto('ru/disease/test-condition/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-track-step]')).toBeHidden();
    expect(requests.filter((url) => /steps\.json|track-step/.test(url))).toEqual([]);
  });

  test('an unknown track leaves the article as it is', async ({ page }) => {
    await page.goto('ru/disease/test-condition/?track=no-such-track');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-track-step]')).toBeHidden();
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
