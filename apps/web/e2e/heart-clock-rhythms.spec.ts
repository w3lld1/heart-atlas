import { expect, test } from '@playwright/test';
import en from '../src/i18n/messages/en.json' with { type: 'json' };
import { axe } from './axe.ts';

// Rhythm parameters before any preset uses them (docs/plans/2026-10-13-heart-clock-rhythms.md),
// on a page that only the HA_TEST_CONTENT=1 build has.
test.skip(process.env['HA_TEST_CONTENT'] !== '1', 'needs the HA_TEST_CONTENT=1 build');

test('shows sinus pauses, a V1 strip with a delta wave and a coved ST, and flutter, without errors', async ({
  page,
}) => {
  const errors: Error[] = [];
  page.on('pageerror', (error) => errors.push(error));
  await page.goto('en/test/heart-clock/');
  const pauses = page.locator('[data-test="pauses"]');
  const v1 = page.locator('[data-test="v1"]');
  await expect(pauses.getByRole('button', { name: en['heartClock.pause'] })).toBeVisible();

  // A pause of 2 s after every second beat at 60 bpm: the phase line reaches it within a cycle.
  const phase = pauses.locator('[data-phase]');
  await expect
    .poll(async () => phase.getAttribute('data-phase'), { timeout: 8000, intervals: [50] })
    .toBe('pause');
  await expect(phase).toHaveText(en['heartClock.phase.pause']);

  await expect(
    pauses.getByRole('img', { name: en['heartClock.ecgLabel'].replace('{lead}', 'II') }),
  ).toBeVisible();
  await expect(
    v1.getByRole('img', { name: en['heartClock.ecgLabel'].replace('{lead}', 'V1') }),
  ).toBeVisible();
  await expect(
    page
      .locator('[data-test="flutter"]')
      .getByRole('img', { name: en['heartClock.ecgLabel'].replace('{lead}', 'II') }),
  ).toBeVisible();
  expect((await axe(page).analyze()).violations).toEqual([]);
  expect(errors).toEqual([]);
});

test('runs without the Wiggers diagram and switches presets', async ({ page }) => {
  const errors: Error[] = [];
  page.on('pageerror', (error) => errors.push(error));
  await page.goto('en/test/heart-clock/');
  const clock = page.locator('[data-test="no-wiggers"]');
  await expect(clock.getByRole('button', { name: en['heartClock.pause'] })).toBeVisible();
  await expect(clock.getByText(en['heartClock.wiggers.title'])).toHaveCount(0);
  await expect(clock.getByRole('img', { name: en['heartClock.wiggers.label'] })).toHaveCount(0);
  await expect(clock.getByText(en['heartClock.wiggers.description'])).toHaveCount(0);
  await clock.getByRole('radio', { name: en['heartClock.preset.normal'], exact: true }).check();
  await expect(clock.getByText(en['heartClock.preset.normal.summary'])).toBeVisible();
  await expect(clock.locator('[data-phase]')).not.toBeEmpty();
  expect(errors).toEqual([]);
});

test('shows leads I, II and III for a lead II preset and one V1 strip for Brugada', async ({
  page,
}) => {
  const errors: Error[] = [];
  page.on('pageerror', (error) => errors.push(error));
  await page.goto('en/test/heart-clock/');
  const clock = page.locator('[data-test="limb-leads"]');
  const strip = (lead: string) =>
    clock.getByRole('img', { name: en['heartClock.ecgLabel'].replace('{lead}', lead) });
  for (const lead of ['I', 'II', 'III']) await expect(strip(lead)).toBeVisible();
  await expect(clock.locator('canvas')).toHaveCount(3);
  // The island sizes every strip in device pixels once it draws: limb strips are 25 mm (100 CSS
  // pixels), a single strip 32 mm (128). A canvas nobody drew keeps the default 150.
  const heightOf = (lead: string) =>
    strip(lead).evaluate((c: HTMLCanvasElement) => c.height / window.devicePixelRatio);
  for (const lead of ['I', 'II', 'III']) await expect.poll(() => heightOf(lead)).toBe(100);

  const radio = (id: 'normal' | 'brugada-syndrome') =>
    clock.getByRole('radio', { name: en[`heartClock.preset.${id}`], exact: true });
  await radio('brugada-syndrome').check();
  await expect(clock.locator('canvas')).toHaveCount(1);
  await expect.poll(() => heightOf('V1')).toBe(128);

  // And back: the three strips come back and are drawn again.
  await radio('normal').check();
  await expect(clock.locator('canvas')).toHaveCount(3);
  for (const lead of ['I', 'II', 'III']) await expect.poll(() => heightOf(lead)).toBe(100);
  expect((await axe(page).analyze()).violations).toEqual([]);
  expect(errors).toEqual([]);
});
