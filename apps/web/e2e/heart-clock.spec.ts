import { heartRateLimits, presetParams } from '@heart-atlas/heart-clock';
import { expect, test } from '@playwright/test';
import { productionLocales } from '../src/i18n/locales.ts';
import en from '../src/i18n/messages/en.json' with { type: 'json' };
import { axe } from './axe.ts';

for (const locale of Object.keys(productionLocales)) {
  test.describe(`heart clock page (${locale})`, () => {
    test('is linked from the home page', async ({ page }) => {
      await page.goto(`${locale}/`);
      await page.locator('main a[href$="/heart-clock/"]').click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/heart-clock/$`));
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });

    test('draws the ECG and has no axe violations', async ({ page }) => {
      await page.goto(`${locale}/heart-clock/`);
      // Two drawings: the ECG strip and the Wiggers diagram, each with a pixel buffer.
      const images = page.locator('canvas[role="img"]');
      await expect(images).toHaveCount(2);
      for (const image of await images.all()) {
        await expect(image).toBeVisible();
        await expect(image).toHaveAttribute('width', /^[1-9]\d*$/);
        await expect(image).toHaveAccessibleDescription(/\S/);
      }
      const results = await axe(page).analyze();
      expect(results.violations).toEqual([]);
    });
  });
}

test.describe('3D model on the heart clock page', () => {
  test('waits for the button before loading three.js and the model', async ({ page }) => {
    const requested: string[] = [];
    page.on('request', (r) => requested.push(r.url()));
    await page.goto('en/heart-clock/');
    await expect(
      page.getByRole('heading', { level: 2, name: en['heartClock.model3d'] }),
    ).toBeVisible();
    const load = page.getByRole('button', { name: en['viewer.load'] });
    await load.scrollIntoViewIfNeeded();
    await expect(load).toBeVisible();
    // Wait until both islands have hydrated and the network is quiet: the viewer still waits for
    // the click, while its own small chunk has loaded.
    await expect(page.getByRole('button', { name: en['heartClock.pause'] })).toBeVisible();
    await expect(page.locator('astro-island', { has: load })).not.toHaveAttribute('ssr');
    await page.waitForLoadState('networkidle');
    expect(requested.filter((url) => url.includes('/Scene.') || url.endsWith('.glb'))).toEqual([]);
  });
});

test.describe('heart clock controls', () => {
  test('plays by default, pauses and follows the heart rate', async ({ page }) => {
    await page.goto('en/heart-clock/');
    await page.getByRole('button', { name: en['heartClock.pause'] }).click();
    await expect(page.getByRole('button', { name: en['heartClock.play'] })).toBeVisible();

    const slider = page.getByRole('slider', { name: en['heartClock.heartRate'] });
    await slider.fill('120');
    await expect(page.getByText(/Sinus rhythm at 120 beats per minute/)).toBeVisible();
    await expect(
      page.getByRole('img', { name: en['heartClock.ecgLabel'] }),
    ).toHaveAccessibleDescription(/120 beats per minute/);
  });

  test('starts paused when the reader prefers reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('en/heart-clock/');
    // Wait for hydration: the island renders the speed radios with formatted labels either way,
    // so check that the play button stays after the effects have run.
    await expect(page.getByRole('radio', { name: '×0.5' })).toBeVisible();
    await page.waitForTimeout(300);
    await expect(page.getByRole('button', { name: en['heartClock.play'] })).toBeVisible();
  });

  test('shows a phase that changes while playing', async ({ page }) => {
    await page.goto('en/heart-clock/');
    // The pause button appears once the island has hydrated and started.
    await expect(page.getByRole('button', { name: en['heartClock.pause'] })).toBeVisible();
    const phase = page.locator('[data-phase]');
    const seen = new Set<string>();
    await expect
      .poll(
        async () => {
          seen.add((await phase.getAttribute('data-phase')) ?? '');
          return seen.size;
        },
        { timeout: 5000, intervals: [50] },
      )
      .toBeGreaterThanOrEqual(3);
  });
});

test.describe('disease presets', () => {
  test('switch the description and the summary, and switch back', async ({ page }) => {
    await page.goto('en/heart-clock/');
    await expect(page.getByRole('button', { name: en['heartClock.pause'] })).toBeVisible();
    const conditions = page.getByRole('group', { name: en['heartClock.condition'] });
    await expect(conditions).toHaveAccessibleDescription(en['heartClock.preset.normal.summary']);
    await conditions
      .getByRole('radio', { name: en['heartClock.preset.atrial-fibrillation'] })
      .check();
    await expect(conditions).toHaveAccessibleDescription(
      en['heartClock.preset.atrial-fibrillation.summary'],
    );
    const ecg = page.getByRole('img', { name: en['heartClock.ecgLabel'] });
    await expect(ecg).toHaveAccessibleDescription(/^Atrial fibrillation at an average of 75 /);
    const results = await axe(page).analyze();
    expect(results.violations).toEqual([]);

    await conditions.getByRole('radio', { name: en['heartClock.preset.normal'] }).check();
    await expect(ecg).toHaveAccessibleDescription(/^Sinus rhythm at 75 /);
  });

  test('limit the heart rate to what the preset fits', async ({ page }) => {
    await page.goto('en/heart-clock/');
    // Wait for hydration, so the slider value is React's and not reset by it.
    await expect(page.getByRole('button', { name: en['heartClock.pause'] })).toBeVisible();
    const slider = page.getByRole('slider', { name: en['heartClock.heartRate'] });
    await slider.fill('180');
    await page.getByRole('radio', { name: en['heartClock.preset.atrial-septal-defect'] }).check();
    const [, max] = heartRateLimits(presetParams('atrial-septal-defect'));
    await expect(slider).toHaveAttribute('max', String(max));
    await expect(slider).toHaveValue(String(max));
    await expect(page.locator('output')).toHaveText(String(max));

    await page.getByRole('radio', { name: en['heartClock.preset.normal'] }).check();
    await expect(slider).toHaveAttribute('max', '180');
  });

  test('keep drawing when switched after playing for a while', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (error) => errors.push(error));
    await page.goto('en/heart-clock/');
    await expect(page.getByRole('button', { name: en['heartClock.pause'] })).toBeVisible();
    // Long enough for the clock to drop the beats it started with.
    await page.waitForTimeout(3000);
    await page.getByRole('radio', { name: en['heartClock.preset.aortic-stenosis'] }).check();
    await page.waitForTimeout(500);
    await page.getByRole('radio', { name: en['heartClock.preset.stemi'] }).check();
    await page.waitForTimeout(500);
    expect(errors).toEqual([]);
    await expect(page.locator('[data-phase]')).toBeVisible();
    // The ECG still has dark trace pixels.
    const inked = await page
      .getByRole('img', { name: en['heartClock.ecgLabel'] })
      .evaluate((canvas: HTMLCanvasElement) => {
        const context = canvas.getContext('2d');
        if (!context) return 0;
        const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
        let count = 0;
        for (let i = 0; i < data.length; i += 4) {
          if ((data[i] ?? 255) < 80 && (data[i + 1] ?? 255) < 80) count += 1;
        }
        return count;
      });
    expect(inked).toBeGreaterThan(100);
  });
});

test.describe('heart sounds', () => {
  test('stay off until the button is pressed, then queue sounds on the audio clock', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      // Counts oscillators the page starts, without needing speakers in CI.
      const counter = window as unknown as { startedOscillators: number };
      counter.startedOscillators = 0;
      const start = OscillatorNode.prototype.start;
      OscillatorNode.prototype.start = function (...args: Parameters<OscillatorNode['start']>) {
        counter.startedOscillators += 1;
        return start.apply(this, args);
      };
    });
    await page.goto('en/heart-clock/');
    const started = () =>
      page.evaluate(() => (window as unknown as { startedOscillators: number }).startedOscillators);
    await page.waitForTimeout(1500);
    expect(await started()).toBe(0);

    await page.getByRole('button', { name: en['heartClock.soundOn'] }).click();
    await expect(page.getByRole('button', { name: en['heartClock.soundOff'] })).toBeVisible();
    await expect.poll(started, { timeout: 5000 }).toBeGreaterThan(0);
  });
});
