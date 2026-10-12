import { expect, test } from '@playwright/test';
import en from '../src/i18n/messages/en.json' with { type: 'json' };
import { axe } from './axe.ts';

// ECG presets in articles that have no 3D model (docs/plans/2026-10-12-more-ecg-presets.md).
// Real articles; the HA_TEST_CONTENT build has fixture articles instead.
const fixtures = process.env['HA_TEST_CONTENT'] === '1';

test('the AV block article switches between normal and first-degree AV block', async ({ page }) => {
  test.skip(fixtures, 'needs the production content build');
  await page.goto('en/disease/av-block/');
  const conditions = page.getByRole('group', { name: en['heartClock.condition'] });
  await expect(conditions.getByRole('radio')).toHaveCount(2);
  await expect(
    conditions.getByRole('radio', { name: en['heartClock.preset.av-block-first-degree'] }),
  ).toBeChecked();
  await expect(conditions).toHaveAccessibleDescription(
    en['heartClock.preset.av-block-first-degree.summary'],
  );

  // The island is client:visible: scroll to it and wait for hydration before switching.
  await conditions.scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: en['heartClock.pause'] })).toBeVisible();
  const ecg = page.getByRole('img', { name: en['heartClock.ecgLabel'] });
  await expect(ecg).toHaveAccessibleDescription(/long PR interval of more than 0\.20 s/);
  expect((await axe(page).analyze()).violations).toEqual([]);
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
  const ecg = page.getByRole('img', { name: en['heartClock.ecgLabel'] });
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
