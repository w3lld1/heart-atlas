import { expect, test, type Page } from '@playwright/test';
import { paramRanges, defaultParams } from '@heart-atlas/heart-clock';
import { productionLocales } from '../src/i18n/locales.ts';
import { testLocales } from '../test/fixtures/i18n/locales.ts';
import en from '../src/i18n/messages/en.json' with { type: 'json' };
import { axe } from './axe.ts';

/** Checks what every embed page must have: no site chrome, noindex, canonical, credit, no worker. */
async function expectEmbedShell(page: Page, canonicalPath: RegExp) {
  await expect(page.locator('header')).toHaveCount(0);
  await expect(page.locator('form[role="search"]')).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonicalPath);
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(0);
  await expect(page.locator('.update-region')).toHaveCount(0);
  const open = page.locator('footer a[target="_blank"]');
  await expect(open).toHaveAttribute('rel', 'noopener');
  await expect(open).toHaveAttribute('href', canonicalPath);
  await expect(page.locator('footer')).toContainText('CC BY-SA 4.0');
}

/** Path of the first disease embed offered by the builder of a locale. */
async function firstDiseaseEmbed(page: Page, locale: string): Promise<string> {
  await page.goto(`${locale}/embed/`);
  const src = await page
    .locator('select[name="module"] option[value*="/embed/disease/"]')
    .first()
    .getAttribute('value');
  expect(src).not.toBeNull();
  return new URL(src ?? '').pathname;
}

for (const locale of Object.keys(productionLocales)) {
  test.describe(`embed (${locale})`, () => {
    test('ECG module has the embed shell and no axe violations', async ({ page }) => {
      await page.goto(`${locale}/embed/ecg/`);
      await expect(page.getByRole('img').first()).toBeVisible();
      await expectEmbedShell(page, new RegExp(`/${locale}/heart-clock/$`));
      const results = await axe(page).analyze();
      expect(results.violations).toEqual([]);
    });

    test('heart model module has the embed shell, model credits and no axe violations', async ({
      page,
    }) => {
      await page.goto(`${locale}/embed/heart-model/`);
      // three.js waits for the reader: only the poster and the load button are on the page.
      await expect(page.locator('main img')).toBeVisible();
      await expect(page.locator('main button').first()).toBeVisible();
      await expect(page.locator('canvas')).toHaveCount(0);
      await expectEmbedShell(page, new RegExp(`/${locale}/anatomy/$`));
      await expect(page.locator('footer .credits')).toContainText(
        'BodyParts3D, © The Database Center for Life Science',
      );
      const results = await axe(page).analyze();
      expect(results.violations).toEqual([]);
    });

    test('disease module keeps the review notice and sources', async ({ page }) => {
      const pathname = await firstDiseaseEmbed(page, locale);
      await page.goto(pathname);
      await expect(page.locator('.review-notice')).toBeVisible();
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.locator('section.sources li').first()).toBeVisible();
      const slug = pathname.split('/').filter(Boolean).at(-1) ?? '';
      await expectEmbedShell(page, new RegExp(`/disease/${slug}/$`));
      // Links to other pages open in a new tab; links within the page stay in the frame.
      await expect(page.locator('section.sources a[href^="http"]').first()).toHaveAttribute(
        'target',
        '_blank',
      );
      await expect(page.locator('a[href^="#"][target]')).toHaveCount(0);
      const results = await axe(page).analyze();
      expect(results.violations).toEqual([]);
    });

    test('builder is linked from the footer and has no axe violations', async ({ page }) => {
      await page.goto(`${locale}/`);
      await page.locator(`footer a[href$="/${locale}/embed/"]`).click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/embed/$`));
      await expect(page.locator('textarea[name="code"]')).toHaveValue(/<iframe /);
      const results = await axe(page).analyze();
      expect(results.violations).toEqual([]);
    });
  });
}

test.describe('embed parameters', () => {
  const slider = (page: Page) => page.getByRole('slider', { name: en['heartClock.heartRate'] });
  // The build renders the monitor with defaults; URL parameters apply only after hydration.
  const hydrated = (page: Page) => expect(page.locator('astro-island[ssr]')).toHaveCount(0);

  test('applies a whitelisted parameter and ignores unknown ones', async ({ page }) => {
    await page.goto('en/embed/ecg/?rate=120&autoplay=1&locale=ru');
    await expect(slider(page)).toHaveValue('120');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('ignores an out-of-range value', async ({ page }) => {
    await page.goto(`en/embed/ecg/?rate=${paramRanges.heartRate[1] + 1}`);
    await hydrated(page);
    await expect(slider(page)).toHaveValue(String(defaultParams.heartRate));
  });

  test('highlights the structure named in the query and ignores unknown parameters', async ({
    page,
  }) => {
    await page.goto('en/embed/heart-model/?structure=aorta&autoplay=1');
    await expect(
      page.getByRole('button', { name: en['structure.aorta'], exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  test('ignores a structure id that is not in the model', async ({ page }) => {
    await page.goto('en/embed/heart-model/?structure=liver');
    // Wait for hydration, then check that nothing was highlighted but the list still works.
    await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
    await expect(page.locator('main button[aria-pressed="true"]')).toHaveCount(0);
    const aorta = page.getByRole('button', { name: en['structure.aorta'], exact: true });
    await aorta.click();
    await expect(aorta).toHaveAttribute('aria-pressed', 'true');
  });
});

test.describe('embed builder', () => {
  test('builds code with title, lazy loading and the chosen parameters', async ({ page }) => {
    await page.goto('en/embed/');
    const code = page.locator('textarea[name="code"]');
    await expect(code).toHaveValue(/title="[^"]+"/);
    await expect(code).toHaveValue(/loading="lazy"/);
    await expect(code).toHaveValue(/src="[^"]*\/heart-atlas\/en\/embed\/ecg\/"/);

    const rate = page.getByLabel(en['heartClock.heartRate']);
    await rate.fill('90');
    await expect(code).toHaveValue(/\/en\/embed\/ecg\/\?rate=90"/);
    // Number inputs accept forms the embed does not; the builder writes the plain integer.
    await rate.fill('1e2');
    await expect(code).toHaveValue(/\?rate=100"/);
    await rate.fill('500');
    await expect(code).not.toHaveValue(/rate=/);
    await expect(page.locator('#rate-error')).not.toBeEmpty();
    await rate.fill('');

    const disease = page.locator('select[name="module"] option[value*="/embed/disease/"]').first();
    const value = await disease.getAttribute('value');
    await page.locator('select[name="module"]').selectOption(value ?? '');
    await expect(page.getByLabel(en['heartClock.heartRate'])).toBeHidden();
    await expect(code).not.toHaveValue(/rate=/);
    await expect(code).toHaveValue(/\/en\/embed\/disease\//);
  });
});

test.describe('embed in the right-to-left test locale', () => {
  test.skip(process.env['HA_TEST_LOCALES'] !== '1', 'needs a build with HA_TEST_LOCALES=1');

  for (const code of Object.keys(testLocales)) {
    test(`embed pages have no axe violations (${code})`, async ({ page }) => {
      const disease = await firstDiseaseEmbed(page, code);
      for (const path of [
        `${code}/embed/`,
        `${code}/embed/ecg/`,
        `${code}/embed/heart-model/`,
        disease,
      ]) {
        await page.goto(path);
        await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
        await expect(page.locator('main')).not.toBeEmpty();
        const results = await axe(page).analyze();
        expect(results.violations, path).toEqual([]);
      }
    });
  }
});

test.describe('embed citations', () => {
  test.skip(process.env['HA_TEST_CONTENT'] !== '1', 'needs the HA_TEST_CONTENT=1 build');

  test('a citation scrolls to its source inside the frame', async ({ page, context }) => {
    await page.goto('ru/embed/disease/test-condition/');
    const pages = context.pages().length;
    await page.locator('sup.cite a').first().click();
    await expect(page).toHaveURL(/#source-\d+$/);
    expect(context.pages()).toHaveLength(pages);
  });
});

test.describe('embed builder copy button', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('copies the code and announces it', async ({ page }) => {
    await page.goto('en/embed/');
    const copy = page.getByRole('button', { name: en['embed.copy'] });
    await copy.click();
    await expect(page.locator('[data-copy-status]')).toHaveText(en['embed.copied']);
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toBe(await page.locator('textarea[name="code"]').inputValue());
  });
});
