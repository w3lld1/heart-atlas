import { expect, test } from '@playwright/test';
import { productionLocales } from '../src/i18n/locales.ts';
import en from '../src/i18n/messages/en.json' with { type: 'json' };
import { axe } from './axe.ts';
import { changedShare, MOVING } from './pixels.ts';

// Headless Chromium has WebGL only through SwiftShader, which recent versions enable on request.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
test.use({
  launchOptions: {
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    ...(executablePath ? { executablePath } : {}),
  },
});

// Building the scene under SwiftShader on a CI runner can take longer than the default 5 s.
const LOAD = { timeout: 15_000 };

for (const locale of Object.keys(productionLocales)) {
  test.describe(`anatomy page (${locale})`, () => {
    test('is linked from the home page', async ({ page }) => {
      await page.goto(`${locale}/`);
      // The first link is the main button of the hero.
      await page.locator('main a[href$="/anatomy/"]').first().click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/anatomy/$`));
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });

    test('shows the 3D model and has no axe violations', async ({ page }) => {
      await page.goto(`${locale}/anatomy/`);
      await expect(page.locator('canvas')).toBeVisible(LOAD);
      const results = await axe(page).analyze();
      expect(results.violations).toEqual([]);
    });
  });
}

test.describe('heart viewer', () => {
  test('loads the detailed model on a desktop and highlights a picked structure', async ({
    page,
  }) => {
    const model = page.waitForResponse((r) => r.url().endsWith('/models/heart-lod0.glb'));
    await page.goto('en/anatomy/');
    expect((await model).ok()).toBe(true);
    await expect(page.locator('canvas')).toBeVisible(LOAD);

    const button = page.getByRole('button', { name: en['structure.left-ventricle'], exact: true });
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('p[aria-live]')).toContainText(en['structure.left-ventricle']);

    await page.getByRole('button', { name: en['viewer.clear'] }).click();
    await expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  test('waits for a tap on a phone, then loads the light model', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    const page = await context.newPage();
    const models: string[] = [];
    page.on('request', (r) => {
      if (r.url().endsWith('.glb')) models.push(r.url());
    });
    await page.goto('en/anatomy/');
    const load = page.getByRole('button', { name: en['viewer.load'] });
    await expect(load).toBeVisible();
    await page.waitForTimeout(500);
    expect(models).toEqual([]);

    const model = page.waitForResponse((r) => r.url().endsWith('/models/heart-lod1.glb'));
    await load.click();
    expect((await model).ok()).toBe(true);
    // Focus stays in the viewer and moves to the model once it has loaded.
    await expect(page.getByRole('application')).toBeFocused(LOAD);
    expect(models.filter((url) => url.endsWith('heart-lod0.glb'))).toEqual([]);
    await context.close();
  });

  test('beats on request and stops again', async ({ page }) => {
    // Under SwiftShader a beating page renders slowly, and a screenshot can take seconds.
    test.slow();
    await page.goto('en/anatomy/');
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible(LOAD);
    const start = page.getByRole('button', { name: en['viewer.heartbeat.start'] });
    await expect(start).toBeVisible(LOAD);
    // Nothing moves until the reader asks.
    expect(await changedShare(canvas, 400)).toBeLessThan(MOVING);

    await page.getByLabel(en['viewer.heartbeat.rate']).fill('120');
    await expect(page.locator('output')).toHaveText(
      en['viewer.heartbeat.rateValue'].replace('{rate}', '120'),
    );
    await start.click();
    const stop = page.getByRole('button', { name: en['viewer.heartbeat.stop'] });
    await expect(stop).toBeVisible();
    await expect(page.getByText(en['viewer.heartbeat.note'])).toBeVisible();
    // At 120 beats per minute frames 150 ms apart show the heart in different phases.
    await expect.poll(() => changedShare(canvas), { timeout: 45_000 }).toBeGreaterThan(MOVING);
    const results = await axe(page).analyze();
    expect(results.violations).toEqual([]);

    await stop.click();
    await expect(start).toBeVisible();
  });

  test('highlights structures named by the page through the window event', async ({ page }) => {
    await page.goto('en/anatomy/');
    await expect(page.locator('canvas')).toBeVisible(LOAD);
    await page.evaluate(() =>
      window.dispatchEvent(
        new CustomEvent('heart-atlas:highlight', {
          detail: { ids: ['left-atrium', 'mitral-valve', 'no-such-structure'] },
        }),
      ),
    );
    for (const key of ['structure.left-atrium', 'structure.mitral-valve'] as const) {
      await expect(page.getByRole('button', { name: en[key], exact: true })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    }
    await expect(page.locator('p[aria-live]')).toHaveText(
      `${en['viewer.selected']}: ${en['structure.left-atrium']}, ${en['structure.mitral-valve']}`,
    );
  });

  test('takes keyboard focus and keeps arrow keys from scrolling the page', async ({ page }) => {
    await page.goto('en/anatomy/');
    const model = page.getByRole('application', { name: en['viewer.canvasLabel'] });
    // Keyboard control starts once the model has loaded.
    await expect(model).toHaveAttribute('aria-busy', 'false', LOAD);
    await model.focus();
    await expect(model).toBeFocused();
    const before = await page.evaluate(() => window.scrollY);
    await page.keyboard.press('ArrowDown');
    expect(await page.evaluate(() => window.scrollY)).toBe(before);
  });

  test('shows the poster and the list without WebGL and never loads three.js', async ({ page }) => {
    await page.addInitScript(() => {
      HTMLCanvasElement.prototype.getContext = () => null;
    });
    const requested: string[] = [];
    page.on('request', (r) => requested.push(r.url()));
    await page.goto('en/anatomy/');
    await expect(page.locator('main').getByRole('status')).toHaveText(en['viewer.unavailable']);
    await expect(page.getByRole('img', { name: en['viewer.posterAlt'] })).toBeVisible();
    const button = page.getByRole('button', { name: en['structure.aorta'] });
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(requested.filter((url) => url.includes('/Scene.') || url.endsWith('.glb'))).toEqual([]);
  });
});
