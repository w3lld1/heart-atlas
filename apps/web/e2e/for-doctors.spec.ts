import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { localeCodes, productionLocales } from '../src/i18n/locales.ts';
import { axe } from './axe.ts';

// The page for physicians: docs/plans/2026-10-14-editorial-carry-over.md.

const messages = (locale: string): Record<string, string> => {
  const file =
    locale in productionLocales
      ? `../src/i18n/messages/${locale}.json`
      : `../test/fixtures/i18n/${locale}.json`;
  return JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8')) as Record<string, string>;
};
const text = (locale: string, key: string): string => messages(locale)[key] ?? key;

for (const locale of localeCodes) {
  const t = (key: string) => text(locale, key);

  test(`for doctors page (${locale}) is linked from the footer and has no axe violations`, async ({
    page,
  }) => {
    await page.goto(`${locale}/`);
    await page
      .getByRole('contentinfo')
      .getByRole('link', { name: t('doctors.title') })
      .click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/for-doctors/$`));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(t('doctors.title'));
    await expect(page.getByRole('link', { name: t('doctors.offer') }).first()).toHaveAttribute(
      'href',
      /\/issues\/new\?template=physician\.yml$/,
    );
    await expect(page.getByRole('link', { name: t('review.report') })).toHaveAttribute(
      'href',
      /\/issues\/new\?template=content-error\.yml$/,
    );
    const results = await axe(page).analyze();
    expect(results.violations).toEqual([]);
  });
}
