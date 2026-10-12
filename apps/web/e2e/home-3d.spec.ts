import { expect, test, type Page } from '@playwright/test';
import { MOTION_STORAGE_KEY } from '../src/lib/motion.ts';
import en from '../src/i18n/messages/en.json' with { type: 'json' };
import { axe } from './axe.ts';
import { changedShare, MOVING } from './pixels.ts';

// Headless Chromium has WebGL only through SwiftShader, which recent versions enable on request.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
test.use({
  viewport: { width: 1440, height: 1000 },
  launchOptions: {
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    ...(executablePath ? { executablePath } : {}),
  },
});

// Building the scene under SwiftShader on a CI runner can take longer than the default 5 s.
const LOAD = { timeout: 20_000 };

/** Opens the English home page with the reader's motion choice and records 3D requests. */
async function open(page: Page, motion: 'full' | 'calm' | 'off' | 'reduced') {
  if (motion === 'reduced') await page.emulateMedia({ reducedMotion: 'reduce' });
  else {
    await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [
      MOTION_STORAGE_KEY,
      motion,
    ] as const);
  }
  const requested: string[] = [];
  page.on('request', (r) => requested.push(r.url()));
  await page.goto('en/');
  const threeD = () =>
    requested.filter(
      (url) => /\/(hero|HeroScene|Scene)\.[\w-]+\.js$/.test(url) || url.endsWith('.glb'),
    );
  return { threeD };
}

const heart = (page: Page) => page.getByRole('img', { name: en['home.heart3d'] });

/** End of a card's line on the page, in CSS pixels. */
const lineEnd = (page: Page, card: string) =>
  page
    .locator(`.link[data-card="${card}"] line`)
    .evaluate((el) => [Number(el.getAttribute('x2')), Number(el.getAttribute('y2'))]);

test.describe('live heart on the home page', () => {
  // Loading and drawing under SwiftShader on a CI runner is slow; the canvas keeps it busy too.
  test.describe.configure({ timeout: 90_000 });

  test('loads by itself at full motion, beats and hides the poster', async ({ page }) => {
    await open(page, 'full');
    await expect(heart(page)).toBeVisible(LOAD);
    await expect(page.locator('[data-heart]')).toHaveClass(/live/, LOAD);
    await expect(page.locator('[data-poster]')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('[data-load3d]')).toBeHidden();
    await expect
      .poll(() => changedShare(page.locator('[data-hero-mount]')), { timeout: 30_000 })
      .toBeGreaterThan(MOVING);
    // Still for axe: a beating, turning heart keeps a software GPU and axe's page script slow.
    await page.locator('[data-set-motion="off"]').click();
    const results = await axe(page).analyze();
    expect(results.violations).toEqual([]);
  });

  test('turns with the arrow keys, and the lines follow', async ({ page }) => {
    await open(page, 'full');
    await expect(page.locator('[data-heart]')).toHaveClass(/live/, LOAD);
    await heart(page).focus();
    // The first key press stops the slow turn; the second turns it by a known step.
    await page.keyboard.press('ArrowRight');
    const before = await lineEnd(page, 'flow');
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => lineEnd(page, 'flow')).not.toEqual(before);
  });

  test('waits for the button in calm motion', async ({ page }) => {
    const { threeD } = await open(page, 'calm');
    const button = page.getByRole('button', { name: en['motion.load3d'] });
    await expect(button).toBeVisible();
    await page.waitForTimeout(1500);
    expect(threeD()).toEqual([]);
    await button.click();
    await expect(heart(page)).toBeVisible(LOAD);
    await expect(button).toBeHidden();
    // Calm: the loaded heart stands still.
    await expect(page.locator('[data-heart]')).toHaveClass(/live/, LOAD);
    await page.waitForTimeout(500);
    expect(await changedShare(page.locator('[data-hero-mount]'), 400)).toBeLessThan(MOVING);
  });

  test('moves keyboard focus from the button to the heart', async ({ page }) => {
    await open(page, 'calm');
    const button = page.getByRole('button', { name: en['motion.load3d'] });
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(heart(page)).toBeFocused(LOAD);
  });

  test('loads nothing under reduced motion until asked', async ({ page }) => {
    const { threeD } = await open(page, 'reduced');
    await expect(page.getByRole('button', { name: en['motion.load3d'] })).toBeVisible();
    await page.waitForTimeout(1500);
    expect(threeD()).toEqual([]);
  });

  test('keeps the poster when the model fails to load', async ({ page }) => {
    await page.route('**/*.glb', (route) => route.fulfill({ status: 404 }));
    await open(page, 'calm');
    await page.getByRole('button', { name: en['motion.load3d'] }).click();
    await expect(page.locator('[data-load3d]')).toBeHidden(LOAD);
    await expect(page.locator('[data-heart]')).not.toHaveClass(/live/);
    await expect(page.getByRole('img', { name: en['home.posterAlt'] })).toBeVisible();
  });

  test('loads when the reader switches to full motion', async ({ page }) => {
    const { threeD } = await open(page, 'off');
    await page.waitForTimeout(1000);
    expect(threeD()).toEqual([]);
    await page.locator('[data-set-motion="full"]').click();
    await expect(heart(page)).toBeVisible(LOAD);
  });

  test('keeps the poster without WebGL and never loads 3D code', async ({ page }) => {
    await page.addInitScript(() => {
      HTMLCanvasElement.prototype.getContext = () => null;
    });
    const { threeD } = await open(page, 'full');
    await page.waitForTimeout(2000);
    await expect(page.locator('[data-poster]')).toBeVisible();
    await expect(page.locator('[data-load3d]')).toBeHidden();
    expect(threeD()).toEqual([]);
  });
});
