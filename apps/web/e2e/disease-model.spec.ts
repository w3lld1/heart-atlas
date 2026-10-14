import { expect, test, type Page } from '@playwright/test';
import en from '../src/i18n/messages/en.json' with { type: 'json' };
import ru from '../src/i18n/messages/ru.json' with { type: 'json' };
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
  // Real disease articles; the HA_TEST_CONTENT build has fixture articles instead. The heart clock
  // page test below runs in both builds.
  const articles = process.env['HA_TEST_CONTENT'] === '1';
  test('a disease article without a preset shows the model and its caption', async ({ page }) => {
    test.skip(articles, 'needs the production content build');
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
    expect((await axe(page).analyze()).violations).toEqual([]);
  });

  test('loads three.js and the model only after the button', async ({ page }) => {
    test.skip(articles, 'needs the production content build');
    const requested: string[] = [];
    page.on('request', (r) => requested.push(r.url()));
    await page.goto('ru/disease/hypertrophic-cardiomyopathy/');
    const load = page.getByRole('button', { name: ru['viewer.load'] });
    await load.scrollIntoViewIfNeeded();
    await expect(page.locator('astro-island', { has: load })).not.toHaveAttribute('ssr');
    await page.waitForLoadState('networkidle');
    expect(requested.filter((url) => url.includes('/Scene.') || url.endsWith('.glb'))).toEqual([]);
  });

  test('a sign from the clock preset shows only while the clock runs it', async ({ page }) => {
    test.skip(articles, 'needs the production content build');
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
    // A click event without scrolling the page up to the clock and back.
    await page
      .getByRole('region', { name: en['heartClock.inModel'] })
      .getByRole('radio', { name: en['heartClock.preset.normal'] })
      .dispatchEvent('click');
    await expect(caption).toHaveCount(0, LOAD);
  });

  test('a septal defect gets a marker on the model', async ({ page }) => {
    test.skip(articles, 'needs the production content build');
    await page.goto('en/disease/atrial-septal-defect/');
    await loadModel(page);
    await expect(
      page.getByText(en['viewer.disease.marker.atrial-septal-defect'], { exact: true }),
    ).toBeVisible();
  });

  test('the anatomy page picks a disease and keeps it in the address', async ({ page }) => {
    test.skip(articles, 'needs the production content build');
    await page.goto('en/anatomy/');
    const picker = page.getByLabel(en['viewer.disease.pick']);
    await expect(page.locator('astro-island', { has: picker })).not.toHaveAttribute('ssr');
    const caption = page.getByText(en['viewer.disease.dilated-cardiomyopathy'], { exact: true });
    await expect(caption).toHaveCount(0);
    // Heart failure shows through a clock preset, which this page has not got.
    await expect(picker.locator('option[value="heart-failure"]')).toHaveCount(0);
    await picker.selectOption('dilated-cardiomyopathy');
    await expect(caption).toBeVisible();
    await expect(page).toHaveURL(/\?disease=dilated-cardiomyopathy$/);
    await expect(page.getByRole('link', { name: /^Article: / })).toHaveAttribute(
      'href',
      /\/en\/disease\/dilated-cardiomyopathy\/$/,
    );
    expect((await axe(page).analyze()).violations).toEqual([]);
    await picker.selectOption('');
    await expect(caption).toHaveCount(0);
    await expect(page).toHaveURL(/\/anatomy\/$/);
  });

  test('a shared link opens the model with its disease', async ({ page }) => {
    test.skip(articles, 'needs the production content build');
    await page.goto('ru/anatomy/?disease=hypertension');
    await expect(page.getByLabel(ru['viewer.disease.pick'])).toHaveValue('hypertension');
    await expect(page.getByText(ru['viewer.disease.hypertension'], { exact: true })).toBeVisible();
  });

  test('an article without a clock switches the model to normal', async ({ page }) => {
    test.skip(articles, 'needs the production content build');
    await page.goto('en/disease/hypertrophic-cardiomyopathy/');
    const caption = page.getByText(en['viewer.disease.hypertrophic-cardiomyopathy']);
    const view = page.getByRole('group', { name: en['viewer.disease.view'] });
    const normal = view.getByRole('radio', { name: en['viewer.disease.view.normal'] });
    await normal.scrollIntoViewIfNeeded();
    await expect(page.locator('astro-island', { has: normal })).not.toHaveAttribute('ssr');
    await expect(caption).toBeVisible();
    await normal.check();
    await expect(caption).toHaveCount(0);
    await view.getByRole('radio', { name: en['viewer.disease.view.disease'] }).check();
    await expect(caption).toBeVisible();
  });

  test('an article with a clock shows the normal model with its normal preset', async ({
    page,
  }) => {
    test.skip(articles, 'needs the production content build');
    test.slow();
    await page.goto('en/disease/hypertension/');
    const strip = page.locator('canvas[role="img"]').first();
    await strip.scrollIntoViewIfNeeded();
    await expect(page.locator('astro-island', { has: strip })).not.toHaveAttribute('ssr');
    const region = page.getByRole('region', { name: en['heartClock.inModel'] });
    // One normal / disease choice: the clock's.
    await expect(region.getByRole('group', { name: en['viewer.disease.view'] })).toHaveCount(0);
    const caption = page.getByText(en['viewer.disease.hypertension'], { exact: true });
    await loadModel(page);
    await expect(caption).toBeVisible(LOAD);
    await region
      .getByRole('radio', { name: en['heartClock.preset.normal'] })
      .dispatchEvent('click');
    await expect(caption).toHaveCount(0, LOAD);
  });

  test('the heart clock page model follows the chosen preset', async ({ page }) => {
    test.slow();
    await page.goto('en/heart-clock/');
    // The clock island must have hydrated, or React never sees the choice.
    await expect(page.getByRole('button', { name: en['heartClock.pause'] })).toBeVisible();
    await page.getByRole('radio', { name: en['heartClock.preset.stemi'] }).check();
    const caption = page.getByText(en['viewer.disease.coronary-heart-disease'], { exact: true });
    await expect(caption).toHaveCount(0);
    await loadModel(page);
    await expect(caption).toBeVisible(LOAD);
    // A click event without scrolling the page up to the clock and back.
    await page.getByRole('radio', { name: en['heartClock.preset.normal'] }).dispatchEvent('click');
    await expect(caption).toHaveCount(0, LOAD);
  });
});
