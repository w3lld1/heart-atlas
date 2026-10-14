import { expect, test, type Page } from '@playwright/test';
import {
  defaultParams,
  defaultRateLimits,
  heartRateLimits,
  paramRanges,
  presetParams,
  presetRateLimits,
} from '@heart-atlas/heart-clock';
import { productionLocales } from '../src/i18n/locales.ts';
import { testLocales } from '../test/fixtures/i18n/locales.ts';
import en from '../src/i18n/messages/en.json' with { type: 'json' };
import ru from '../src/i18n/messages/ru.json' with { type: 'json' };
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
      // The Japanese attribution is read with a Japanese voice, here and in the viewer.
      for (const where of ['footer .credits', 'main']) {
        await expect(page.locator(`${where} [lang="ja"]`)).toContainText(
          'ライフサイエンス統合データベースセンター',
        );
      }
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
  // The embed lists every state in a select (issue #317).
  const condition = (page: Page) =>
    page.getByRole('combobox', { name: en['heartClock.condition'] });
  // The build renders the monitor with defaults; URL parameters apply only after hydration.
  const hydrated = (page: Page) => expect(page.locator('astro-island[ssr]')).toHaveCount(0);

  test('applies a whitelisted parameter and ignores unknown ones', async ({ page }) => {
    await page.goto('en/embed/ecg/?rate=120&autoplay=1&locale=ru');
    await expect(slider(page)).toHaveValue('120');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('starts from the preset in the URL and ignores an unknown one', async ({ page }) => {
    await page.goto('en/embed/ecg/?preset=atrial-fibrillation&rate=90');
    await expect(condition(page)).toHaveValue('atrial-fibrillation');
    await expect(slider(page)).toHaveValue('90');

    await page.goto('en/embed/ecg/?preset=not-a-preset');
    await hydrated(page);
    await expect(condition(page)).toHaveValue('normal');
  });

  test('keeps a rate from the URL inside the preset limits', async ({ page }) => {
    const [, max] = heartRateLimits(presetParams('atrial-septal-defect'));
    await page.goto(`en/embed/ecg/?preset=atrial-septal-defect&rate=${max + 1}`);
    await hydrated(page);
    await expect(condition(page)).toHaveValue('atrial-septal-defect');
    await expect(slider(page)).toHaveValue(String(max));
  });

  test('starts SVT at its own heart rate and keeps a URL rate above its floor', async ({
    page,
  }) => {
    await page.goto('en/embed/ecg/?preset=supraventricular-tachycardia');
    await hydrated(page);
    await expect(condition(page)).toHaveValue('supraventricular-tachycardia');
    await expect(slider(page)).toHaveValue(
      String(presetParams('supraventricular-tachycardia').heartRate),
    );
    const [min] = presetRateLimits('supraventricular-tachycardia');
    await page.goto('en/embed/ecg/?preset=supraventricular-tachycardia&rate=90');
    await hydrated(page);
    await expect(condition(page)).toHaveValue('supraventricular-tachycardia');
    await expect(slider(page)).toHaveValue(String(min));

    // A URL rate belongs to the preset the embed starts with; switching to SVT sets its own rate.
    await page.goto('en/embed/ecg/?rate=90');
    await hydrated(page);
    await expect(slider(page)).toHaveValue('90');
    await condition(page).selectOption('supraventricular-tachycardia');
    await expect(slider(page)).toHaveValue(
      String(presetParams('supraventricular-tachycardia').heartRate),
    );
  });

  test('keeps a URL rate inside the complete AV block escape range', async ({ page }) => {
    await page.goto('en/embed/ecg/?preset=av-block-third-degree&rate=120');
    await hydrated(page);
    await expect(condition(page)).toHaveValue('av-block-third-degree');
    await expect(slider(page)).toHaveValue('50');
  });

  test('keeps a URL rate inside the VT range and the long QT upper limit', async ({ page }) => {
    await page.goto('en/embed/ecg/?preset=ventricular-tachycardia');
    await hydrated(page);
    await expect(condition(page)).toHaveValue('ventricular-tachycardia');
    await expect(slider(page)).toHaveValue(
      String(presetParams('ventricular-tachycardia').heartRate),
    );
    const [vtMin, vtMax] = presetRateLimits('ventricular-tachycardia');
    await page.goto('en/embed/ecg/?preset=ventricular-tachycardia&rate=90');
    await hydrated(page);
    await expect(slider(page)).toHaveValue(String(vtMin));
    await page.goto(`en/embed/ecg/?preset=ventricular-tachycardia&rate=${vtMax + 1}`);
    await hydrated(page);
    await expect(slider(page)).toHaveValue(String(vtMax));

    const [, longQtMax] = presetRateLimits('long-qt-syndrome');
    await page.goto(`en/embed/ecg/?preset=long-qt-syndrome&rate=${longQtMax + 1}`);
    await hydrated(page);
    await expect(condition(page)).toHaveValue('long-qt-syndrome');
    await expect(slider(page)).toHaveValue(String(longQtMax));
  });

  test('keeps a URL rate inside the atrial flutter and sick sinus syndrome ranges', async ({
    page,
  }) => {
    await page.goto('en/embed/ecg/?preset=atrial-flutter');
    await hydrated(page);
    await expect(condition(page)).toHaveValue('atrial-flutter');
    await expect(slider(page)).toHaveValue(String(presetParams('atrial-flutter').heartRate));
    const [flutterMin, flutterMax] = presetRateLimits('atrial-flutter');
    await page.goto(`en/embed/ecg/?preset=atrial-flutter&rate=${flutterMin - 1}`);
    await hydrated(page);
    await expect(slider(page)).toHaveValue(String(flutterMin));
    await page.goto(`en/embed/ecg/?preset=atrial-flutter&rate=${flutterMax + 1}`);
    await hydrated(page);
    await expect(slider(page)).toHaveValue(String(flutterMax));
    await page.goto('en/embed/ecg/?preset=sick-sinus-syndrome');
    await hydrated(page);
    await expect(condition(page)).toHaveValue('sick-sinus-syndrome');
    await expect(slider(page)).toHaveValue(String(presetParams('sick-sinus-syndrome').heartRate));
    // Below 40 only for this preset: the model's lowest rate is accepted, 40 is not.
    const [sssMin, sssMax] = presetRateLimits('sick-sinus-syndrome');
    await page.goto(`en/embed/ecg/?preset=sick-sinus-syndrome&rate=${sssMin}`);
    await hydrated(page);
    await expect(slider(page)).toHaveValue(String(sssMin));
    await page.goto(`en/embed/ecg/?preset=sick-sinus-syndrome&rate=${sssMax + 1}`);
    await hydrated(page);
    await expect(condition(page)).toHaveValue('sick-sinus-syndrome');
    await expect(slider(page)).toHaveValue(String(sssMax));
  });

  test('draws Brugada syndrome in lead V1 and keeps a URL rate under the WPW upper limit', async ({
    page,
  }) => {
    const ecgLabel = (lead: string) => en['heartClock.ecgLabel'].replace('{lead}', lead);
    await page.goto('en/embed/ecg/?preset=brugada-syndrome&rate=90');
    await hydrated(page);
    await expect(condition(page)).toHaveValue('brugada-syndrome');
    await expect(slider(page)).toHaveValue('90');
    await expect(page.getByRole('img', { name: ecgLabel('V1') })).toHaveAccessibleDescription(
      en['heartClock.preset.brugada-syndrome.ecg'].replace('{rate}', '90'),
    );
    await expect(page.getByRole('img', { name: ecgLabel('II') })).toHaveCount(0);

    // The delta wave of WPW narrows the upper limit; the preset keeps lead II.
    const [, wpwMax] = presetRateLimits('wpw-syndrome');
    await page.goto(`en/embed/ecg/?preset=wpw-syndrome&rate=${wpwMax + 1}`);
    await hydrated(page);
    await expect(condition(page)).toHaveValue('wpw-syndrome');
    await expect(slider(page)).toHaveValue(String(wpwMax));
    await expect(page.getByRole('img', { name: ecgLabel('II') })).toBeVisible();
  });

  test('ignores a URL rate for ventricular fibrillation, which has no pulse', async ({ page }) => {
    await page.goto('en/embed/ecg/?preset=ventricular-fibrillation&rate=120');
    await hydrated(page);
    await expect(condition(page)).toHaveValue('ventricular-fibrillation');
    await expect(slider(page)).toHaveCount(0);
    await expect(page.getByRole('status', { name: en['heartClock.heartRate'] })).toHaveText(
      en['heartClock.noPulse'],
    );
    // Switching to normal starts at its own rate, not at the ignored one.
    await condition(page).selectOption('normal');
    await expect(slider(page)).toHaveValue(String(defaultParams.heartRate));
  });

  test('the reader can change the rate set by the URL', async ({ page }) => {
    await page.goto('en/embed/ecg/?rate=90');
    await hydrated(page);
    await slider(page).fill('100');
    await page.waitForTimeout(300);
    await expect(slider(page)).toHaveValue('100');
  });

  test('ignores an out-of-range value', async ({ page }) => {
    await page.goto(`en/embed/ecg/?rate=${paramRanges.heartRate[1] + 1}`);
    await hydrated(page);
    await expect(slider(page)).toHaveValue(String(defaultParams.heartRate));
  });

  test('keeps a rate the model allows inside the preset limits', async ({ page }) => {
    // 35 bpm is inside the model (30–180) but below the 40 bpm floor of a preset without its own.
    await page.goto(`en/embed/ecg/?rate=${paramRanges.heartRate[0] + 5}`);
    await hydrated(page);
    await expect(slider(page)).toHaveValue(String(defaultRateLimits[0]));
    await page.goto(`en/embed/ecg/?rate=${paramRanges.heartRate[0] - 1}`);
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
    const condition = page.locator('select[name="preset"]');
    await rate.fill('90');
    await expect(code).toHaveValue(/\/en\/embed\/ecg\/\?rate=90"/);
    // Number inputs accept forms the embed does not; the builder writes the plain integer.
    await rate.fill('1e2');
    await expect(code).toHaveValue(/\?rate=100"/);
    await rate.fill('500');
    await expect(code).not.toHaveValue(/rate=/);
    await expect(page.locator('#rate-error')).not.toBeEmpty();
    await rate.fill('');

    await condition.selectOption('atrial-fibrillation');
    await expect(code).toHaveValue(/\/en\/embed\/ecg\/\?preset=atrial-fibrillation"/);
    await rate.fill('90');
    await expect(code).toHaveValue(/\?preset=atrial-fibrillation&amp;rate=90"/);
    await expect(code).toHaveValue(
      new RegExp(
        `title="${en['heartClock.title']}: ${en['heartClock.preset.atrial-fibrillation']}"`,
      ),
    );
    // The long PR of first-degree AV block narrows the upper heart rate limit.
    const [, avBlockMax] = heartRateLimits(presetParams('av-block-first-degree'));
    await expect(condition.locator('option[value="av-block-first-degree"]')).toHaveAttribute(
      'data-max',
      String(avBlockMax),
    );
    // SVT sets its own rate and does not go below its floor.
    const [svtMin, svtMax] = presetRateLimits('supraventricular-tachycardia');
    const svtOption = condition.locator('option[value="supraventricular-tachycardia"]');
    await expect(svtOption).toHaveAttribute('data-min', String(svtMin));
    await expect(svtOption).toHaveAttribute('data-max', String(svtMax));
    // The long QT narrows the upper limit; VT has a floor and its wide QRS narrows the top.
    const [longQtMin, longQtMax] = presetRateLimits('long-qt-syndrome');
    const longQtOption = condition.locator('option[value="long-qt-syndrome"]');
    await expect(longQtOption).toHaveAttribute('data-min', String(longQtMin));
    await expect(longQtOption).toHaveAttribute('data-max', String(longQtMax));
    const [vtMin, vtMax] = presetRateLimits('ventricular-tachycardia');
    const vtOption = condition.locator('option[value="ventricular-tachycardia"]');
    await expect(vtOption).toHaveAttribute('data-min', String(vtMin));
    await expect(vtOption).toHaveAttribute('data-max', String(vtMax));
    // Atrial flutter has a floor and a ceiling; sick sinus syndrome goes below 40 and stays there.
    // The delta wave of WPW narrows the upper limit; Brugada syndrome keeps the default range.
    for (const id of [
      'atrial-flutter',
      'sick-sinus-syndrome',
      'wpw-syndrome',
      'brugada-syndrome',
    ] as const) {
      const [min, max] = presetRateLimits(id);
      const option = condition.locator(`option[value="${id}"]`);
      await expect(option).toHaveAttribute('data-min', String(min));
      await expect(option).toHaveAttribute('data-max', String(max));
    }
    // A rate the preset does not allow is reported and left out of the code.
    const [, asdMax] = heartRateLimits(presetParams('atrial-septal-defect'));
    await condition.selectOption('atrial-septal-defect');
    await rate.fill(String(asdMax + 1));
    await expect(code).not.toHaveValue(/rate=/);
    await expect(page.locator('#rate-error')).not.toBeEmpty();
    await rate.fill('');
    // Ventricular fibrillation has no pulse: the rate field hides, and a typed rate is left out,
    // even one out of range.
    await rate.fill('500');
    await condition.selectOption('ventricular-fibrillation');
    await expect(rate).toBeHidden();
    await expect(code).toHaveValue(/\/en\/embed\/ecg\/\?preset=ventricular-fibrillation"/);
    await expect(page.locator('#rate-error')).toBeEmpty();
    await condition.selectOption('normal');
    await rate.fill('');
    // Left on a disease preset, so the module switch below shows that it is dropped.
    await condition.selectOption('atrial-fibrillation');

    const disease = page.locator('select[name="module"] option[value*="/embed/disease/"]').first();
    const value = await disease.getAttribute('value');
    await page.locator('select[name="module"]').selectOption(value ?? '');
    await expect(page.getByLabel(en['heartClock.heartRate'])).toBeHidden();
    await expect(code).not.toHaveValue(/rate=|preset=/);
    await expect(condition).toBeHidden();
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

  test('an article with a preset embeds the monitor', async ({ page }) => {
    await page.goto('ru/embed/disease/test-condition/');
    const monitor = page.locator('section.clock');
    await expect(
      monitor.getByRole('radio', { name: ru['heartClock.preset.atrial-fibrillation'] }),
    ).toBeChecked();
    const results = await axe(page).analyze();
    expect(results.violations).toEqual([]);
  });

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
