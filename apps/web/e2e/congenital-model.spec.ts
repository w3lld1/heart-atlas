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

// docs/plans/2026-10-12-congenital-models.md: a patient model of a congenital defect, in layers.
test.describe('congenital heart model', () => {
  // The fixture article embeds the model until the real tetralogy of Fallot article exists.
  test.skip(process.env['HA_TEST_CONTENT'] !== '1', 'needs the fixture content build');

  test('shows its source, opens cut and lists its layers', async ({ page }) => {
    await page.goto('en/disease/another-condition/');
    const figure = page.locator('figure', { hasText: en['congenital.source'] });
    await expect(figure).toContainText(en['congenital.tetralogy-of-fallot.caption']);
    await expect(figure.getByRole('link', { name: en['congenital.source'] })).toHaveAttribute(
      'href',
      'https://3d.nih.gov/entries/3DPX-016151/3',
    );
    const posterImage = figure.getByRole('img', {
      name: en['congenital.tetralogy-of-fallot.posterAlt'],
    });
    await expect
      .poll(() => posterImage.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
    const load = figure.getByRole('button', { name: en['viewer.load'] });
    await load.scrollIntoViewIfNeeded();
    await expect(figure.locator('astro-island')).not.toHaveAttribute('ssr');
    expect((await axe(page).analyze()).violations).toEqual([]);

    const glb = page.waitForRequest(/tetralogy-of-fallot-lod[01]\.glb$/);
    await load.click();
    await glb;
    const model = figure.getByRole('application', { name: en['viewer.canvasLabel'] });
    await expect(model).toHaveAttribute('aria-busy', 'false', LOAD);
    await expect(figure.getByLabel(en['viewer.section'], { exact: true })).toHaveValue('frontal');
    await expect(figure.getByLabel(en['viewer.section.position'])).toBeVisible();
    await figure.getByLabel(en['congenital.ghost']).check();
    for (const id of ['myocardium', 'blood-pool'] as const) {
      await expect(figure.getByRole('button', { name: en[`structure.${id}`] })).toBeVisible();
    }
    await expect(figure).toContainText('Kopan, CT');
    expect((await axe(page).analyze()).violations).toEqual([]);
  });
});
