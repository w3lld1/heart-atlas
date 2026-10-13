import {
  defaultParams,
  defaultRateLimits,
  heartRateLimits,
  presetParams,
  presetRateLimits,
} from '@heart-atlas/heart-clock';
import { expect, test } from '@playwright/test';
import { productionLocales } from '../src/i18n/locales.ts';
import { MOTION_STORAGE_KEY } from '../src/lib/motion.ts';
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

for (const locale of Object.keys(productionLocales)) {
  test.describe(`heart clock page (${locale})`, () => {
    test('is linked from the home page', async ({ page }) => {
      await page.goto(`${locale}/`);
      // The first link is the button next to the main one in the hero.
      await page.locator('main a[href$="/heart-clock/"]').first().click();
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

test.describe('3D model in time with the monitor', () => {
  test('beats while the clock plays and stands still on pause', async ({ page }) => {
    // Under SwiftShader a beating page renders slowly, and a screenshot can take seconds.
    test.slow();
    await page.goto('en/heart-clock/');
    const load = page.getByRole('button', { name: en['viewer.load'] });
    await load.scrollIntoViewIfNeeded();
    await expect(page.locator('astro-island', { has: load })).not.toHaveAttribute('ssr');
    await load.click();
    const canvas = page.locator('canvas:not([role="img"])');
    await expect(canvas).toBeVisible({ timeout: 15_000 });
    // The viewer follows the page's clock and offers no start button of its own.
    await expect(page.getByRole('button', { name: en['viewer.heartbeat.start'] })).toHaveCount(0);
    await expect.poll(() => changedShare(canvas), { timeout: 45_000 }).toBeGreaterThan(MOVING);

    // A click event without scrolling the page up to the monitor and back.
    await page.getByRole('button', { name: en['heartClock.pause'] }).dispatchEvent('click');
    // Valves and glow ease out within about a second, then the picture holds.
    await expect.poll(() => changedShare(canvas, 500), { timeout: 20_000 }).toBeLessThan(MOVING);
    expect(await changedShare(canvas, 500)).toBeLessThan(MOVING);
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

  test('starts paused with motion off and pauses when motion is turned off', async ({ page }) => {
    await page.addInitScript((key) => localStorage.setItem(key, 'off'), MOTION_STORAGE_KEY);
    await page.goto('en/heart-clock/');
    await expect(page.getByRole('radio', { name: '×0.5' })).toBeVisible();
    await page.waitForTimeout(300);
    const play = page.getByRole('button', { name: en['heartClock.play'] });
    await expect(play).toBeVisible();
    await play.click();
    await expect(page.getByRole('button', { name: en['heartClock.pause'] })).toBeVisible();
    await page.locator('[data-set-motion="full"]').click();
    await expect(page.getByRole('button', { name: en['heartClock.pause'] })).toBeVisible();
    await page.locator('[data-set-motion="off"]').click();
    await expect(play).toBeVisible();
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
    await expect(
      conditions.getByRole('radio', { name: en['heartClock.preset.av-block-first-degree'] }),
    ).toHaveCount(1);
    await expect(
      conditions.getByRole('radio', {
        name: en['heartClock.preset.supraventricular-tachycardia'],
      }),
    ).toHaveCount(1);
    await expect(
      conditions.getByRole('radio', { name: en['heartClock.preset.long-qt-syndrome'] }),
    ).toHaveCount(1);
    await expect(
      conditions.getByRole('radio', { name: en['heartClock.preset.ventricular-tachycardia'] }),
    ).toHaveCount(1);
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

  test('set the heart rate of a preset that has its own and reset it on normal', async ({
    page,
  }) => {
    await page.goto('en/heart-clock/');
    await expect(page.getByRole('button', { name: en['heartClock.pause'] })).toBeVisible();
    const slider = page.getByRole('slider', { name: en['heartClock.heartRate'] });
    await slider.fill('90');
    await page
      .getByRole('radio', { name: en['heartClock.preset.supraventricular-tachycardia'] })
      .check();
    const [min] = presetRateLimits('supraventricular-tachycardia');
    await expect(slider).toHaveValue(
      String(presetParams('supraventricular-tachycardia').heartRate),
    );
    await expect(slider).toHaveAttribute('min', String(min));

    // Other presets keep the reader's rate; leaving SVT goes back to the default rate.
    await page.getByRole('radio', { name: en['heartClock.preset.normal'] }).check();
    await expect(slider).toHaveValue(String(defaultParams.heartRate));
    await expect(slider).toHaveAttribute('min', String(defaultRateLimits[0]));
    await slider.fill('90');
    await page.getByRole('radio', { name: en['heartClock.preset.stemi'] }).check();
    await expect(slider).toHaveValue('90');

    // VT sets its own rate and floor too; leaving it for long QT goes back to the default rate,
    // under the long QT's upper limit.
    await page
      .getByRole('radio', { name: en['heartClock.preset.ventricular-tachycardia'] })
      .check();
    const [vtMin, vtMax] = presetRateLimits('ventricular-tachycardia');
    await expect(slider).toHaveValue(String(presetParams('ventricular-tachycardia').heartRate));
    await expect(slider).toHaveAttribute('min', String(vtMin));
    await expect(slider).toHaveAttribute('max', String(vtMax));
    await page.getByRole('radio', { name: en['heartClock.preset.long-qt-syndrome'] }).check();
    const [, longQtMax] = presetRateLimits('long-qt-syndrome');
    await expect(slider).toHaveValue(String(defaultParams.heartRate));
    await expect(slider).toHaveAttribute('max', String(longQtMax));
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
