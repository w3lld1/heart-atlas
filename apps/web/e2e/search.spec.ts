import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { axe } from './axe.ts';

const messages = (locale: string): Record<string, string> =>
  JSON.parse(
    readFileSync(new URL(`../src/i18n/messages/${locale}.json`, import.meta.url), 'utf8'),
  ) as Record<string, string>;

// A word from each locale's home page text (home.intro in messages/<locale>.json).
const queries: Record<string, string> = { ru: 'анатомия', en: 'anatomy' };

for (const [locale, query] of Object.entries(queries)) {
  test.describe(`search (${locale})`, () => {
    test('header form opens the search page with results', async ({ page, baseURL }) => {
      await page.goto(`${locale}/`);
      const form = page.getByRole('search');
      await form.getByRole('searchbox').fill(query);
      await form.getByRole('searchbox').press('Enter');
      await expect(page).toHaveURL(new RegExp(`/${locale}/search/\\?q=`));

      const result = page.locator('.pagefind-ui__result-link').first();
      await expect(result).toBeVisible();
      await expect(page.getByRole('search')).toHaveCount(1);
      const href = await result.getAttribute('href');
      expect(href?.startsWith(`${new URL(baseURL ?? '').pathname}${locale}/`)).toBe(true);
    });

    test('indexes only pages of its own language', async ({ page, baseURL }) => {
      // Pagefind can still match a foreign word loosely (for example a one-letter
      // word in an article), so the check is that no result leaves this locale.
      const other = Object.entries(queries).find(([code]) => code !== locale)?.[1] ?? '';
      const searching = (messages(locale)['search.ui.searching'] ?? '').replace(
        '[SEARCH_TERM]',
        other,
      );
      await page.goto(`${locale}/search/?q=${encodeURIComponent(other)}`);
      const message = page.locator('.pagefind-ui__message');
      await expect(message).toContainText(other);
      // Waits for the final message, not the transient "searching" one.
      await expect(message).not.toHaveText(searching);
      const prefix = `${new URL(baseURL ?? '').pathname}${locale}/`;
      const hrefs = await page
        .locator('.pagefind-ui__result-link')
        .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));
      for (const href of hrefs) expect(href.startsWith(prefix)).toBe(true);
    });

    test('search page has no axe violations', async ({ page }) => {
      await page.goto(`${locale}/search/?q=${encodeURIComponent(query)}`);
      await expect(page.locator('.pagefind-ui__result').first()).toBeVisible();
      const results = await axe(page).analyze();
      expect(results.violations).toEqual([]);
    });
  });
}

test.describe('search synonyms', () => {
  test.skip(process.env['HA_TEST_CONTENT'] !== '1', 'needs the HA_TEST_CONTENT=1 build');

  test('a synonym from aliases finds the article without showing on the page', async ({ page }) => {
    // aliases of test/fixtures/site-content/ru/disease/test-condition.mdx; the words appear
    // nowhere else in the article.
    await page.goto(`ru/search/?q=${encodeURIComponent('вымышленный синдром')}`);
    await expect(
      page.locator('.pagefind-ui__result-link[href$="/ru/disease/test-condition/"]'),
    ).toBeVisible();

    await page.goto('ru/disease/test-condition/');
    const aliases = page.getByText('вымышленный синдром');
    await expect(aliases).toBeAttached();
    await expect(aliases).toBeHidden();
  });
});
