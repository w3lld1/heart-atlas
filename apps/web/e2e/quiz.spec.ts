import { expect, test, type Locator } from '@playwright/test';
import ru from '../src/i18n/messages/ru.json' with { type: 'json' };
import { axe } from './axe.ts';

// Runs against the fixture build: `pnpm build:test-content`, then `HA_TEST_CONTENT=1 pnpm e2e`.
// Questions: test/fixtures/site-content/ru/disease/test-condition.quiz.yaml.
test.skip(process.env['HA_TEST_CONTENT'] !== '1', 'needs the HA_TEST_CONTENT=1 build');

const article = 'ru/disease/test-condition/';
const questions = (page: import('@playwright/test').Page): Locator =>
  page.locator('.quiz-question');

async function answer(question: Locator, option: string): Promise<void> {
  await question.getByRole('radio', { name: option, exact: true }).check();
  await question.getByRole('button', { name: ru['quiz.check'] }).click();
}

test.describe('quiz', () => {
  test('checks an answer, marks options in text and explains with a citation', async ({ page }) => {
    await page.goto(article);
    const first = questions(page).first();
    await expect(first.getByText(ru['quiz.showAnswer'])).toBeHidden();
    await expect(first.getByText('Разбор первого вопроса.')).toBeHidden();

    await first.getByRole('button', { name: ru['quiz.check'] }).click();
    await expect(first.locator('.quiz-feedback')).toHaveText(ru['quiz.choose']);

    await answer(first, 'Неверный вариант');
    await expect(first.locator('.quiz-feedback')).toHaveText(
      `${ru['quiz.incorrect']} ${ru['quiz.answer']} Верный вариант`,
    );
    await expect(first.locator('.quiz-option').nth(1)).toContainText(ru['quiz.mark.correct']);
    await expect(
      first.locator('.quiz-option', { hasText: 'Неверный вариант' }).first(),
    ).toContainText(ru['quiz.mark.chosen']);
    await expect(first.getByText('Разбор первого вопроса.')).toBeVisible();
    await expect(first.getByRole('link', { name: 'Источник 1' })).toBeVisible();
    for (const radio of await first.getByRole('radio').all()) await expect(radio).toBeDisabled();

    const retry = first.getByRole('button', { name: ru['quiz.retry'] });
    await expect(retry).toBeFocused();
    await retry.click();
    await expect(first.locator('.quiz-feedback')).toBeEmpty();
    await expect(first.getByText('Разбор первого вопроса.')).toBeHidden();
    await expect(first.getByRole('radio').first()).toBeEnabled();

    const results = await axe(page).analyze();
    expect(results.violations).toEqual([]);
  });

  test('scores only the questions of the current level and remembers the result', async ({
    page,
  }) => {
    await page.goto(article);
    await expect(page.locator('html')).toHaveAttribute('data-level', 'patient');
    await expect(questions(page).filter({ hasText: 'Вопрос для студентов?' })).toBeHidden();

    await answer(questions(page).nth(0), 'Верный вариант');
    await expect(page.locator('.quiz-score')).toBeHidden();
    await answer(questions(page).nth(1), 'Неверный вариант второго вопроса');
    await expect(page.locator('.quiz-score')).toHaveText('Правильных ответов: 1 из 2.');

    const saved = await page.evaluate(() =>
      localStorage.getItem('ha:quiz:ru/disease/test-condition'),
    );
    expect(JSON.parse(saved ?? '{}')).toMatchObject({ patient: { correct: 1, total: 2 } });

    // The student level shows its own question: the patient score no longer applies.
    await page.getByRole('button', { name: ru['level.student'] }).click();
    await expect(page.locator('.quiz-score')).toBeEmpty();
    await answer(
      questions(page).filter({ hasText: 'Вопрос для студентов?' }),
      'Верный вариант для студентов',
    );
    await expect(page.locator('.quiz-score')).toHaveText('Правильных ответов: 1 из 1.');
    await page.getByRole('button', { name: ru['level.patient'] }).click();
    await expect(page.locator('.quiz-score')).toHaveText('Правильных ответов: 1 из 2.');

    const both = await page.evaluate(() =>
      localStorage.getItem('ha:quiz:ru/disease/test-condition'),
    );
    expect(JSON.parse(both ?? '{}')).toMatchObject({
      patient: { correct: 1, total: 2 },
      student: { correct: 1, total: 1 },
    });
  });

  test('works when storage is blocked', async ({ page }) => {
    await page.addInitScript(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException('blocked', 'SecurityError');
      };
    });
    await page.goto(article);
    await answer(questions(page).nth(0), 'Верный вариант');
    await answer(questions(page).nth(1), 'Верный вариант второго вопроса');
    await expect(page.locator('.quiz-score')).toHaveText('Правильных ответов: 2 из 2.');
  });

  test('a fallback translation takes the quiz in the language of the text', async ({ page }) => {
    await page.goto('ru/disease/another-condition/');
    const quiz = page.locator('.quiz');
    await expect(quiz.getByRole('heading', { name: ru['quiz.title'] })).toHaveAttribute(
      'lang',
      'ru',
    );
    await expect(quiz.getByText('A question in English?')).toBeVisible();
  });
});

test.describe('quiz without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('shows every question with the answer behind "Show the answer"', async ({ page }) => {
    await page.goto(article);
    await expect(questions(page)).toHaveCount(3);
    await expect(page.getByRole('button', { name: ru['quiz.check'] })).toHaveCount(0);
    const first = questions(page).first();
    await expect(first.getByText('Разбор первого вопроса.')).toBeHidden();
    await first.getByText(ru['quiz.showAnswer']).click();
    await expect(first.getByText('Разбор первого вопроса.')).toBeVisible();
  });
});

test.describe('quiz in an embed', () => {
  test('stays static, with the answer behind "Show the answer"', async ({ page }) => {
    await page.goto('ru/embed/disease/test-condition/');
    await expect(page.locator('.quiz')).not.toHaveAttribute('data-ready');
    await expect(page.locator('.quiz')).not.toHaveAttribute('data-messages');
    const first = questions(page).first();
    await first.getByText(ru['quiz.showAnswer']).click();
    await expect(first.getByText('Разбор первого вопроса.')).toBeVisible();
  });
});

test.describe('quiz right to left', () => {
  test.skip(process.env['HA_TEST_LOCALES'] !== '1', 'needs the HA_TEST_LOCALES=1 build');

  test('labels the quiz in the page language on a right-to-left page', async ({ page }) => {
    await page.goto('qps-plocm/disease/another-condition/');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    const quiz = page.locator('.quiz');
    await expect(quiz.getByRole('heading', { name: '[RTL] Check yourself' })).toBeVisible();
    await quiz.getByRole('radio', { name: 'The right option', exact: true }).check();
    await quiz.getByRole('button', { name: '[RTL] Check' }).click();
    await expect(quiz.locator('.quiz-feedback')).toContainText('[RTL] Correct.');
    const results = await axe(page).analyze();
    expect(results.violations).toEqual([]);
  });
});
