import { expect, test } from '@playwright/test';
import { productionLocales } from '../src/i18n/locales.ts';
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

for (const locale of Object.keys(productionLocales)) {
  test.describe(`anatomy page (${locale})`, () => {
    test('is linked from the home page', async ({ page }) => {
      await page.goto(`${locale}/`);
      await page.locator('main a[href$="/anatomy/"]').click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/anatomy/$`));
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });

    test('shows the 3D model and has no axe violations', async ({ page }) => {
      await page.goto(`${locale}/anatomy/`);
      await expect(page.locator('canvas')).toBeVisible();
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
    await expect(page.locator('canvas')).toBeVisible();

    const button = page.getByRole('button', { name: en['structure.left-ventricle'], exact: true });
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('p[aria-live]')).toContainText(en['structure.left-ventricle']);

    await page.getByRole('button', { name: en['viewer.clear'] }).click();
    await expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  test('loads the light model on a phone', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    const page = await context.newPage();
    const model = page.waitForResponse((r) => r.url().endsWith('/models/heart-lod1.glb'));
    await page.goto('en/anatomy/');
    expect((await model).ok()).toBe(true);
    await context.close();
  });

  test('highlights structures named by the page through the window event', async ({ page }) => {
    await page.goto('en/anatomy/');
    await expect(page.locator('canvas')).toBeVisible();
    await page.evaluate(() =>
      window.dispatchEvent(
        new CustomEvent('heart-atlas:highlight', { detail: { ids: ['interventricular-septum'] } }),
      ),
    );
    await expect(
      page.getByRole('button', { name: en['structure.interventricular-septum'] }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  test('takes keyboard focus and keeps arrow keys from scrolling the page', async ({ page }) => {
    await page.goto('en/anatomy/');
    const model = page.getByRole('application', { name: en['viewer.canvasLabel'] });
    // Keyboard control starts once the model has loaded.
    await expect(model).toHaveAttribute('aria-busy', 'false');
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
    const scripts: string[] = [];
    page.on('request', (r) => {
      if (r.resourceType() === 'script') scripts.push(r.url());
    });
    await page.goto('en/anatomy/');
    await expect(page.getByRole('status')).toHaveText(en['viewer.unavailable']);
    await expect(page.getByRole('img', { name: en['viewer.posterAlt'] })).toBeVisible();
    const button = page.getByRole('button', { name: en['structure.aorta'] });
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(scripts.filter((url) => url.includes('Scene'))).toEqual([]);
  });
});
