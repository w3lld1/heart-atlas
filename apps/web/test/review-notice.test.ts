import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import ReviewNotice from '../src/components/ReviewNotice.astro';

const pageUrl = 'https://w3lld1.github.io/heart-atlas/en/disease/example/';

async function render(props: Record<string, unknown>) {
  const container = await AstroContainer.create();
  return container.renderToString(ReviewNotice, { props: { pageUrl, ...props } });
}

describe('ReviewNotice', () => {
  it('shows the notice and a prefilled error report while review is null', async () => {
    const html = await render({ locale: 'en', review: null });
    expect(html).toContain('Not reviewed by a physician.');
    const href = /href="([^"]+)"/.exec(html)?.[1]?.replaceAll('&amp;', '&');
    const url = new URL(href ?? '');
    expect(url.origin + url.pathname).toBe('https://github.com/w3lld1/heart-atlas/issues/new');
    expect(url.searchParams.get('template')).toBe('content-error.yml');
    expect(url.searchParams.get('page')).toBe(pageUrl);
  });

  it('uses the reader locale', async () => {
    expect(await render({ locale: 'ru', review: null })).toContain('Врачом не проверено.');
  });

  it('keeps only the error report link once a physician has reviewed the article', async () => {
    const html = await render({
      locale: 'en',
      review: { reviewer: 'Fixture Reviewer', date: new Date('2026-10-11') },
    });
    expect(html).not.toContain('review-notice');
    expect(html).not.toContain('Not reviewed');
    expect(html).toContain('template=content-error.yml');
  });
});
