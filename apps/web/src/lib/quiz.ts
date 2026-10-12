import { z } from 'astro/zod';

// Spec: docs/plans/2026-10-12-stage-6-quizzes-tracks.md ("Формат вопросов").

export const QUIZ_FILE_SUFFIX = '.quiz.yaml';

const optionSchema = z.strictObject({
  text: z.string().trim().min(1),
  correct: z.literal(true).optional(),
});

const questionSchema = z
  .strictObject({
    level: z.enum(['patient', 'student']),
    prompt: z.string().trim().min(1),
    options: z.array(optionSchema).min(2).max(5),
    explanation: z.string().trim().min(1),
    // Numbers of the article's own sources, as in <Cite n={…} />.
    cite: z.array(z.number().int().min(1)).min(1),
  })
  .superRefine((question, ctx) => {
    const correct = question.options.filter((option) => option.correct).length;
    if (correct !== 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['options'],
        message: `A question needs exactly one correct option, found ${correct}`,
      });
    }
  });

export const quizSchema = z.strictObject({
  questions: z.array(questionSchema).min(1).max(10),
});
export type Quiz = z.infer<typeof quizSchema>;
export type QuizQuestion = Quiz['questions'][number];

/**
 * The collection id of a quiz file: `ru/disease/myocarditis.quiz.yaml` → `ru/disease/myocarditis`,
 * the same `<locale>/<type>/<slug>` as its article. Astro's default id would slugify the dot away.
 */
export function quizId(path: string): string {
  if (!path.endsWith(QUIZ_FILE_SUFFIX))
    throw new Error(`${path} is not a ${QUIZ_FILE_SUFFIX} file`);
  return path.slice(0, -QUIZ_FILE_SUFFIX.length);
}

/** Problems with a quiz that the schema cannot see: citations beyond the article's sources. */
export function quizCitationErrors(quiz: Quiz, sourceCount: number): string[] {
  return quiz.questions.flatMap((question, index) =>
    question.cite
      .filter((n) => n > sourceCount)
      .map((n) => `Question ${index + 1} cites source ${n}, but the article has ${sourceCount}`),
  );
}
