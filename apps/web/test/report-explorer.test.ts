import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import Cite from '../src/components/Cite.astro';
import ReportExplorer from '../src/components/report/ReportExplorer.astro';
import ReportSection from '../src/components/report/ReportSection.astro';
import ReportTerm from '../src/components/report/ReportTerm.astro';
import { localeCodes } from '../src/i18n/locales.ts';
import { getMessages } from '../src/i18n/messages.ts';
import en from '../src/i18n/messages/en.json';

// Unit tests run without a synced content store, so the articles collection is a fixture here:
// one English article, as on a Russian page that falls back to English text.
vi.mock('astro:content', () => ({
  getEntry: (collection: string, id: string) =>
    Promise.resolve(
      collection === 'articles' && id === 'en/disease/heart-failure'
        ? { id, data: { title: 'Heart failure' } }
        : undefined,
    ),
}));

const articleLocals = {
  locale: 'ru',
  sourceCount: 2,
  article: { locale: 'en', type: 'diagnostic', slug: 'echocardiography' },
};

let container: AstroContainer;
let cite: string;
beforeAll(async () => {
  container = await AstroContainer.create();
  cite = await container.renderToString(Cite, { props: { n: 1 }, locals: articleLocals });
});

describe('ReportExplorer', () => {
  it('titles the sample and marks it as made up, in the page locale', async () => {
    const html = await container.renderToString(ReportExplorer, {
      locals: articleLocals,
      slots: { default: 'Sections' },
    });
    const t = getMessages('ru');
    expect(html).toContain('aria-labelledby="report-echocardiography"');
    expect(html).toMatch(/<h3 id="report-echocardiography" lang="ru"[^>]*>/);
    expect(html).toContain(t['report.title']);
    expect(html).toMatch(/role="note" lang="ru"/);
    expect(html).toContain(t['report.fictional']);
    expect(html).toContain('Sections');
  });

  it('fails the build outside an article page', async () => {
    await expect(
      container.renderToString(ReportExplorer, { locals: { locale: 'en' } }),
    ).rejects.toThrow('<ReportExplorer> works only on article pages');
  });
});

describe('ReportSection', () => {
  it('heads a list of terms', async () => {
    const html = await container.renderToString(ReportSection, {
      props: { title: 'Left ventricle' },
      slots: { default: '<li>Term</li>' },
    });
    expect(html).toMatch(/<h4[^>]*>Left ventricle<\/h4>/);
    expect(html).toMatch(/<ul class="report-terms"[^>]*role="list"/);
    expect(html).toContain('<li>Term</li>');
  });
});

describe('ReportTerm', () => {
  const render = (props: Record<string, unknown>, explanation = `<p>Text.${cite}</p>`) =>
    container.renderToString(ReportTerm, {
      props,
      locals: articleLocals,
      slots: { default: explanation },
    });

  it('shows the term with a captioned placeholder and the explanation under details', async () => {
    const html = await render({ term: 'Ejection fraction' });
    expect(html).toMatch(/<details[^>]*>(?:\s|<!--[\s\S]*?-->)*<summary/);
    expect(html).toContain('Ejection fraction');
    expect(html).toContain('…');
    expect(html).toMatch(/lang="ru"[^>]*>\(значение в образце не указано\)/);
    expect(html).toMatch(/class="report-explanation"[^>]*data-pagefind-ignore/);
    expect(html).toContain('href="#source-1"');
    expect(html).not.toContain('report-more');
  });

  it('links to the article in the page locale, titled in the language of the text', async () => {
    const html = await render({ term: 'Ejection fraction', article: 'disease/heart-failure' });
    expect(html).toContain(`href="${import.meta.env.BASE_URL}ru/disease/heart-failure/"`);
    expect(html).toMatch(/<span lang="ru"[^>]*>Подробнее: <\/span>Heart failure<\/a>/);
  });

  it('fails the build without a <Cite> in the explanation', async () => {
    await expect(render({ term: 'Ejection fraction' }, '<p>No source.</p>')).rejects.toThrow(
      '<ReportTerm term="Ejection fraction">: the explanation needs at least one <Cite>',
    );
  });

  it('fails the build on a number in the sample line', async () => {
    await expect(render({ term: 'LVEF 40' })).rejects.toThrow(
      '<ReportTerm term="LVEF 40">: the sample line has no numbers',
    );
  });

  it('fails the build on an article that does not exist in the language of the text', async () => {
    await expect(render({ term: 'Effusion', article: 'disease/no-such-article' })).rejects.toThrow(
      'no article en/disease/no-such-article',
    );
  });
});

describe('the report sample', () => {
  it('has no script: terms open with native details', async () => {
    const term = await container.renderToString(ReportTerm, {
      props: { term: 'Ejection fraction', article: 'disease/heart-failure' },
      locals: articleLocals,
      slots: { default: `<p>Text.${cite}</p>` },
    });
    const section = await container.renderToString(ReportSection, {
      props: { title: 'Left ventricle' },
      slots: { default: term },
    });
    const html = await container.renderToString(ReportExplorer, {
      locals: articleLocals,
      slots: { default: section },
    });
    expect(html).toContain('Ejection fraction');
    for (const part of [term, section, html]) expect(part).not.toContain('<script');
  });

  it('has its UI strings in every locale', () => {
    const keys = ['report.fictional', 'report.more', 'report.placeholder', 'report.title'];
    expect(Object.keys(en).filter((key) => key.startsWith('report.'))).toEqual(keys);
    expect(en['report.more']).toContain('{title}');
    for (const locale of localeCodes) {
      const t = getMessages(locale);
      for (const key of keys) expect(t[key as keyof typeof en], `${locale} ${key}`).toBeTruthy();
      expect(t['report.more']).toContain('{title}');
    }
  });
});
