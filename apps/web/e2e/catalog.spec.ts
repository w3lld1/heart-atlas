import { expect, test } from '@playwright/test';
import ru from '../src/i18n/messages/ru.json' with { type: 'json' };
import { axe } from './axe.ts';

// The disease catalogue: groups, cards and the filter. Spec:
// docs/plans/2026-10-13-disease-catalog.md.
test.describe('disease catalogue', () => {
  test('groups the diseases and filters them as you type', async ({ page }) => {
    // The fixture content build has two test articles and no real groups.
    test.skip(process.env['HA_TEST_CONTENT'] === '1', 'needs the production content build');
    await page.goto('ru/disease/');
    const nav = page.getByRole('navigation', { name: ru['catalog.groups'] });
    await expect(
      nav.getByRole('link', { name: new RegExp(ru['catalog.group.valves']) }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { level: 2, name: ru['catalog.group.rhythm'] }),
    ).toBeVisible();

    const cards = page.locator('[data-catalog-card]:visible');
    const total = await cards.count();
    const filter = page.getByRole('searchbox', { name: ru['catalog.filter.label'] });
    await filter.fill('Тетрада Фалло');
    await expect(cards).toHaveCount(1);
    await expect(
      page.getByRole('heading', { level: 2, name: ru['catalog.group.rhythm'] }),
    ).toBeHidden();
    await expect(page.locator('[data-catalog-status]')).toHaveText(
      ru['catalog.filter.found'].replace('{count}', '1'),
    );

    await filter.fill('нет такой болезни');
    await expect(cards).toHaveCount(0);
    await expect(page.getByText(ru['catalog.filter.empty'])).toBeVisible();
    await expect(page.getByRole('link', { name: ru['catalog.filter.searchAll'] })).toHaveAttribute(
      'href',
      /search\/\?q=/,
    );

    await filter.fill('');
    await expect(cards).toHaveCount(total);
  });

  test('has no axe violations', async ({ page }) => {
    await page.goto('ru/disease/');
    expect((await axe(page).analyze()).violations).toEqual([]);
    await page.emulateMedia({ colorScheme: 'dark' });
    expect((await axe(page).analyze()).violations).toEqual([]);
  });
});

test.describe('disease catalogue without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('shows every card and no filter', async ({ page }) => {
    await page.goto('ru/disease/');
    await expect(page.getByRole('searchbox', { name: ru['catalog.filter.label'] })).toBeHidden();
    await expect(page.locator('[data-catalog-card]:visible').first()).toBeVisible();
    expect(await page.locator('[data-catalog-card]:visible').count()).toBe(
      await page.locator('[data-catalog-card]').count(),
    );
  });
});
