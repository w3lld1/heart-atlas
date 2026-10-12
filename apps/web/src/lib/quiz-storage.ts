// What a quiz remembers in the browser. Its own module so track pages can read results without
// loading the quiz runtime.

export type QuizResult = { correct: number; total: number; date: string };
/** The last full result at each level: a level shows only its own questions. */
export type QuizResults = Partial<Record<string, QuizResult>>;

/** localStorage key of a quiz result; the id is `<locale>/<type>/<slug>`. */
export const quizStorageKey = (id: string): string => `ha:quiz:${id}`;
