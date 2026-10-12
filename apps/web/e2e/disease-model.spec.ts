import { expect, test, type Page } from '@playwright/test';
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

async function loadModel(page: Page) {
  const load = page.getByRole('button', { name: en['viewer.load'] });
  await load.scrollIntoViewIfNeeded();
  await expect(page.locator('astro-island', { has: load })).not.toHaveAttribute('ssr');
  await load.click();
  const model = page.getByRole('application', { name: en['viewer.canvasLabel'] });
  await expect(model).toHaveAttribute('aria-busy', 'false', LOAD);
  return model;
}

test.describe('disease signs on the 3D model', () => {
  test('a disease article without a preset shows the model and its caption', async ({ page }) => {
    await page.goto('en/disease/hypertrophic-cardiomyopathy/');
    const section = page.getByRole('region', { name: en['heartClock.inModel'] });
    await expect(section.getByRole('heading', { name: en['heartClock.model3d'] })).toBeVisible();
    // No clock, so the model has no heartbeat; the still signs hold without it.
    await expect(section.locator('canvas[role="img"]')).toHaveCount(0);
    const caption = section.getByText(en['viewer.disease.hypertrophic-cardiomyopathy']);
    await expect(caption).toBeVisible();
    expect((await axe(page).analyze()).violations).toEqual([]);
    const model = await loadModel(page);
    await expect(model).toHaveAccessibleDescription(
      new RegExp(en['viewer.disease.hypertrophic-cardiomyopathy'].slice(0, 40)),
    );
  });

  test('a sign from the clock preset shows only while the clock runs it', async ({ page }) => {
    test.slow();
    await page.goto('en/disease/heart-failure/');
    // The clock island hydrates once seen; the model follows it from then on.
    const strip = page.locator('canvas[role="img"]').first();
    await strip.scrollIntoViewIfNeeded();
    await expect(page.locator('astro-island', { has: strip })).not.toHaveAttribute('ssr');
    const caption = page.getByText(en['viewer.disease.heart-failure.beat']);
    await expect(caption).toHaveCount(0);
    await loadModel(page);
    await expect(caption).toBeVisible(LOAD);
    await page
      .getByRole('region', { name: en['heartClock.inModel'] })
      .getByRole('radio', { name: en['heartClock.preset.normal'] })
      .dispatchEvent('click');
    await expect(caption).toHaveCount(0, LOAD);
  });

  test('a septal defect gets a marker on the model', async ({ page }) => {
    await page.goto('en/disease/atrial-septal-defect/');
    await loadModel(page);
    await expect(
      page.getByText(en['viewer.disease.marker.atrial-septal-defect'], { exact: true }),
    ).toBeVisible();
  });

  test('the heart clock page model follows the chosen preset', async ({ page }) => {
    test.slow();
    await page.goto('en/heart-clock/');
    await page.getByRole('radio', { name: en['heartClock.preset.stemi'] }).check();
    const caption = page.getByText(en['viewer.disease.coronary-heart-disease'], { exact: true });
    await expect(caption).toHaveCount(0);
    await loadModel(page);
    await expect(caption).toBeVisible(LOAD);
    await page.getByRole('radio', { name: en['heartClock.preset.normal'] }).dispatchEvent('click');
    await expect(caption).toHaveCount(0, LOAD);
  });
});
