import {
  defaultParams,
  defaultRateLimits,
  heartRateLimits,
  presetParams,
  presetRateLimits,
  type PresetId,
} from '@heart-atlas/heart-clock';
import { expect, test, type Page } from '@playwright/test';
import { productionLocales } from '../src/i18n/locales.ts';
import { MOTION_STORAGE_KEY } from '../src/lib/motion.ts';
import en from '../src/i18n/messages/en.json' with { type: 'json' };
import ru from '../src/i18n/messages/ru.json' with { type: 'json' };
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

const messages: Record<string, typeof en> = { en, ru };

/** The heart clock page lists every state in a select (issue #317). */
const choose = (page: Page, id: PresetId) =>
  page.getByRole('combobox', { name: en['heartClock.condition'] }).selectOption(id);

for (const locale of Object.keys(productionLocales)) {
  const t = messages[locale] ?? en;
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
      // Four drawings: ECG strips for leads I, II and III and the Wiggers diagram, each with a
      // pixel buffer. The rhythm description goes with the lead II strip only, so it is read once.
      const images = page.locator('canvas[role="img"]');
      await expect(images).toHaveCount(4);
      for (const image of await images.all()) {
        await expect(image).toBeVisible();
        await expect(image).toHaveAttribute('width', /^[1-9]\d*$/);
      }
      const strip = (lead: string) =>
        page.getByRole('img', { name: t['heartClock.ecgLabel'].replace('{lead}', lead) });
      await expect(strip('II')).toHaveAccessibleDescription(/\S/);
      await expect(strip('I')).toHaveAccessibleDescription('');
      await expect(strip('III')).toHaveAccessibleDescription('');
      await expect(
        page.getByRole('img', { name: t['heartClock.wiggers.label'] }),
      ).toHaveAccessibleDescription(/\S/);
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
      page.getByRole('img', { name: en['heartClock.ecgLabel'].replace('{lead}', 'II') }),
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
    const conditions = page.getByRole('combobox', { name: en['heartClock.condition'] });
    await expect(conditions).toHaveAccessibleDescription(en['heartClock.preset.normal.summary']);
    // Normal first, then the states in their groups (issue #317).
    await expect(conditions.locator('option').first()).toHaveText(en['heartClock.preset.normal']);
    await expect(conditions.locator('optgroup')).toHaveCount(4);
    await expect(
      conditions.locator(`optgroup[label="${en['heartClock.group.conduction']}"] option`),
    ).toHaveCount(7);
    await expect(
      conditions.getByRole('option', {
        name: en['heartClock.preset.av-block-first-degree'],
        exact: true,
      }),
    ).toHaveCount(1);
    await expect(
      conditions.getByRole('option', {
        name: en['heartClock.preset.supraventricular-tachycardia'],
        exact: true,
      }),
    ).toHaveCount(1);
    await expect(
      conditions.getByRole('option', {
        name: en['heartClock.preset.long-qt-syndrome'],
        exact: true,
      }),
    ).toHaveCount(1);
    await expect(
      conditions.getByRole('option', {
        name: en['heartClock.preset.ventricular-tachycardia'],
        exact: true,
      }),
    ).toHaveCount(1);
    await expect(
      conditions.getByRole('option', { name: en['heartClock.preset.atrial-flutter'], exact: true }),
    ).toHaveCount(1);
    await expect(
      conditions.getByRole('option', {
        name: en['heartClock.preset.sick-sinus-syndrome'],
        exact: true,
      }),
    ).toHaveCount(1);
    await expect(
      conditions.getByRole('option', { name: en['heartClock.preset.wpw-syndrome'], exact: true }),
    ).toHaveCount(1);
    await expect(
      conditions.getByRole('option', {
        name: en['heartClock.preset.brugada-syndrome'],
        exact: true,
      }),
    ).toHaveCount(1);
    await choose(page, 'atrial-fibrillation');
    await expect(conditions).toHaveAccessibleDescription(
      en['heartClock.preset.atrial-fibrillation.summary'],
    );
    const ecg = page.getByRole('img', { name: en['heartClock.ecgLabel'].replace('{lead}', 'II') });
    await expect(ecg).toHaveAccessibleDescription(/^Atrial fibrillation at an average of 75 /);
    const results = await axe(page).analyze();
    expect(results.violations).toEqual([]);

    await choose(page, 'normal');
    await expect(ecg).toHaveAccessibleDescription(/^Sinus rhythm at 75 /);
  });

  test('show complete AV block and its pacemaker with their own rates', async ({ page }) => {
    // docs/plans/2026-10-13-heart-clock-av-block.md
    await page.goto('en/heart-clock/');
    await expect(page.getByRole('button', { name: en['heartClock.pause'] })).toBeVisible();
    const conditions = page.getByRole('combobox', { name: en['heartClock.condition'] });
    const slider = page.getByRole('slider', { name: en['heartClock.heartRate'] });
    const ecg = page.getByRole('img', { name: en['heartClock.ecgLabel'].replace('{lead}', 'II') });
    await choose(page, 'av-block-third-degree');
    await expect(slider).toHaveValue('40');
    await expect(slider).toHaveAttribute('min', '35');
    await expect(slider).toHaveAttribute('max', '50');
    await expect(conditions).toHaveAccessibleDescription(
      en['heartClock.preset.av-block-third-degree.summary'],
    );
    await expect(ecg).toHaveAccessibleDescription(
      en['heartClock.preset.av-block-third-degree.ecg'].replace('{rate}', '40'),
    );
    expect((await axe(page).analyze()).violations).toEqual([]);

    await choose(page, 'av-block-third-degree-paced');
    await expect(slider).toHaveValue('75');
    await expect(slider).toHaveAttribute('min', '60');
    await expect(slider).toHaveAttribute('max', '100');
    await expect(ecg).toHaveAccessibleDescription(
      en['heartClock.preset.av-block-third-degree-paced.ecg'].replace('{rate}', '75'),
    );
  });

  test('show atrial and ventricular premature beats', async ({ page }) => {
    // docs/plans/2026-10-13-heart-clock-premature-beats.md
    await page.goto('en/heart-clock/');
    await expect(page.getByRole('button', { name: en['heartClock.pause'] })).toBeVisible();
    const conditions = page.getByRole('combobox', { name: en['heartClock.condition'] });
    const slider = page.getByRole('slider', { name: en['heartClock.heartRate'] });
    const ecg = page.getByRole('img', { name: en['heartClock.ecgLabel'].replace('{lead}', 'II') });
    for (const id of ['atrial-premature-beats', 'ventricular-premature-beats'] as const) {
      await choose(page, id);
      await expect(conditions).toHaveAccessibleDescription(en[`heartClock.preset.${id}.summary`]);
      await expect(slider).toHaveAttribute('min', '40');
      await expect(slider).toHaveAttribute('max', '86');
      await expect(ecg).toHaveAccessibleDescription(
        en[`heartClock.preset.${id}.ecg`].replace('{rate}', await slider.inputValue()),
      );
      expect((await axe(page).analyze()).violations).toEqual([]);
    }
  });

  test('show second-degree AV block, with filling and not a sinus pause in the gap', async ({
    page,
  }) => {
    // docs/plans/2026-10-13-heart-clock-second-degree-av-block.md
    await page.goto('en/heart-clock/');
    await expect(page.getByRole('button', { name: en['heartClock.pause'] })).toBeVisible();
    const conditions = page.getByRole('combobox', { name: en['heartClock.condition'] });
    const slider = page.getByRole('slider', { name: en['heartClock.heartRate'] });
    const ecg = page.getByRole('img', { name: en['heartClock.ecgLabel'].replace('{lead}', 'II') });
    await choose(page, 'av-block-second-degree-mobitz-1');
    await expect(slider).toHaveValue('60');
    await expect(slider).toHaveAttribute('min', '40');
    await expect(slider).toHaveAttribute('max', '70');
    await expect(conditions).toHaveAccessibleDescription(
      en['heartClock.preset.av-block-second-degree-mobitz-1.summary'],
    );
    await expect(ecg).toHaveAccessibleDescription(
      en['heartClock.preset.av-block-second-degree-mobitz-1.ecg'].replace('{rate}', '60'),
    );
    expect((await axe(page).analyze()).violations).toEqual([]);

    await choose(page, 'av-block-second-degree-mobitz-2');
    await expect(slider).toHaveValue('75');
    await expect(ecg).toHaveAccessibleDescription(
      en['heartClock.preset.av-block-second-degree-mobitz-2.ecg'].replace('{rate}', '75'),
    );
    await expect(slider).toHaveAttribute('min', '40');
    await expect(slider).toHaveAttribute('max', '180');
    expect((await axe(page).analyze()).violations).toEqual([]);
    // At 75 a P wave without a QRS comes every 2.4 s and its gap lasts 0.8 s. The phase there is
    // filling, so a run of filling far longer than in a regular beat (about 0.2 s) shows up, and
    // the monitor never shows a sinus pause.
    const phase = page.locator('[data-phase]');
    let run = 0;
    let longest = 0;
    const seen = new Set<string>();
    await expect
      .poll(
        async () => {
          const value = (await phase.getAttribute('data-phase')) ?? '';
          seen.add(value);
          run = value === 'filling' ? run + 1 : 0;
          longest = Math.max(longest, run);
          return longest;
        },
        { timeout: 10_000, intervals: [50] },
      )
      .toBeGreaterThanOrEqual(10);
    expect(seen).not.toContain('pause');
  });

  test('show sinus tachycardia at its own rate, with a floor above 100', async ({ page }) => {
    // docs/plans/2026-10-14-heart-clock-sinus-tachycardia.md
    await page.goto('en/heart-clock/');
    await expect(page.getByRole('button', { name: en['heartClock.pause'] })).toBeVisible();
    const conditions = page.getByRole('combobox', { name: en['heartClock.condition'] });
    const slider = page.getByRole('slider', { name: en['heartClock.heartRate'] });
    const ecg = page.getByRole('img', { name: en['heartClock.ecgLabel'].replace('{lead}', 'II') });
    await expect(
      conditions.locator(
        `optgroup[label="${en['heartClock.group.rhythm']}"] option[value="sinus-tachycardia"]`,
      ),
    ).toHaveCount(1);
    await choose(page, 'sinus-tachycardia');
    await expect(slider).toHaveValue('120');
    await expect(slider).toHaveAttribute('min', '101');
    await expect(conditions).toHaveAccessibleDescription(
      en['heartClock.preset.sinus-tachycardia.summary'],
    );
    await expect(ecg).toHaveAccessibleDescription(
      en['heartClock.preset.sinus-tachycardia.ecg'].replace('{rate}', '120'),
    );
    expect((await axe(page).analyze()).violations).toEqual([]);
  });

  test("show short QT syndrome at the reader's rate", async ({ page }) => {
    // docs/plans/2026-10-14-heart-clock-short-qt.md
    await page.goto('en/heart-clock/');
    await expect(page.getByRole('button', { name: en['heartClock.pause'] })).toBeVisible();
    const conditions = page.getByRole('combobox', { name: en['heartClock.condition'] });
    const slider = page.getByRole('slider', { name: en['heartClock.heartRate'] });
    const ecg = page.getByRole('img', { name: en['heartClock.ecgLabel'].replace('{lead}', 'II') });
    await expect(
      conditions.locator(
        `optgroup[label="${en['heartClock.group.rhythm']}"] option[value="short-qt-syndrome"]`,
      ),
    ).toHaveCount(1);
    const rate = await slider.inputValue();
    await choose(page, 'short-qt-syndrome');
    await expect(slider).toHaveValue(rate);
    await expect(conditions).toHaveAccessibleDescription(
      en['heartClock.preset.short-qt-syndrome.summary'],
    );
    await expect(ecg).toHaveAccessibleDescription(
      en['heartClock.preset.short-qt-syndrome.ecg'].replace('{rate}', rate),
    );
    expect((await axe(page).analyze()).violations).toEqual([]);
  });

  test('show bidirectional VT at its own rate', async ({ page }) => {
    // docs/plans/2026-10-14-heart-clock-bidirectional-vt.md
    await page.goto('en/heart-clock/');
    await expect(page.getByRole('button', { name: en['heartClock.pause'] })).toBeVisible();
    const conditions = page.getByRole('combobox', { name: en['heartClock.condition'] });
    const slider = page.getByRole('slider', { name: en['heartClock.heartRate'] });
    const ecg = page.getByRole('img', { name: en['heartClock.ecgLabel'].replace('{lead}', 'II') });
    await expect(
      conditions.locator(
        `optgroup[label="${en['heartClock.group.rhythm']}"] option[value="bidirectional-ventricular-tachycardia"]`,
      ),
    ).toHaveCount(1);
    await choose(page, 'bidirectional-ventricular-tachycardia');
    await expect(slider).toHaveValue('150');
    await expect(slider).toHaveAttribute('min', '101');
    await expect(conditions).toHaveAccessibleDescription(
      en['heartClock.preset.bidirectional-ventricular-tachycardia.summary'],
    );
    await expect(ecg).toHaveAccessibleDescription(
      en['heartClock.preset.bidirectional-ventricular-tachycardia.ecg'].replace('{rate}', '150'),
    );
    expect((await axe(page).analyze()).violations).toEqual([]);
  });

  test('show ventricular fibrillation with no pulse, no heart sounds and no cycles', async ({
    page,
  }) => {
    // docs/plans/2026-10-14-heart-clock-ventricular-fibrillation.md
    await page.goto('en/heart-clock/');
    await expect(page.getByRole('button', { name: en['heartClock.pause'] })).toBeVisible();
    const conditions = page.getByRole('combobox', { name: en['heartClock.condition'] });
    const slider = page.getByRole('slider', { name: en['heartClock.heartRate'] });
    const ecg = page.getByRole('img', { name: en['heartClock.ecgLabel'].replace('{lead}', 'II') });
    const wiggers = page.getByRole('img', { name: en['heartClock.wiggers.label'] });
    const noPulse = page.getByRole('status', { name: en['heartClock.heartRate'] });
    await expect(
      conditions.locator(
        `optgroup[label="${en['heartClock.group.rhythm']}"] option[value="ventricular-fibrillation"]`,
      ),
    ).toHaveCount(1);
    await choose(page, 'ventricular-fibrillation');
    await expect(slider).toHaveCount(0);
    await expect(noPulse).toHaveText(en['heartClock.noPulse']);
    // The sound button stays, with a note so the silence does not look broken.
    await expect(
      page.getByRole('button', { name: en['heartClock.soundOn'] }),
    ).toHaveAccessibleDescription(en['heartClock.noSounds']);
    await expect(page.getByText(en['heartClock.noSounds'], { exact: true })).toBeVisible();
    await expect(wiggers).toHaveCount(0);
    await expect(page.getByText(en['heartClock.wiggers.noCycles'], { exact: true })).toBeVisible();
    await expect(page.locator('[data-phase]')).toHaveText(en['heartClock.phase.fibrillation']);
    await expect(conditions).toHaveAccessibleDescription(
      en['heartClock.preset.ventricular-fibrillation.summary'],
    );
    await expect(ecg).toHaveAccessibleDescription(
      en['heartClock.preset.ventricular-fibrillation.ecg'],
    );
    expect((await axe(page).analyze()).violations).toEqual([]);

    await choose(page, 'normal');
    await expect(slider).toBeVisible();
    await expect(noPulse).toHaveCount(0);
    await expect(wiggers).toBeVisible();
    await expect(page.getByText(en['heartClock.noSounds'], { exact: true })).toHaveCount(0);
  });

  test('limit the heart rate to what the preset fits', async ({ page }) => {
    await page.goto('en/heart-clock/');
    // Wait for hydration, so the slider value is React's and not reset by it.
    await expect(page.getByRole('button', { name: en['heartClock.pause'] })).toBeVisible();
    const slider = page.getByRole('slider', { name: en['heartClock.heartRate'] });
    await slider.fill('180');
    await choose(page, 'atrial-septal-defect');
    const [, max] = heartRateLimits(presetParams('atrial-septal-defect'));
    await expect(slider).toHaveAttribute('max', String(max));
    await expect(slider).toHaveValue(String(max));
    await expect(page.locator('output')).toHaveText(String(max));

    await choose(page, 'normal');
    await expect(slider).toHaveAttribute('max', '180');
  });

  test('set the heart rate of a preset that has its own and reset it on normal', async ({
    page,
  }) => {
    await page.goto('en/heart-clock/');
    await expect(page.getByRole('button', { name: en['heartClock.pause'] })).toBeVisible();
    const slider = page.getByRole('slider', { name: en['heartClock.heartRate'] });
    await slider.fill('90');
    await choose(page, 'supraventricular-tachycardia');
    const [min] = presetRateLimits('supraventricular-tachycardia');
    await expect(slider).toHaveValue(
      String(presetParams('supraventricular-tachycardia').heartRate),
    );
    await expect(slider).toHaveAttribute('min', String(min));

    // Other presets keep the reader's rate; leaving SVT goes back to the default rate.
    await choose(page, 'normal');
    await expect(slider).toHaveValue(String(defaultParams.heartRate));
    await expect(slider).toHaveAttribute('min', String(defaultRateLimits[0]));
    await slider.fill('90');
    await choose(page, 'stemi');
    await expect(slider).toHaveValue('90');

    // VT sets its own rate and floor too; leaving it for long QT goes back to the default rate,
    // under the long QT's upper limit.
    await choose(page, 'ventricular-tachycardia');
    const [vtMin, vtMax] = presetRateLimits('ventricular-tachycardia');
    await expect(slider).toHaveValue(String(presetParams('ventricular-tachycardia').heartRate));
    await expect(slider).toHaveAttribute('min', String(vtMin));
    await expect(slider).toHaveAttribute('max', String(vtMax));
    await choose(page, 'long-qt-syndrome');
    const [, longQtMax] = presetRateLimits('long-qt-syndrome');
    await expect(slider).toHaveValue(String(defaultParams.heartRate));
    await expect(slider).toHaveAttribute('max', String(longQtMax));

    // Atrial flutter has a floor and a ceiling; sick sinus syndrome goes below 40 and stays there.
    await choose(page, 'atrial-flutter');
    const [flutterMin, flutterMax] = presetRateLimits('atrial-flutter');
    await expect(slider).toHaveValue(String(presetParams('atrial-flutter').heartRate));
    await expect(slider).toHaveAttribute('min', String(flutterMin));
    await expect(slider).toHaveAttribute('max', String(flutterMax));
    await choose(page, 'sick-sinus-syndrome');
    const [sssMin, sssMax] = presetRateLimits('sick-sinus-syndrome');
    await expect(slider).toHaveValue(String(presetParams('sick-sinus-syndrome').heartRate));
    await expect(slider).toHaveAttribute('min', String(sssMin));
    await expect(slider).toHaveAttribute('max', String(sssMax));
    await choose(page, 'normal');
    await expect(slider).toHaveValue(String(defaultParams.heartRate));
    await expect(slider).toHaveAttribute('min', String(defaultRateLimits[0]));
  });

  test('draw WPW syndrome in lead II and Brugada syndrome in lead V1, keeping the rate', async ({
    page,
  }) => {
    await page.goto('en/heart-clock/');
    await expect(page.getByRole('button', { name: en['heartClock.pause'] })).toBeVisible();
    const conditions = page.getByRole('combobox', { name: en['heartClock.condition'] });
    const slider = page.getByRole('slider', { name: en['heartClock.heartRate'] });
    const ecgLabel = (lead: string) => en['heartClock.ecgLabel'].replace('{lead}', lead);
    await slider.fill('90');

    // WPW keeps the reader's rate; its delta wave narrows the upper limit.
    await choose(page, 'wpw-syndrome');
    const [, wpwMax] = presetRateLimits('wpw-syndrome');
    await expect(slider).toHaveValue('90');
    await expect(slider).toHaveAttribute('max', String(wpwMax));
    await expect(conditions).toHaveAccessibleDescription(
      en['heartClock.preset.wpw-syndrome.summary'],
    );
    await expect(page.getByRole('img', { name: ecgLabel('II') })).toHaveAccessibleDescription(
      en['heartClock.preset.wpw-syndrome.ecg'].replace('{rate}', '90'),
    );

    // Brugada syndrome is drawn in V1, and the strip label says so.
    await choose(page, 'brugada-syndrome');
    await expect(slider).toHaveValue('90');
    await expect(slider).toHaveAttribute('max', String(defaultRateLimits[1]));
    const v1 = page.getByRole('img', { name: ecgLabel('V1') });
    await expect(v1).toHaveAccessibleDescription(
      en['heartClock.preset.brugada-syndrome.ecg'].replace('{rate}', '90'),
    );
    await expect(page.getByRole('img', { name: ecgLabel('II') })).toHaveCount(0);
    expect((await axe(page).analyze()).violations).toEqual([]);

    // Back to normal: lead II again.
    await choose(page, 'normal');
    await expect(page.getByRole('img', { name: ecgLabel('II') })).toHaveAccessibleDescription(
      /^Sinus rhythm at 90 /,
    );
    await expect(v1).toHaveCount(0);
  });

  test('keep drawing when switched after playing for a while', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (error) => errors.push(error));
    await page.goto('en/heart-clock/');
    await expect(page.getByRole('button', { name: en['heartClock.pause'] })).toBeVisible();
    // Long enough for the clock to drop the beats it started with.
    await page.waitForTimeout(3000);
    await choose(page, 'aortic-stenosis');
    await page.waitForTimeout(500);
    await choose(page, 'stemi');
    await page.waitForTimeout(500);
    expect(errors).toEqual([]);
    await expect(page.locator('[data-phase]')).toBeVisible();
    // The ECG still has dark trace pixels.
    const inked = await page
      .getByRole('img', { name: en['heartClock.ecgLabel'].replace('{lead}', 'II') })
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

  test('stay off when turned off while the player loads', async ({ page }) => {
    // docs/plans/2026-10-14-lazy-sound-players.md: the player's code loads on the first click.
    await page.addInitScript(() => {
      const counter = window as unknown as { startedOscillators: number };
      counter.startedOscillators = 0;
      const start = OscillatorNode.prototype.start;
      OscillatorNode.prototype.start = function (...args: Parameters<OscillatorNode['start']>) {
        counter.startedOscillators += 1;
        return start.apply(this, args);
      };
    });
    let release = () => {};
    const held = new Promise<void>((resolve) => (release = resolve));
    let requested = false;
    await page.route(/\/heart-sounds\.[\w-]+\.js$/, async (route) => {
      requested = true;
      await held;
      await route.continue();
    });
    await page.goto('en/heart-clock/');
    await page.getByRole('button', { name: en['heartClock.soundOn'] }).click();
    await page.getByRole('button', { name: en['heartClock.soundOff'] }).click();
    await expect(page.getByRole('button', { name: en['heartClock.soundOn'] })).toBeVisible();
    expect(requested).toBe(true);
    release();
    await page.waitForTimeout(1500);
    expect(
      await page.evaluate(
        () => (window as unknown as { startedOscillators: number }).startedOscillators,
      ),
    ).toBe(0);
  });
});
