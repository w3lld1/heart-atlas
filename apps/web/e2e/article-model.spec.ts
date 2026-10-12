import { expect, test } from '@playwright/test';
import en from '../src/i18n/messages/en.json' with { type: 'json' };
import { axe } from './axe.ts';

// Headless Chromium has WebGL only through SwiftShader, which recent versions enable on request.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
test.use({
  launchOptions: {
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    ...(executablePath ? { executablePath } : {}),
  },
});

const LOAD = { timeout: 30_000 };

// docs/plans/2026-10-12-article-interactivity.md: the 3D model with highlights inside articles.
test.describe('3D model in a disease article without signs on the model', () => {
  test.skip(process.env['HA_TEST_CONTENT'] === '1', 'needs the production content build');

  const places: Record<string, string[]> = {
    'ventricular-septal-defect': ['interventricular-septum'],
    'mitral-regurgitation': ['mitral-valve'],
    'pulmonary-embolism': ['pulmonary-trunk', 'right-ventricle'],
    'infective-endocarditis': [
      'mitral-valve',
      'aortic-valve',
      'tricuspid-valve',
      'pulmonary-valve',
    ],
  };
  for (const [slug, ids] of Object.entries(places)) {
    test(`${slug} highlights the place the article names`, async ({ page }) => {
      await page.goto(`en/disease/${slug}/`);
      const load = page.getByRole('button', { name: en['viewer.load'] });
      await load.scrollIntoViewIfNeeded();
      await expect(page.locator('astro-island', { has: load })).not.toHaveAttribute('ssr');
      const selected = page.getByText(`${en['viewer.selected']}:`).locator('..');
      for (const id of ids) {
        await expect(selected).toContainText(en[`structure.${id}` as keyof typeof en]);
      }
      expect((await axe(page).analyze()).violations).toEqual([]);
    });
  }
});

test.describe('3D model in an anatomy article', () => {
  // Real articles; the HA_TEST_CONTENT build has fixture articles instead.
  test.skip(process.env['HA_TEST_CONTENT'] === '1', 'needs the production content build');

  test('highlights the structures of the article and loads on click', async ({ page }) => {
    await page.goto('en/anatomy/heart-valves/');
    const load = page.getByRole('button', { name: en['viewer.load'] });
    await load.scrollIntoViewIfNeeded();
    await expect(page.locator('astro-island', { has: load })).not.toHaveAttribute('ssr');
    const selected = page.getByText(`${en['viewer.selected']}:`).locator('..');
    for (const id of ['tricuspid-valve', 'pulmonary-valve', 'mitral-valve', 'aortic-valve']) {
      await expect(selected).toContainText(en[`structure.${id}` as keyof typeof en]);
    }
    expect((await axe(page).analyze()).violations).toEqual([]);
    await load.click();
    const model = page.getByRole('application', { name: en['viewer.canvasLabel'] });
    await expect(model).toHaveAttribute('aria-busy', 'false', LOAD);
    expect((await axe(page).analyze()).violations).toEqual([]);
  });

  test('beats with the ECG monitor of the cardiac cycle article', async ({ page }) => {
    test.slow();
    await page.goto('en/anatomy/cardiac-cycle/');
    const load = page.getByRole('button', { name: en['viewer.load'] });
    await load.scrollIntoViewIfNeeded();
    await expect(page.locator('astro-island', { has: load })).not.toHaveAttribute('ssr');
    await load.click();
    const model = page.getByRole('application', { name: en['viewer.canvasLabel'] });
    await expect(model).toHaveAttribute('aria-busy', 'false', LOAD);
    expect((await axe(page).analyze()).violations).toEqual([]);
  });
});
