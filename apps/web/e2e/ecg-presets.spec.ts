import { expect, test } from '@playwright/test';
import { MOTION_STORAGE_KEY } from '../src/lib/motion.ts';
import en from '../src/i18n/messages/en.json' with { type: 'json' };
import { axe } from './axe.ts';

// ECG presets in articles that have no 3D model (docs/plans/2026-10-12-more-ecg-presets.md).
// Real articles; the HA_TEST_CONTENT build has fixture articles instead.
const fixtures = process.env['HA_TEST_CONTENT'] === '1';

test('the AV block article shows complete AV block, the pacemaker after treatment and Mobitz I and II', async ({
  page,
}) => {
  test.skip(fixtures, 'needs the production content build');
  await page.goto('en/disease/av-block/');
  // Normal, complete block, its state after treatment, then Mobitz I and II (`morePresets`).
  const conditions = page.getByRole('group', { name: en['heartClock.condition'] });
  await expect(conditions.getByRole('radio')).toHaveCount(5);
  await expect(conditions.getByRole('radio').nth(3)).toHaveAccessibleName(
    en['heartClock.preset.av-block-second-degree-mobitz-1'],
  );
  await expect(conditions.getByRole('radio').nth(4)).toHaveAccessibleName(
    en['heartClock.preset.av-block-second-degree-mobitz-2'],
  );
  await expect(
    conditions.getByRole('radio', {
      name: en['heartClock.preset.av-block-third-degree'],
      exact: true,
    }),
  ).toBeChecked();
  await expect(conditions).toHaveAccessibleDescription(
    en['heartClock.preset.av-block-third-degree.summary'],
  );

  // The island is client:visible: scroll to it and wait for hydration before switching.
  await conditions.scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: en['heartClock.pause'] })).toBeVisible();
  const slider = page.getByRole('slider', { name: en['heartClock.heartRate'] });
  const ecg = page.getByRole('img', { name: en['heartClock.ecgLabel'].replace('{lead}', 'II') });
  await expect(slider).toHaveValue('40');
  await expect(slider).toHaveAttribute('min', '35');
  await expect(slider).toHaveAttribute('max', '50');
  await expect(ecg).toHaveAccessibleDescription(
    en['heartClock.preset.av-block-third-degree.ecg'].replace('{rate}', '40'),
  );
  expect((await axe(page).analyze()).violations).toEqual([]);

  // After treatment: ventricular pacing that follows the P waves.
  await conditions
    .getByRole('radio', { name: en['heartClock.preset.av-block-third-degree-paced'] })
    .check();
  await expect(slider).toHaveValue('75');
  await expect(slider).toHaveAttribute('min', '60');
  await expect(slider).toHaveAttribute('max', '100');
  await expect(conditions).toHaveAccessibleDescription(
    en['heartClock.preset.av-block-third-degree-paced.summary'],
  );
  await expect(ecg).toHaveAccessibleDescription(
    en['heartClock.preset.av-block-third-degree-paced.ecg'].replace('{rate}', '75'),
  );

  // Second-degree block: Mobitz I (growing PR) and Mobitz II (constant PR, dropped QRS).
  await conditions
    .getByRole('radio', {
      name: en['heartClock.preset.av-block-second-degree-mobitz-1'],
      exact: true,
    })
    .check();
  await expect(slider).toHaveValue('60');
  await expect(slider).toHaveAttribute('min', '40');
  await expect(slider).toHaveAttribute('max', '70');
  await expect(conditions).toHaveAccessibleDescription(
    en['heartClock.preset.av-block-second-degree-mobitz-1.summary'],
  );
  await expect(ecg).toHaveAccessibleDescription(
    en['heartClock.preset.av-block-second-degree-mobitz-1.ecg'].replace('{rate}', '60'),
  );
  await conditions
    .getByRole('radio', {
      name: en['heartClock.preset.av-block-second-degree-mobitz-2'],
      exact: true,
    })
    .check();
  await expect(slider).toHaveValue('75');
  await expect(slider).toHaveAttribute('min', '40');
  await expect(slider).toHaveAttribute('max', '180');
  await expect(conditions).toHaveAccessibleDescription(
    en['heartClock.preset.av-block-second-degree-mobitz-2.summary'],
  );
  await expect(ecg).toHaveAccessibleDescription(
    en['heartClock.preset.av-block-second-degree-mobitz-2.ecg'].replace('{rate}', '75'),
  );

  await conditions.getByRole('radio', { name: en['heartClock.preset.normal'] }).check();
  await expect(conditions).toHaveAccessibleDescription(en['heartClock.preset.normal.summary']);
  await expect(ecg).toHaveAccessibleDescription(/^Sinus rhythm at 75 /);
});

test('the SVT article starts at the preset heart rate and normal goes back to 75', async ({
  page,
}) => {
  test.skip(fixtures, 'needs the production content build');
  await page.goto('en/disease/supraventricular-tachycardia/');
  const conditions = page.getByRole('group', { name: en['heartClock.condition'] });
  await expect(conditions.getByRole('radio')).toHaveCount(2);
  await expect(
    conditions.getByRole('radio', { name: en['heartClock.preset.supraventricular-tachycardia'] }),
  ).toBeChecked();
  await expect(conditions).toHaveAccessibleDescription(
    en['heartClock.preset.supraventricular-tachycardia.summary'],
  );

  await conditions.scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: en['heartClock.pause'] })).toBeVisible();
  const slider = page.getByRole('slider', { name: en['heartClock.heartRate'] });
  const ecg = page.getByRole('img', { name: en['heartClock.ecgLabel'].replace('{lead}', 'II') });
  await expect(slider).toHaveValue('170');
  await expect(slider).toHaveAttribute('min', '120');
  await expect(ecg).toHaveAccessibleDescription(/^Supraventricular tachycardia at 170 /);
  expect((await axe(page).analyze()).violations).toEqual([]);

  await conditions.getByRole('radio', { name: en['heartClock.preset.normal'] }).check();
  await expect(slider).toHaveValue('75');
  await expect(slider).toHaveAttribute('min', '40');
  await expect(ecg).toHaveAccessibleDescription(/^Sinus rhythm at 75 /);

  // Back to SVT: the preset sets its rate again, whatever the reader had.
  await slider.fill('90');
  await conditions
    .getByRole('radio', { name: en['heartClock.preset.supraventricular-tachycardia'] })
    .check();
  await expect(slider).toHaveValue('170');
});

test('the long QT article shows a long QT at the reader heart rate', async ({ page }) => {
  test.skip(fixtures, 'needs the production content build');
  await page.goto('en/disease/long-qt-syndrome/');
  const conditions = page.getByRole('group', { name: en['heartClock.condition'] });
  await expect(conditions.getByRole('radio')).toHaveCount(2);
  await expect(
    conditions.getByRole('radio', { name: en['heartClock.preset.long-qt-syndrome'] }),
  ).toBeChecked();
  await expect(conditions).toHaveAccessibleDescription(
    en['heartClock.preset.long-qt-syndrome.summary'],
  );

  await conditions.scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: en['heartClock.pause'] })).toBeVisible();
  const slider = page.getByRole('slider', { name: en['heartClock.heartRate'] });
  const ecg = page.getByRole('img', { name: en['heartClock.ecgLabel'].replace('{lead}', 'II') });
  // The preset keeps the default rate; its long QT does not fit the fastest rates.
  await expect(slider).toHaveValue('75');
  await expect(slider).toHaveAttribute('max', '137');
  await expect(ecg).toHaveAccessibleDescription(/QTc of 500 ms/);
  expect((await axe(page).analyze()).violations).toEqual([]);

  await slider.fill('90');
  await conditions.getByRole('radio', { name: en['heartClock.preset.normal'] }).check();
  await expect(slider).toHaveValue('90');
  await expect(slider).toHaveAttribute('max', '180');
  await expect(ecg).toHaveAccessibleDescription(
    en['heartClock.preset.normal.ecg'].replace('{rate}', '90'),
  );
});

test('the VT article starts at the preset heart rate and normal goes back to 75', async ({
  page,
}) => {
  test.skip(fixtures, 'needs the production content build');
  await page.goto('en/disease/ventricular-tachycardia/');
  const conditions = page.getByRole('group', { name: en['heartClock.condition'] });
  await expect(conditions.getByRole('radio')).toHaveCount(2);
  await expect(
    conditions.getByRole('radio', { name: en['heartClock.preset.ventricular-tachycardia'] }),
  ).toBeChecked();
  await expect(conditions).toHaveAccessibleDescription(
    en['heartClock.preset.ventricular-tachycardia.summary'],
  );

  await conditions.scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: en['heartClock.pause'] })).toBeVisible();
  const slider = page.getByRole('slider', { name: en['heartClock.heartRate'] });
  const ecg = page.getByRole('img', { name: en['heartClock.ecgLabel'].replace('{lead}', 'II') });
  await expect(slider).toHaveValue('150');
  await expect(slider).toHaveAttribute('min', '101');
  await expect(slider).toHaveAttribute('max', '169');
  await expect(ecg).toHaveAccessibleDescription(/^Ventricular tachycardia at 150 /);
  expect((await axe(page).analyze()).violations).toEqual([]);

  await conditions.getByRole('radio', { name: en['heartClock.preset.normal'] }).check();
  await expect(slider).toHaveValue('75');
  await expect(slider).toHaveAttribute('min', '40');
  await expect(ecg).toHaveAccessibleDescription(/^Sinus rhythm at 75 /);
});

test('the VT article keeps the monitor still with motion off', async ({ page }) => {
  test.skip(fixtures, 'needs the production content build');
  await page.addInitScript((key) => localStorage.setItem(key, 'off'), MOTION_STORAGE_KEY);
  await page.goto('en/disease/ventricular-tachycardia/');
  const conditions = page.getByRole('group', { name: en['heartClock.condition'] });
  await conditions.scrollIntoViewIfNeeded();
  const play = page.getByRole('button', { name: en['heartClock.play'], exact: true });
  const ecg = page.getByRole('img', { name: en['heartClock.ecgLabel'].replace('{lead}', 'II') });
  // The text description carries the rhythm while the trace stands still.
  await expect(play).toBeVisible();
  await expect(ecg).toHaveAccessibleDescription(/^Ventricular tachycardia at 150 /);
  // Wait for hydration: the description follows the slider only once the island runs. Changing
  // the rate does not start the clock.
  const slider = page.getByRole('slider', { name: en['heartClock.heartRate'] });
  await expect(async () => {
    await slider.fill('120');
    await expect(ecg).toHaveAccessibleDescription(/^Ventricular tachycardia at 120 /, {
      timeout: 500,
    });
  }).toPass();
  await expect(play).toBeVisible();
  // Switching presets does not start it either.
  await conditions.getByRole('radio', { name: en['heartClock.preset.normal'] }).check();
  await conditions
    .getByRole('radio', { name: en['heartClock.preset.ventricular-tachycardia'] })
    .check();
  await expect(play).toBeVisible();
});

test('the atrial flutter article starts at the preset rate and keeps the F waves in range', async ({
  page,
}) => {
  test.skip(fixtures, 'needs the production content build');
  await page.goto('en/disease/atrial-flutter/');
  // The article also has a normal / disease diagram: look only at the monitor's switch.
  const conditions = page.getByRole('group', { name: en['heartClock.condition'] });
  await expect(conditions.getByRole('radio')).toHaveCount(2);
  await expect(
    conditions.getByRole('radio', { name: en['heartClock.preset.atrial-flutter'] }),
  ).toBeChecked();
  await expect(conditions).toHaveAccessibleDescription(
    en['heartClock.preset.atrial-flutter.summary'],
  );

  await conditions.scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: en['heartClock.pause'] })).toBeVisible();
  const slider = page.getByRole('slider', { name: en['heartClock.heartRate'] });
  const ecg = page.getByRole('img', { name: en['heartClock.ecgLabel'].replace('{lead}', 'II') });
  // 2:1 conduction with F waves at 250–350 per minute: ventricles at 126–175.
  await expect(slider).toHaveValue('150');
  await expect(slider).toHaveAttribute('min', '126');
  await expect(slider).toHaveAttribute('max', '175');
  await expect(ecg).toHaveAccessibleDescription(
    en['heartClock.preset.atrial-flutter.ecg'].replace('{rate}', '150'),
  );
  expect((await axe(page).analyze()).violations).toEqual([]);

  await conditions.getByRole('radio', { name: en['heartClock.preset.normal'] }).check();
  await expect(slider).toHaveValue('75');
  await expect(slider).toHaveAttribute('min', '40');
  await expect(slider).toHaveAttribute('max', '180');
  await expect(ecg).toHaveAccessibleDescription(/^Sinus rhythm at 75 /);
});

test('the sick sinus syndrome article starts below 40 with sinus pauses', async ({ page }) => {
  test.skip(fixtures, 'needs the production content build');
  await page.goto('en/disease/sick-sinus-syndrome/');
  // The article also has a normal / disease diagram: look only at the monitor's switch. The third
  // choice is the state after treatment.
  const conditions = page.getByRole('group', { name: en['heartClock.condition'] });
  await expect(conditions.getByRole('radio')).toHaveCount(3);
  await expect(
    conditions.getByRole('radio', { name: en['heartClock.preset.sick-sinus-syndrome'] }),
  ).toBeChecked();
  await expect(conditions).toHaveAccessibleDescription(
    en['heartClock.preset.sick-sinus-syndrome.summary'],
  );

  await conditions.scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: en['heartClock.pause'] })).toBeVisible();
  const slider = page.getByRole('slider', { name: en['heartClock.heartRate'] });
  const ecg = page.getByRole('img', { name: en['heartClock.ecgLabel'].replace('{lead}', 'II') });
  // The slider goes below the usual 40 only for this preset, and stays below 40.
  await expect(slider).toHaveValue('35');
  await expect(slider).toHaveAttribute('min', '30');
  await expect(slider).toHaveAttribute('max', '39');
  await expect(ecg).toHaveAccessibleDescription(
    en['heartClock.preset.sick-sinus-syndrome.ecg'].replace('{rate}', '35'),
  );
  await expect(ecg).toHaveAccessibleDescription(/pause of 3 seconds with no P wave/);
  expect((await axe(page).analyze()).violations).toEqual([]);

  // After treatment: a pacemaker at its lower rate, with no pauses.
  await conditions
    .getByRole('radio', { name: en['heartClock.preset.sick-sinus-syndrome-paced'] })
    .check();
  await expect(slider).toHaveValue('60');
  await expect(slider).toHaveAttribute('min', '50');
  await expect(slider).toHaveAttribute('max', '70');
  await expect(conditions).toHaveAccessibleDescription(
    en['heartClock.preset.sick-sinus-syndrome-paced.summary'],
  );
  await expect(ecg).toHaveAccessibleDescription(
    en['heartClock.preset.sick-sinus-syndrome-paced.ecg'].replace('{rate}', '60'),
  );

  await conditions.getByRole('radio', { name: en['heartClock.preset.normal'] }).check();
  await expect(slider).toHaveValue('75');
  await expect(slider).toHaveAttribute('min', '40');
  await expect(slider).toHaveAttribute('max', '180');
  await expect(ecg).toHaveAccessibleDescription(/^Sinus rhythm at 75 /);
});

test('the WPW article shows pre-excitation in lead II', async ({ page }) => {
  test.skip(fixtures, 'needs the production content build');
  await page.goto('en/disease/wpw-syndrome/');
  // The article also has a normal / disease diagram: look only at the monitor's switch.
  const conditions = page.getByRole('group', { name: en['heartClock.condition'] });
  await expect(conditions.getByRole('radio')).toHaveCount(2);
  await expect(
    conditions.getByRole('radio', { name: en['heartClock.preset.wpw-syndrome'] }),
  ).toBeChecked();
  await expect(conditions).toHaveAccessibleDescription(
    en['heartClock.preset.wpw-syndrome.summary'],
  );

  await conditions.scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: en['heartClock.pause'] })).toBeVisible();
  const slider = page.getByRole('slider', { name: en['heartClock.heartRate'] });
  const ecg = page.getByRole('img', { name: en['heartClock.ecgLabel'].replace('{lead}', 'II') });
  // The preset keeps the default rate; the delta wave narrows the upper limit.
  await expect(slider).toHaveValue('75');
  await expect(slider).toHaveAttribute('min', '40');
  await expect(slider).toHaveAttribute('max', '153');
  await expect(ecg).toHaveAccessibleDescription(
    en['heartClock.preset.wpw-syndrome.ecg'].replace('{rate}', '75'),
  );
  expect((await axe(page).analyze()).violations).toEqual([]);

  await conditions.getByRole('radio', { name: en['heartClock.preset.normal'] }).check();
  await expect(slider).toHaveValue('75');
  await expect(slider).toHaveAttribute('max', '180');
  await expect(ecg).toHaveAccessibleDescription(/^Sinus rhythm at 75 /);
});

test('the Brugada article compares normal and type 1 in lead V1', async ({ page }) => {
  test.skip(fixtures, 'needs the production content build');
  await page.goto('en/disease/brugada-syndrome/');
  // The article also has a normal / disease diagram: look only at the monitor's switch.
  const conditions = page.getByRole('group', { name: en['heartClock.condition'] });
  await expect(conditions.getByRole('radio')).toHaveCount(2);
  await expect(
    conditions.getByRole('radio', { name: en['heartClock.preset.brugada-syndrome'] }),
  ).toBeChecked();
  await expect(conditions).toHaveAccessibleDescription(
    en['heartClock.preset.brugada-syndrome.summary'],
  );

  await conditions.scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: en['heartClock.pause'] })).toBeVisible();
  const slider = page.getByRole('slider', { name: en['heartClock.heartRate'] });
  const ecg = page.getByRole('img', { name: en['heartClock.ecgLabel'].replace('{lead}', 'V1') });
  await expect(slider).toHaveValue('75');
  await expect(slider).toHaveAttribute('min', '40');
  await expect(slider).toHaveAttribute('max', '180');
  await expect(ecg).toHaveAccessibleDescription(
    en['heartClock.preset.brugada-syndrome.ecg'].replace('{rate}', '75'),
  );
  expect((await axe(page).analyze()).violations).toEqual([]);

  // Normal is drawn in the same lead, so the reader compares V1 with V1.
  await conditions.getByRole('radio', { name: en['heartClock.preset.normal'] }).check();
  await expect(ecg).toHaveAccessibleDescription(/^Sinus rhythm at 75 /);
  await expect(
    page.getByRole('img', { name: en['heartClock.ecgLabel'].replace('{lead}', 'II') }),
  ).toHaveCount(0);
});

test('the extrasystole article shows ventricular and atrial premature beats', async ({ page }) => {
  test.skip(fixtures, 'needs the production content build');
  await page.goto('en/disease/extrasystole/');
  // Normal, ventricular premature beats (`preset`), then atrial (`morePresets`).
  const conditions = page.getByRole('group', { name: en['heartClock.condition'] });
  await expect(conditions.getByRole('radio')).toHaveCount(3);
  await expect(conditions.getByRole('radio').nth(1)).toHaveAccessibleName(
    en['heartClock.preset.ventricular-premature-beats'],
  );
  await expect(conditions.getByRole('radio').nth(2)).toHaveAccessibleName(
    en['heartClock.preset.atrial-premature-beats'],
  );
  await expect(
    conditions.getByRole('radio', {
      name: en['heartClock.preset.ventricular-premature-beats'],
      exact: true,
    }),
  ).toBeChecked();
  await expect(conditions).toHaveAccessibleDescription(
    en['heartClock.preset.ventricular-premature-beats.summary'],
  );

  await conditions.scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: en['heartClock.pause'] })).toBeVisible();
  const slider = page.getByRole('slider', { name: en['heartClock.heartRate'] });
  const ecg = page.getByRole('img', { name: en['heartClock.ecgLabel'].replace('{lead}', 'II') });
  await expect(slider).toHaveValue('75');
  await expect(slider).toHaveAttribute('min', '40');
  await expect(slider).toHaveAttribute('max', '86');
  await expect(ecg).toHaveAccessibleDescription(
    en['heartClock.preset.ventricular-premature-beats.ecg'].replace('{rate}', '75'),
  );
  expect((await axe(page).analyze()).violations).toEqual([]);

  await conditions
    .getByRole('radio', { name: en['heartClock.preset.atrial-premature-beats'], exact: true })
    .check();
  await expect(conditions).toHaveAccessibleDescription(
    en['heartClock.preset.atrial-premature-beats.summary'],
  );
  await expect(slider).toHaveValue('75');
  await expect(slider).toHaveAttribute('min', '40');
  await expect(slider).toHaveAttribute('max', '86');
  await expect(ecg).toHaveAccessibleDescription(
    en['heartClock.preset.atrial-premature-beats.ecg'].replace('{rate}', '75'),
  );
});

test('the corrected transposition article shows complete AV block without the Wiggers diagram', async ({
  page,
}) => {
  test.skip(fixtures, 'needs the production content build');
  await page.goto('en/disease/congenitally-corrected-transposition/');
  // Normal and complete AV block (`preset`); `afterTreatment: false` leaves the pacemaker out.
  const conditions = page.getByRole('group', { name: en['heartClock.condition'] });
  await expect(conditions.getByRole('radio')).toHaveCount(2);
  await expect(
    conditions.getByRole('radio', { name: en['heartClock.preset.av-block-third-degree'] }),
  ).toBeChecked();
  await expect(conditions).toHaveAccessibleDescription(
    en['heartClock.preset.av-block-third-degree.summary'],
  );

  await conditions.scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: en['heartClock.pause'] })).toBeVisible();
  const slider = page.getByRole('slider', { name: en['heartClock.heartRate'] });
  await expect(slider).toHaveValue('40');
  await expect(slider).toHaveAttribute('min', '35');
  await expect(slider).toHaveAttribute('max', '50');
  expect((await axe(page).analyze()).violations).toEqual([]);
  // The Wiggers diagram draws the left ventricle pumping to the body; here the right one does.
  await expect(page.getByRole('img', { name: en['heartClock.wiggers.label'] })).toHaveCount(0);
  await expect(page.getByText(en['heartClock.wiggers.title'])).toHaveCount(0);
});

test('the bundle branch block article shows right, left and anterior fascicular block', async ({
  page,
}) => {
  test.skip(fixtures, 'needs the production content build');
  await page.goto('en/disease/bundle-branch-block/');
  // Normal, right bundle branch block (`preset`), then left and anterior fascicular block
  // (`morePresets`). The article's diagram has its own radios, so scope to the clock's group.
  const conditions = page.getByRole('group', { name: en['heartClock.condition'] });
  await expect(conditions.getByRole('radio')).toHaveCount(4);
  await expect(conditions.getByRole('radio').nth(2)).toHaveAccessibleName(
    en['heartClock.preset.left-bundle-branch-block'],
  );
  await expect(conditions.getByRole('radio').nth(3)).toHaveAccessibleName(
    en['heartClock.preset.left-anterior-fascicular-block'],
  );
  await expect(
    conditions.getByRole('radio', { name: en['heartClock.preset.right-bundle-branch-block'] }),
  ).toBeChecked();
  await expect(conditions).toHaveAccessibleDescription(
    en['heartClock.preset.right-bundle-branch-block.summary'],
  );

  await conditions.scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: en['heartClock.pause'] })).toBeVisible();
  await conditions
    .getByRole('radio', { name: en['heartClock.preset.left-bundle-branch-block'] })
    .check();
  await expect(conditions).toHaveAccessibleDescription(
    en['heartClock.preset.left-bundle-branch-block.summary'],
  );
  expect((await axe(page).analyze()).violations).toEqual([]);
});

test('the Chagas article shows both early conduction blocks without the Wiggers diagram', async ({
  page,
}) => {
  test.skip(fixtures, 'needs the production content build');
  await page.goto('en/disease/chagas-cardiomyopathy/');
  // Normal, right bundle branch block (`preset`) and anterior fascicular block (`morePresets`):
  // the two conduction blocks the article names as the usual start of Chagas heart disease.
  const conditions = page.getByRole('group', { name: en['heartClock.condition'] });
  await expect(conditions.getByRole('radio')).toHaveCount(3);
  await expect(
    conditions.getByRole('radio', { name: en['heartClock.preset.right-bundle-branch-block'] }),
  ).toBeChecked();
  await expect(conditions.getByRole('radio').nth(2)).toHaveAccessibleName(
    en['heartClock.preset.left-anterior-fascicular-block'],
  );

  await conditions.scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: en['heartClock.pause'] })).toBeVisible();
  expect((await axe(page).analyze()).violations).toEqual([]);
  // The block presets keep a normal pump; the cardiomyopathy in this article does not.
  await expect(page.getByRole('img', { name: en['heartClock.wiggers.label'] })).toHaveCount(0);
  await expect(page.getByText(en['heartClock.wiggers.title'])).toHaveCount(0);
});
