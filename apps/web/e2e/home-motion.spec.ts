import { expect, test, type Page } from '@playwright/test';
import { MOTION_STORAGE_KEY } from '../src/lib/motion.ts';
import { changedShare } from './pixels.ts';

// Wide enough for the cards to sit around the heart with their lines.
test.use({ viewport: { width: 1440, height: 1000 } });

async function open(page: Page, motion: 'full' | 'calm' | 'off') {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [
    MOTION_STORAGE_KEY,
    motion,
  ] as const);
  await page.goto('en/');
}

const strip = (page: Page) => page.locator('[data-ecg-strip]');
/** The trace is a thin line on an empty strip: a moving one changes a few tenths of a percent. */
const TRACE_MOVING = 0.002;
const slot = (page: Page) => page.locator('.node-slot').first();
const translate = (page: Page) => slot(page).evaluate((el) => getComputedStyle(el).translate);

test.describe('home page motion', () => {
  for (const motion of ['full', 'calm'] as const) {
    test(`runs the ECG in ${motion} motion`, async ({ page }) => {
      await open(page, motion);
      await expect(strip(page)).toHaveClass(/running/);
      await expect
        .poll(() => changedShare(strip(page), 300), { timeout: 15_000 })
        .toBeGreaterThan(TRACE_MOVING);
    });
  }

  test('floats the cards in full motion, and their lines follow', async ({ page }) => {
    await open(page, 'full');
    await expect.poll(() => translate(page)).not.toBe('none');
    const first = await translate(page);
    await expect.poll(() => translate(page)).not.toBe(first);
    // The line still starts at the middle of the card's side.
    const node = page.locator('.node').first();
    const card = await node.boundingBox();
    const stage = await page.locator('[data-stage]').boundingBox();
    const y1 = await page
      .locator(`.link[data-card="${await node.getAttribute('data-card')}"] line`)
      .getAttribute('y1');
    expect(card && stage).toBeTruthy();
    if (!card || !stage) return;
    // One frame of drift between the two reads at most.
    expect(Math.abs(Number(y1) - (card.y + card.height / 2 - stage.y))).toBeLessThan(1.5);
    await expect(page.locator('.body-backdrop .flow')).toBeVisible();
    // Venous blood runs back to the heart.
    await expect(page.locator('.body-backdrop .flow .vein').first()).toHaveCSS(
      'animation-direction',
      'reverse',
    );
  });

  test('keeps the cards, the vessels and the ECG still in calm motion', async ({ page }) => {
    await open(page, 'calm');
    await expect(strip(page)).toHaveClass(/running/);
    await expect(page.locator('[data-links]')).toHaveClass(/drawn/);
    // The cards would have started floating by now.
    for (let i = 0; i < 3; i++) {
      await page.waitForTimeout(200);
      expect(await translate(page)).toBe('none');
    }
    await expect(page.locator('.body-backdrop .flow')).toBeHidden();
    await expect(page.locator('.link .ring').first()).toHaveCSS('animation-name', 'none');
    await expect(page.locator('[data-poster]')).toHaveCSS('animation-name', 'pulse');
  });

  test('shows the still ECG and nothing moving in off', async ({ page }) => {
    await open(page, 'off');
    await expect(page.locator('[data-links]')).toHaveClass(/drawn/);
    await page.waitForTimeout(500);
    await expect(strip(page)).not.toHaveClass(/running/);
    await expect(strip(page).locator('svg')).toBeVisible();
    expect(await changedShare(strip(page), 300)).toBeLessThan(TRACE_MOVING);
    expect(await translate(page)).toBe('none');
    await expect(page.locator('[data-poster]')).toHaveCSS('animation-name', 'none');
  });

  test('stops when the reader turns motion off', async ({ page }) => {
    await open(page, 'full');
    await expect(strip(page)).toHaveClass(/running/);
    await expect.poll(() => translate(page)).not.toBe('none');
    await page.locator('[data-set-motion="off"]').click();
    await expect(strip(page)).not.toHaveClass(/running/);
    expect(await translate(page)).toBe('none');
    await expect(page.locator('.body-backdrop .flow')).toBeHidden();
  });
});
