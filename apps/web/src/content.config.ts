import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { createArticleSchema } from './lib/content.ts';
import { quizId, quizSchema } from './lib/quiz.ts';
import { trustedSources } from './lib/trusted-sources.ts';

// content/ lives in the repository root so LICENSE-CONTENT covers it. HA_TEST_CONTENT=1 swaps in
// test articles for checking pages; they never reach a production build.
const contentDir =
  process.env['HA_TEST_CONTENT'] === '1'
    ? new URL('../test/fixtures/site-content/', import.meta.url)
    : new URL('../../../content/', import.meta.url);

// Files live in content/<locale>/<type>/<slug>.mdx; test/content.test.ts checks that layout.
const articles = defineCollection({
  loader: glob({ base: contentDir, pattern: '**/*.mdx' }),
  schema: createArticleSchema(trustedSources),
});

// Quiz questions live next to their article: content/<locale>/<type>/<slug>.quiz.yaml.
const quizzes = defineCollection({
  loader: glob({
    base: contentDir,
    pattern: '**/*.quiz.yaml',
    generateId: ({ entry }) => quizId(entry),
  }),
  schema: quizSchema,
});

export const collections = { articles, quizzes };
