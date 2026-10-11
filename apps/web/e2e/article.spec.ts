import { expect, test } from '@playwright/test';
import { axe } from './axe.ts';

// Runs against the fixture build: `pnpm build:test-content`, then `HA_TEST_CONTENT=1 pnpm e2e`.
test.skip(process.env['HA_TEST_CONTENT'] !== '1', 'needs the HA_TEST_CONTENT=1 build');

const article = 'ru/disease/test-condition/';
const patient = '.level[data-level="patient"]';
const student = '.level[data-level="student"]';

test.describe('article page', () => {
  test('shows the patient level first and remembers the student level', async ({ page }) => {
    await page.goto(article);
    await expect(page.locator(patient)).toBeVisible();
    await expect(page.locator(student)).toBeHidden();

    const studentButton = page.getByRole('button', { name: 'Для студентов' });
    await studentButton.focus();
    await page.keyboard.press('Enter');
    await expect(studentButton).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator(student)).toBeVisible();

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-level', 'student');
    await expect(page.locator(patient)).toBeHidden();
  });

  test('links citations to the sources list', async ({ page }) => {
    await page.goto(article);
    await page.getByRole('link', { name: 'Источник 1' }).first().click();
    await expect(page).toHaveURL(/#source-1$/);
    await expect(page.locator('#source-1')).toBeInViewport();
  });

  test('shows the not-reviewed notice with a report link', async ({ page }) => {
    await page.goto(article);
    const report = page.getByRole('link', { name: 'Сообщить об ошибке' });
    await expect(report).toHaveAttribute('href', /template=content-error\.yml/);
  });

  test('marks a fallback translation and points the canonical to the original', async ({
    page,
  }) => {
    await page.goto('ru/disease/another-condition/');
    await expect(page.getByRole('note').filter({ hasText: 'ещё не переведена' })).toBeVisible();
    await expect(page.locator('article')).toHaveAttribute('lang', 'en');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      /\/en\/disease\/another-condition\/$/,
    );
  });

  test('lists articles of a type', async ({ page }) => {
    await page.goto('ru/disease/');
    await expect(page.getByRole('link', { name: 'Тестовое состояние' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Another test condition' })).toBeVisible();
  });

  test('switches the diagram between normal and disease and pauses it', async ({ page }) => {
    await page.goto(article);
    const diagram = page.locator('figure.diagram');
    await expect(diagram.getByRole('img')).toHaveAccessibleName(/дефекте межпредсердной/);
    await expect(diagram.getByText('Подпись болезни.')).toBeVisible();
    await expect(diagram.getByText('Подпись нормы.')).toBeHidden();

    // Radio buttons: arrow keys move the choice.
    await diagram.getByRole('radio', { name: 'Болезнь' }).focus();
    await page.keyboard.press('ArrowLeft');
    await expect(diagram.getByRole('radio', { name: 'Норма' })).toBeChecked();
    await expect(diagram.getByText('Подпись нормы.')).toBeVisible();
    await expect(diagram.getByText('Подпись болезни.')).toBeHidden();

    const particle = diagram.locator('.flow circle').first();
    await diagram.getByRole('checkbox', { name: 'Пауза' }).check();
    await expect(particle).toHaveCSS('animation-play-state', 'paused');
  });

  test('shows a visible focus ring on the diagram toggle', async ({ page }) => {
    await page.goto(article);
    const diagram = page.locator('figure.diagram');
    await diagram.getByRole('radio', { name: 'Болезнь' }).focus();
    await page.keyboard.press('ArrowLeft');
    const label = diagram.locator('fieldset label', { hasText: 'Норма' });
    await expect(label).toHaveCSS('outline-style', 'solid');
  });

  test('keeps the diagram meaningful with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(article);
    const diagram = page.locator('figure.diagram');
    await expect(diagram.locator('.flow')).toBeHidden();
    await expect(diagram.getByText('Пауза')).toBeHidden();
    // A straight arrow has a zero-width box, so check that it is rendered rather than "visible".
    await expect(diagram.getByRole('img')).toBeVisible();
    await expect(diagram.locator('path[marker-end]').first()).not.toHaveCSS('display', 'none');
  });

  test('has no axe violations in the dark theme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto(article);
    const results = await axe(page).analyze();
    expect(results.violations).toEqual([]);
  });

  for (const path of [article, 'ru/disease/another-condition/', 'ru/disease/']) {
    test(`has no axe violations: ${path}`, async ({ page }) => {
      await page.goto(path);
      const results = await axe(page).analyze();
      expect(results.violations).toEqual([]);
    });
  }
});

test.describe('article page without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('shows both levels with labels and hides the switch', async ({ page }) => {
    await page.goto(article);
    await expect(page.locator(patient)).toBeVisible();
    await expect(page.locator(student)).toBeVisible();
    await expect(page.locator('.level-label', { hasText: 'Для студентов' })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Уровень объяснения' })).toBeHidden();
  });

  test('switches the diagram with CSS only', async ({ page }) => {
    await page.goto(article);
    const diagram = page.locator('figure.diagram');
    await diagram.getByText('Норма', { exact: true }).click();
    await expect(diagram.getByText('Подпись нормы.')).toBeVisible();
    await expect(diagram.getByText('Подпись болезни.')).toBeHidden();
  });
});
