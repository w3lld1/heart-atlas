// Browser side of <Quiz />: checks answers, keeps the score and remembers the last result.
// Spec: docs/plans/2026-10-12-stage-6-quizzes-tracks.md ("Компонент <Quiz />").

type QuizMessages = {
  correct: string;
  incorrect: string;
  choose: string;
  markCorrect: string;
  markChosen: string;
  score: string;
};

export type QuizResult = { correct: number; total: number; date: string };

/** localStorage key of a quiz result; the id is `<locale>/<type>/<slug>`. */
export const quizStorageKey = (id: string): string => `ha:quiz:${id}`;

/** Fills `{correct}` and `{total}` in the score line. */
export function formatScore(template: string, correct: number, total: number): string {
  return template
    .replace('{correct}', () => String(correct))
    .replace('{total}', () => String(total));
}

/** Questions the reader can see: the level switch hides the other level once it runs. */
function visibleQuestions(quiz: HTMLElement): HTMLElement[] {
  const level = document.documentElement.dataset['level'];
  return [...quiz.querySelectorAll<HTMLElement>('.quiz-question')].filter(
    (question) => level === undefined || question.dataset['level'] === level,
  );
}

function saveResult(id: string, result: QuizResult): void {
  try {
    localStorage.setItem(quizStorageKey(id), JSON.stringify(result));
  } catch {
    // Storage can be blocked; the quiz still works without remembering.
  }
}

export function initQuiz(quiz: HTMLElement): void {
  const messages = JSON.parse(quiz.dataset['messages'] ?? '{}') as QuizMessages;
  const score = quiz.querySelector<HTMLElement>('.quiz-score');

  const updateScore = (): void => {
    const questions = visibleQuestions(quiz);
    const answered = questions.filter((question) => question.dataset['result'] !== undefined);
    if (score === null || questions.length === 0 || answered.length < questions.length) {
      if (score !== null) score.textContent = '';
      return;
    }
    const correct = answered.filter((question) => question.dataset['result'] === 'correct').length;
    score.textContent = formatScore(messages.score, correct, questions.length);
    saveResult(quiz.dataset['quiz'] ?? '', {
      correct,
      total: questions.length,
      date: new Date().toISOString(),
    });
  };

  for (const question of quiz.querySelectorAll<HTMLElement>('.quiz-question')) {
    const actions = question.querySelector<HTMLElement>('.quiz-actions');
    const check = question.querySelector<HTMLButtonElement>('[data-quiz-check]');
    const retry = question.querySelector<HTMLButtonElement>('[data-quiz-retry]');
    const feedback = question.querySelector<HTMLElement>('.quiz-feedback');
    const answer = question.querySelector<HTMLDetailsElement>('.quiz-answer');
    const inputs = [...question.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
    if (!actions || !check || !retry || !feedback || !answer) continue;

    const mark = (input: HTMLInputElement, state: 'correct' | 'chosen' | undefined): void => {
      const label = input.closest<HTMLElement>('.quiz-option');
      const text = label?.querySelector('.quiz-mark');
      if (!label || !text) return;
      if (state === undefined) delete label.dataset['state'];
      else label.dataset['state'] = state;
      text.textContent =
        state === 'correct' ? messages.markCorrect : state === 'chosen' ? messages.markChosen : '';
    };

    check.addEventListener('click', () => {
      const chosen = inputs.find((input) => input.checked);
      if (!chosen) {
        feedback.textContent = messages.choose;
        return;
      }
      const right = chosen.dataset['correct'] !== undefined;
      for (const input of inputs) {
        input.disabled = true;
        if (input.dataset['correct'] !== undefined) mark(input, 'correct');
        else if (input === chosen) mark(input, 'chosen');
      }
      question.dataset['result'] = right ? 'correct' : 'incorrect';
      feedback.textContent = right ? messages.correct : messages.incorrect;
      answer.open = true;
      check.hidden = true;
      retry.hidden = false;
      retry.focus();
      updateScore();
    });

    retry.addEventListener('click', () => {
      for (const input of inputs) {
        input.disabled = false;
        input.checked = false;
        mark(input, undefined);
      }
      delete question.dataset['result'];
      feedback.textContent = '';
      answer.open = false;
      retry.hidden = true;
      check.hidden = false;
      inputs[0]?.focus();
      updateScore();
    });

    actions.hidden = false;
  }

  quiz.dataset['ready'] = '';
}
