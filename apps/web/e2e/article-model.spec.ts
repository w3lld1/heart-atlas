import { readdirSync, readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import en from '../src/i18n/messages/en.json' with { type: 'json' };
import { axe } from './axe.ts';

// Headless Chromium has WebGL only through SwiftShader, which recent versions enable on request.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
test.use({
  launchOptions: {
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    ...(executablePath ? { executablePath } : {}),
  },
});

const LOAD = { timeout: 30_000 };

/**
 * `<section>/<slug>` and highlighted structure ids of the English articles in these sections, and
 * the articles with a <HeartModel> whose highlight list could not be read.
 */
function highlightedArticles(sections: string[]): {
  pages: (readonly [string, string[]])[];
  unparsed: string[];
} {
  const unparsed: string[] = [];
  const pages = sections.flatMap((section) => {
    const dir = new URL(`../../../content/en/${section}/`, import.meta.url);
    return readdirSync(dir)
      .filter((file) => file.endsWith('.mdx'))
      .sort()
      .flatMap((file) => {
        const source = readFileSync(new URL(file, dir), 'utf8');
        const list = /<HeartModel\b[^>]*?\bhighlight=\{\[([^\]]*)\]\}/s.exec(source)?.[1];
        const path = `${section}/${file.slice(0, -'.mdx'.length)}`;
        if (list === undefined) {
          if (/<HeartModel\b/.test(source)) unparsed.push(path);
          return [];
        }
        const ids = [...list.matchAll(/'([^']+)'|"([^"]+)"/g)].map((m) => m[1] ?? m[2] ?? '');
        return [[path, ids] as const];
      });
  });
  return { pages, unparsed };
}

// docs/plans/2026-10-12-article-interactivity.md: the 3D model with highlights inside articles.
test.describe('3D model in an article without signs on the model', () => {
  test.skip(process.env['HA_TEST_CONTENT'] === '1', 'needs the production content build');

  // Every disease and diagnostic article with a <HeartModel highlight={[...]}>, read from its
  // source, so a new article needs no line here.
  const { pages, unparsed } = highlightedArticles(['disease', 'diagnostic']);
  test('reads the highlights of every article with the model', () => {
    expect(pages.length).toBeGreaterThan(0);
    expect(unparsed, 'articles whose <HeartModel highlight={[...]}> could not be read').toEqual([]);
  });
  for (const [path, ids] of pages) {
    test(`${path} highlights the place the article names`, async ({ page }) => {
      expect(ids).not.toHaveLength(0);
      await page.goto(`en/${path}/`);
      const load = page.getByRole('button', { name: en['viewer.load'] });
      await load.scrollIntoViewIfNeeded();
      await expect(page.locator('astro-island', { has: load })).not.toHaveAttribute('ssr');
      const selected = page.getByText(`${en['viewer.selected']}:`).locator('..');
      for (const id of ids) {
        const name = en[`structure.${id}` as keyof typeof en];
        expect(name, `structure.${id}`).toBeTruthy();
        await expect(selected).toContainText(name);
      }
      expect((await axe(page).analyze()).violations).toEqual([]);
    });
  }

  test('a structure word in a diagram caption highlights it on the model', async ({ page }) => {
    await page.goto('en/disease/av-block/');
    // The ECG monitor's preset switch has a "Normal" radio too.
    await page
      .getByRole('group', { name: en['diagram.state'] })
      .getByRole('radio', { name: en['diagram.state.normal'] })
      .check();
    await page.getByRole('button', { name: /^atrioventricular node/ }).click();
    const selected = page.getByText(`${en['viewer.selected']}:`).locator('..');
    await expect(selected).toContainText(en['structure.av-node']);
    await expect(selected).not.toContainText(en['structure.left-bundle-branch']);
  });
});

test.describe('3D model in an anatomy article', () => {
  // Real articles; the HA_TEST_CONTENT build has fixture articles instead.
  test.skip(process.env['HA_TEST_CONTENT'] === '1', 'needs the production content build');

  test('highlights the structures of the article and loads on click', async ({ page }) => {
    await page.goto('en/anatomy/heart-valves/');
    const load = page.getByRole('button', { name: en['viewer.load'] });
    await load.scrollIntoViewIfNeeded();
    await expect(page.locator('astro-island', { has: load })).not.toHaveAttribute('ssr');
    const selected = page.getByText(`${en['viewer.selected']}:`).locator('..');
    for (const id of ['tricuspid-valve', 'pulmonary-valve', 'mitral-valve', 'aortic-valve']) {
      await expect(selected).toContainText(en[`structure.${id}` as keyof typeof en]);
    }
    expect((await axe(page).analyze()).violations).toEqual([]);
    await load.click();
    const model = page.getByRole('application', { name: en['viewer.canvasLabel'] });
    await expect(model).toHaveAttribute('aria-busy', 'false', LOAD);
    expect((await axe(page).analyze()).violations).toEqual([]);
  });

  test('beats with the ECG monitor of the cardiac cycle article', async ({ page }) => {
    test.slow();
    await page.goto('en/anatomy/cardiac-cycle/');
    const load = page.getByRole('button', { name: en['viewer.load'] });
    await load.scrollIntoViewIfNeeded();
    await expect(page.locator('astro-island', { has: load })).not.toHaveAttribute('ssr');
    await load.click();
    const model = page.getByRole('application', { name: en['viewer.canvasLabel'] });
    await expect(model).toHaveAttribute('aria-busy', 'false', LOAD);
    expect((await axe(page).analyze()).violations).toEqual([]);
  });

  test('a structure word in the text highlights it on the model', async ({ page }) => {
    await page.goto('en/anatomy/heart-valves/');
    const word = page.getByRole('button', { name: /^mitral valve/ });
    await word.click();
    const selected = page.getByText(`${en['viewer.selected']}:`).locator('..');
    await expect(selected).toContainText(en['structure.mitral-valve']);
    await expect(selected).not.toContainText(en['structure.aortic-valve']);
    expect((await axe(page).analyze()).violations).toEqual([]);
  });
});

test.describe('structure words without JavaScript', () => {
  test.skip(process.env['HA_TEST_CONTENT'] === '1', 'needs the production content build');
  test.use({ javaScriptEnabled: false });

  test('stay plain text', async ({ page }) => {
    await page.goto('en/anatomy/heart-valves/');
    await expect(page.getByRole('button', { name: /^mitral valve/ })).toHaveCount(0);
    await expect(page.locator('[data-structure="mitral-valve"]')).toHaveText('mitral valve');
  });
});
