import { expect, test, type Page } from '@playwright/test';
import en from '../src/i18n/messages/en.json' with { type: 'json' };
import ru from '../src/i18n/messages/ru.json' with { type: 'json' };
import { axe } from './axe.ts';

// Runs against the fixture build: `pnpm build:test-content`, then `HA_TEST_CONTENT=1 pnpm e2e`.
// The test-only diagram "demo-treated" sits in en/disease/another-condition.mdx.
// Spec: docs/plans/2026-10-12-after-treatment-mode.md.
test.skip(process.env['HA_TEST_CONTENT'] !== '1', 'needs the HA_TEST_CONTENT=1 build');

const demo = (page: Page) =>
  page.locator('figure.diagram', { has: page.getByText('Treated caption.') });

test.describe('after-treatment diagram state', () => {
  test('switches Normal, Disease and After treatment, art and caption together', async ({
    page,
  }) => {
    await page.goto('ru/disease/another-condition/');
    const diagram = demo(page);
    await expect(diagram.locator('fieldset label')).toHaveText([
      ru['diagram.state.normal'],
      ru['diagram.state.disease'],
      ru['diagram.state.treated'],
    ]);
    await expect(diagram.getByRole('radio', { name: ru['diagram.state.disease'] })).toBeChecked();
    await expect(diagram.getByText('Disease art')).toBeVisible();
    await expect(diagram.getByText('Treated caption.')).toBeHidden();

    // Arrow keys move through all three; the third has a visible focus ring.
    await diagram.getByRole('radio', { name: ru['diagram.state.disease'] }).focus();
    await page.keyboard.press('ArrowRight');
    const treated = diagram.getByRole('radio', { name: ru['diagram.state.treated'] });
    await expect(treated).toBeChecked();
    await expect(diagram.locator('fieldset label').nth(2)).toHaveCSS('outline-style', 'solid');
    await expect(diagram.getByText('Treated art')).toBeVisible();
    await expect(diagram.getByText('Treated caption.')).toBeVisible();
    await expect(diagram.getByText('Disease art')).toBeHidden();
    await expect(diagram.getByText('Normal art')).toBeHidden();
    await expect(diagram.getByText('Disease caption.')).toBeHidden();

    const results = await axe(page).analyze();
    expect(results.violations).toEqual([]);
  });

  test('fits a 320 px screen without clipping the switch', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto('ru/disease/another-condition/');
    const fieldset = demo(page).locator('fieldset');
    const box = await fieldset.boundingBox();
    expect(box && box.x >= 0 && box.x + box.width <= 320).toBe(true);
    // Every option stays inside the rounded outline.
    for (const label of await fieldset.locator('label').all()) {
      const inner = await label.boundingBox();
      expect(inner && box && inner.y + inner.height <= box.y + box.height + 0.5).toBe(true);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(0);
  });

  test('works in an embed', async ({ page }) => {
    await page.goto('en/embed/disease/another-condition/');
    const diagram = demo(page);
    await diagram.getByText(en['diagram.state.treated']).click();
    await expect(diagram.getByText('Treated art')).toBeVisible();
  });
});

test.describe('after-treatment diagram state without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('still switches', async ({ page }) => {
    await page.goto('en/disease/another-condition/');
    const diagram = demo(page);
    await diagram.getByText(en['diagram.state.treated']).click();
    await expect(diagram.getByText('Treated caption.')).toBeVisible();
    await expect(diagram.getByText('Disease caption.')).toBeHidden();
  });
});

test.describe('after-treatment diagram state right to left', () => {
  test.skip(process.env['HA_TEST_LOCALES'] !== '1', 'needs the HA_TEST_LOCALES=1 build');

  test('moves with the arrow keys in the page direction and stays accessible', async ({ page }) => {
    await page.goto('qps-plocm/disease/another-condition/');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    const diagram = demo(page);
    const disease = diagram.getByRole('radio', { name: '[RTL] Disease' });
    await disease.focus();
    // In right-to-left text the next option is to the left.
    await page.keyboard.press('ArrowLeft');
    await expect(diagram.getByRole('radio', { name: '[RTL] After treatment' })).toBeChecked();
    await page.keyboard.press('ArrowRight');
    await expect(disease).toBeChecked();
    const results = await axe(page).analyze();
    expect(results.violations).toEqual([]);
  });
});
