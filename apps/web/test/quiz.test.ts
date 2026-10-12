import { describe, expect, it } from 'vitest';
import { formatScore, quizStorageKey } from '../src/lib/quiz-client.ts';
import { quizCitationErrors, quizId, quizSchema } from '../src/lib/quiz.ts';

const question = {
  level: 'patient',
  prompt: 'Q?',
  options: [{ text: 'A', correct: true }, { text: 'B' }],
  explanation: 'Because.',
  cite: [1],
};

describe('quizSchema', () => {
  it('accepts a question with one correct option', () => {
    expect(quizSchema.parse({ questions: [question] }).questions).toHaveLength(1);
  });

  it('rejects zero or several correct options', () => {
    for (const options of [
      [{ text: 'A' }, { text: 'B' }],
      [
        { text: 'A', correct: true },
        { text: 'B', correct: true },
      ],
    ]) {
      expect(quizSchema.safeParse({ questions: [{ ...question, options }] }).success).toBe(false);
    }
  });

  it('needs a citation, an explanation and two to five options', () => {
    for (const change of [
      { cite: [] },
      { explanation: ' ' },
      { options: [{ text: 'A', correct: true }] },
      { options: [...'ABCDEF'].map((text, i) => ({ text, ...(i === 0 && { correct: true }) })) },
      { level: 'expert' },
    ]) {
      expect(quizSchema.safeParse({ questions: [{ ...question, ...change }] }).success).toBe(false);
    }
  });

  it('rejects unknown fields and empty quizzes', () => {
    expect(quizSchema.safeParse({ questions: [{ ...question, hint: 'x' }] }).success).toBe(false);
    expect(quizSchema.safeParse({ questions: [] }).success).toBe(false);
  });
});

describe('quizId', () => {
  it('maps a quiz file to its article id', () => {
    expect(quizId('ru/disease/myocarditis.quiz.yaml')).toBe('ru/disease/myocarditis');
    expect(() => quizId('ru/disease/myocarditis.yaml')).toThrow();
  });
});

describe('quizCitationErrors', () => {
  it('reports citations beyond the article sources', () => {
    const quiz = quizSchema.parse({ questions: [question, { ...question, cite: [1, 3] }] });
    expect(quizCitationErrors(quiz, 2)).toEqual([
      'Question 2 cites source 3, but the article has 2',
    ]);
    expect(quizCitationErrors(quiz, 3)).toEqual([]);
  });
});

describe('quiz client helpers', () => {
  it('formats the score and the storage key', () => {
    expect(formatScore('{correct} of {total}', 2, 3)).toBe('2 of 3');
    expect(quizStorageKey('ru/disease/x')).toBe('ha:quiz:ru/disease/x');
  });
});
