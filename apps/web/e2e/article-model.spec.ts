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

// docs/plans/2026-10-12-article-interactivity.md: the 3D model with highlights inside articles.
test.describe('3D model in an article without signs on the model', () => {
  test.skip(process.env['HA_TEST_CONTENT'] === '1', 'needs the production content build');

  const places: Record<string, string[]> = {
    'ventricular-septal-defect': ['interventricular-septum'],
    'mitral-regurgitation': ['mitral-valve'],
    'aortic-regurgitation': ['aortic-valve'],
    'mitral-stenosis': ['mitral-valve'],
    'pulmonary-embolism': ['pulmonary-trunk', 'right-ventricle'],
    'pulmonary-hypertension': ['pulmonary-trunk', 'right-ventricle'],
    'eisenmenger-syndrome': ['interventricular-septum', 'pulmonary-trunk', 'right-ventricle'],
    'arrhythmogenic-right-ventricular-cardiomyopathy': ['right-ventricle'],
    'tricuspid-regurgitation': ['tricuspid-valve'],
    'ebstein-anomaly': ['tricuspid-valve', 'right-atrium', 'right-ventricle'],
    'infective-endocarditis': [
      'mitral-valve',
      'aortic-valve',
      'tricuspid-valve',
      'pulmonary-valve',
    ],
    'av-block': ['av-node', 'bundle-of-his', 'right-bundle-branch', 'left-bundle-branch'],
    'supraventricular-tachycardia': ['av-node', 'bundle-of-his'],
    'aortic-dissection': ['aorta'],
    'sick-sinus-syndrome': ['sa-node'],
    'coarctation-of-the-aorta': ['aorta'],
    'patent-ductus-arteriosus': ['aorta', 'pulmonary-trunk'],
    'ventricular-tachycardia': ['left-ventricle', 'right-ventricle'],
    'wpw-syndrome': ['av-node'],
    'marfan-syndrome': ['aorta', 'aortic-valve', 'mitral-valve'],
    'pulmonary-valve-stenosis': ['pulmonary-valve', 'right-ventricle', 'pulmonary-trunk'],
    'brugada-syndrome': ['right-ventricle'],
    'restrictive-cardiomyopathy': [
      'left-ventricle',
      'right-ventricle',
      'left-atrium',
      'right-atrium',
    ],
    'atrial-flutter': ['right-atrium', 'tricuspid-valve'],
    'cardiac-amyloidosis': ['left-ventricle', 'right-ventricle'],
    'cardiac-sarcoidosis': ['interventricular-septum', 'av-node', 'bundle-of-his'],
    'peripartum-cardiomyopathy': ['left-ventricle'],
    'hypoplastic-left-heart-syndrome': ['left-ventricle', 'aorta'],
  };
  // Diagnostic articles with the model (spec addendum «3D-модель в статьях диагностики»).
  const diagnosticPlaces: Record<string, string[]> = {
    'natriuretic-peptides': ['left-ventricle', 'right-ventricle'],
    echocardiography: ['left-ventricle', 'right-ventricle', 'left-atrium', 'right-atrium'],
    ecg: ['sa-node', 'right-atrium', 'left-atrium', 'right-ventricle', 'left-ventricle'],
  };
  const pages = [
    ...Object.entries(places).map(([slug, ids]) => [`disease/${slug}`, ids] as const),
    ...Object.entries(diagnosticPlaces).map(([slug, ids]) => [`diagnostic/${slug}`, ids] as const),
  ];
  for (const [path, ids] of pages) {
    test(`${path} highlights the place the article names`, async ({ page }) => {
      await page.goto(`en/${path}/`);
      const load = page.getByRole('button', { name: en['viewer.load'] });
      await load.scrollIntoViewIfNeeded();
      await expect(page.locator('astro-island', { has: load })).not.toHaveAttribute('ssr');
      const selected = page.getByText(`${en['viewer.selected']}:`).locator('..');
      for (const id of ids) {
        await expect(selected).toContainText(en[`structure.${id}` as keyof typeof en]);
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
