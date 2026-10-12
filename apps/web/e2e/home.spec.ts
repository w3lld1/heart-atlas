import { expect, test } from '@playwright/test';
import { MOTION_STORAGE_KEY } from '../src/lib/motion.ts';
import { productionLocales } from '../src/i18n/locales.ts';
import { axe } from './axe.ts';

for (const locale of Object.keys(productionLocales)) {
  test.describe(`home page (${locale})`, () => {
    test('opens under the base path', async ({ page }) => {
      const response = await page.goto(`${locale}/`);
      expect(response?.status()).toBe(200);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page).toHaveTitle(/\S/);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });

    test('loads assets under the base path', async ({ page, request, baseURL }) => {
      await page.goto(`${locale}/`);
      const href = await page.locator('link[rel="icon"]').getAttribute('href');
      expect(href?.startsWith(new URL(baseURL ?? '').pathname)).toBe(true);
      const icon = await request.get(href ?? '');
      expect(icon.status()).toBe(200);
    });

    test('shows the heart poster', async ({ page }) => {
      await page.goto(`${locale}/`);
      const poster = page.locator('[data-poster]');
      await expect(poster).toBeVisible();
      await expect
        .poll(() => poster.evaluate((img: HTMLImageElement) => img.naturalWidth))
        .toBeGreaterThan(0);
    });

    test('credits the model source, the Japanese line marked with its language', async ({
      page,
    }) => {
      await page.goto(`${locale}/`);
      const credits = page.locator('.model-credits');
      await expect(credits).toContainText('BodyParts3D, © The Database Center for Life Science');
      await expect(credits.locator('[lang="ja"]')).toContainText(
        'ライフサイエンス統合データベースセンター',
      );
    });

    test('links every card to a page that exists', async ({ page, request, baseURL }) => {
      await page.goto(`${locale}/`);
      // How many cards there are depends on the content (CI also runs on fictional test articles).
      const cards = page.locator('.node, .section-card');
      expect(await cards.count()).toBeGreaterThan(4);
      const base = new URL(baseURL ?? '').pathname;
      for (const href of await cards.evaluateAll((links) =>
        links.map((link) => link.getAttribute('href') ?? ''),
      )) {
        if (href.startsWith('https://')) continue;
        expect(href.startsWith(`${base}${locale}/`), href).toBe(true);
        expect((await request.get(href)).status(), href).toBe(200);
      }
    });

    test('draws a line from each card to the heart and stresses it on hover', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto(`${locale}/`);
      await expect(page.locator('[data-links]')).toHaveClass(/drawn/);
      const line = page.locator('.link[data-card="valves"] line');
      const width = () => line.evaluate((el) => parseFloat(getComputedStyle(el).strokeWidth));
      // The line ends on the poster, where the card's structure is.
      const end = await line.evaluate((el: SVGLineElement) => {
        const svg = el.ownerSVGElement?.getBoundingClientRect();
        const x = Number(el.getAttribute('x2')) + (svg?.left ?? 0);
        const y = Number(el.getAttribute('y2')) + (svg?.top ?? 0);
        const img = document.querySelector('[data-poster]')?.getBoundingClientRect();
        return img && x > img.left && x < img.right && y > img.top && y < img.bottom;
      });
      expect(end).toBe(true);
      const before = await width();
      await page.locator('.node[data-card="valves"]').hover();
      await expect.poll(width).toBeGreaterThan(before);
    });

    test('has no horizontal scroll at 320 px', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      await page.goto(`${locale}/`);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBe(0);
    });

    for (const width of [1000, 1300, 1440]) {
      test(`keeps the cards off the heart and the hint at ${width} px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto(`${locale}/`);
        const box = (selector: string) =>
          page.locator(selector).evaluateAll((els) =>
            els.map((el) => {
              const r = el.getBoundingClientRect();
              return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
            }),
          );
        const overlap = (
          a: { left: number; right: number; top: number; bottom: number },
          b: typeof a,
        ) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
        const [hint] = await box('.hint');
        const [poster] = await box('[data-poster]');
        if (!hint || !poster) throw new Error('No hint or poster');
        // The poster's transparent margins may run under the cards: the heart itself takes
        // x 135–646 and y 169–880 of the 800 × 880 picture.
        const w = poster.right - poster.left;
        const h = poster.bottom - poster.top;
        const heart = {
          left: poster.left + w * 0.17,
          right: poster.right - w * 0.19,
          top: poster.top + h * 0.19,
          bottom: poster.bottom,
        };
        for (const card of await box('.node')) {
          expect(overlap(card, hint)).toBe(false);
          expect(overlap(card, heart)).toBe(false);
        }
      });
    }

    for (const colorScheme of ['light', 'dark'] as const) {
      test(`has no axe violations (${colorScheme})`, async ({ page }) => {
        await page.emulateMedia({ colorScheme });
        await page.goto(`${locale}/`);
        const results = await axe(page).analyze();
        expect(results.violations).toEqual([]);
      });
    }
  });
}

for (const motion of ['full', 'calm', 'off', 'reduced'] as const) {
  test(`home page has no axe violations with motion ${motion}`, async ({ page }) => {
    if (motion === 'reduced') await page.emulateMedia({ reducedMotion: 'reduce' });
    else {
      await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [
        MOTION_STORAGE_KEY,
        motion,
      ] as const);
    }
    await page.goto('ru/');
    await expect(page.locator('html')).toHaveAttribute(
      'data-motion',
      motion === 'reduced' ? 'off' : motion,
    );
    await expect(page.locator('[data-poster]')).toBeVisible();
    const results = await axe(page).analyze();
    expect(results.violations).toEqual([]);
  });
}

test.describe('home page without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('shows the cards and the poster, without lines', async ({ page }) => {
    await page.goto('ru/');
    await expect(page.locator('.node').first()).toBeVisible();
    await expect(page.locator('[data-poster]')).toBeVisible();
    await expect(page.locator('[data-links]')).toBeHidden();
  });
});
