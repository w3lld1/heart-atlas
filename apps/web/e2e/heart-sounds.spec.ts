import { expect, test, type Page } from '@playwright/test';
import { productionLocales } from '../src/i18n/locales.ts';
import en from '../src/i18n/messages/en.json' with { type: 'json' };
import { axe } from './axe.ts';

// The heart sounds page: docs/plans/2026-10-13-heart-sounds.md.

/** Waits until the client:visible player has hydrated, so its controls respond. */
async function hydrated(page: Page) {
  const island = page.locator('astro-island').filter({ has: page.locator('svg[data-sound]') });
  await island.scrollIntoViewIfNeeded();
  await expect(island).not.toHaveAttribute('ssr', /.*/);
}

for (const locale of Object.keys(productionLocales)) {
  test(`heart sounds page (${locale}) is linked from the heart clock and has no axe violations`, async ({
    page,
  }) => {
    await page.goto(`${locale}/heart-clock/`);
    await page.locator('main a[href$="/heart-sounds/"]').click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/heart-sounds/$`));
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('svg[role="img"]')).toHaveAccessibleDescription(/\S/);
    const results = await axe(page).analyze();
    expect(results.violations).toEqual([]);
  });
}

test('switching the sound redraws the diagram and its description', async ({ page }) => {
  await page.goto('en/heart-sounds/');
  await hydrated(page);
  const choices = page.getByRole('group', { name: en['heartSounds.choose'] });
  await expect(choices.getByRole('radio')).toHaveCount(6);
  await expect(choices.getByRole('radio', { name: en['heartSounds.sound.normal'] })).toBeChecked();
  const diagram = page.getByRole('img', {
    name: en['heartSounds.diagramLabel'].replace('{sound}', en['heartSounds.sound.normal']),
  });
  await expect(diagram.locator('polygon')).toHaveCount(0);

  await choices.getByRole('radio', { name: en['heartSounds.sound.mitral-stenosis'] }).check();
  const stenosis = page.getByRole('img', {
    name: en['heartSounds.diagramLabel'].replace(
      '{sound}',
      en['heartSounds.sound.mitral-stenosis'],
    ),
  });
  await expect(stenosis).toHaveAccessibleDescription(
    en['heartSounds.sound.mitral-stenosis.description'],
  );
  // The presystolic and the diastolic part of the rumble, and the opening snap.
  await expect(stenosis.locator('polygon[data-timbre="rumble"]')).toHaveCount(2);
  await expect(stenosis.locator('[data-tone="opening-snap"]')).toHaveCount(1);
});

test('plays only on request, and the cursor follows the sound', async ({ page }) => {
  await page.goto('en/heart-sounds/');
  await hydrated(page);
  const listen = page.getByRole('button', { name: en['heartSounds.listen'] });
  await expect(listen).toBeVisible();
  const cursor = page.locator('svg[data-sound] line').last();
  await expect(cursor).toHaveAttribute('visibility', 'hidden');

  await listen.click();
  const stop = page.getByRole('button', { name: en['heartSounds.stop'] });
  await expect(stop).toBeVisible();
  await expect(cursor).toHaveAttribute('visibility', 'visible');
  const at = async () => (await cursor.getAttribute('transform')) ?? '';
  const first = await at();
  await expect.poll(at).not.toBe(first);

  await stop.click();
  await expect(listen).toBeVisible();
  await expect(cursor).toHaveAttribute('visibility', 'hidden');
});

test('keeps the cursor still with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('en/heart-sounds/');
  await hydrated(page);
  await page.getByRole('button', { name: en['heartSounds.listen'] }).click();
  await expect(page.getByRole('button', { name: en['heartSounds.stop'] })).toBeVisible();
  await expect(page.locator('svg[data-sound] line').last()).toHaveAttribute('visibility', 'hidden');
});
