import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  articleTypes,
  createArticleSchema,
  isSourcesCheckStale,
  SOURCES_STALE_AFTER_YEARS,
} from '../src/lib/content.ts';
import { QUIZ_FILE_SUFFIX, quizCitationErrors, quizSchema } from '../src/lib/quiz.ts';
import { trustedSources } from '../src/lib/trusted-sources.ts';
import { productionLocales } from '../src/i18n/locales.ts';
import { parse } from 'yaml';
import { readFrontmatter } from './frontmatter.ts';

// Checks the real content/ tree and the test articles for HA_TEST_CONTENT=1 builds. Astro
// validates frontmatter at build time too, but it does not see file paths, so the
// <locale>/<type>/<slug>.mdx layout is checked here.
const articleSchema = createArticleSchema(trustedSources);
const trees = [
  { name: 'content/', url: new URL('../../../content/', import.meta.url) },
  { name: 'test/fixtures/site-content/', url: new URL('fixtures/site-content/', import.meta.url) },
];

for (const tree of trees) {
  const dir = fileURLToPath(tree.url);
  const all = readdirSync(dir, { recursive: true, encoding: 'utf8' }).map((file) =>
    file.split(sep).join('/'),
  );
  const files = all.filter((file) => file.endsWith('.mdx'));
  const quizzes = all.filter((file) => file.endsWith(QUIZ_FILE_SUFFIX));

  describe.runIf(files.length > 0)(tree.name, () => {
    it.each(files)('%s is valid', (file) => {
      const parts = file.split('/');
      expect(parts, 'expected <locale>/<type>/<slug>.mdx').toHaveLength(3);
      const [locale = '', type, slug] = parts;
      expect(Object.keys(productionLocales), 'locale must be in the registry').toContain(locale);
      expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*\.mdx$/);

      const article = articleSchema.parse(readFrontmatter(`${dir}${file}`));
      expect(articleTypes).toContain(type);
      expect(article.type, 'type must match the folder').toBe(type);

      const cited = [...readFileSync(`${dir}${file}`, 'utf8').matchAll(/<Cite n=\{([^}]*)\}/g)]
        .flatMap((match) => (match[1] ?? '').replace(/[[\]\s]/g, '').split(','))
        .map(Number);
      for (const n of cited) {
        expect(n >= 1 && n <= article.sources.length, `<Cite n={${n}} /> has no source`).toBe(true);
      }

      // <Quiz /> needs <slug>.quiz.yaml, and a quiz file is useless without <Quiz />.
      const text = readFileSync(`${dir}${file}`, 'utf8');
      const quizFile = `${dir}${file.slice(0, -'.mdx'.length)}${QUIZ_FILE_SUFFIX}`;
      const quizTags = text.match(/<Quiz\b/g)?.length ?? 0;
      expect(quizTags, 'an article has at most one <Quiz />').toBeLessThanOrEqual(1);
      expect(quizTags === 1, `<Quiz /> must match ${QUIZ_FILE_SUFFIX}`).toBe(existsSync(quizFile));

      if (isSourcesCheckStale(article.sources_checked)) {
        // Vitest hides console output of passing tests, so write straight to stdout. GitHub
        // Actions turns the line into an annotation.
        process.stdout.write(
          `::warning file=${tree.name}${file}::sources_checked is older than ${SOURCES_STALE_AFTER_YEARS} years\n`,
        );
      }
    });

    // it.each fails on an empty list, and the real content may have no quizzes yet.
    if (quizzes.length > 0) {
      it.each(quizzes)('%s is valid', (file) => {
        const article = `${dir}${file.slice(0, -QUIZ_FILE_SUFFIX.length)}.mdx`;
        expect(existsSync(article), 'a quiz needs an article of the same name').toBe(true);
        const quiz = quizSchema.parse(parse(readFileSync(`${dir}${file}`, 'utf8')));
        const { sources } = articleSchema.parse(readFrontmatter(article));
        expect(quizCitationErrors(quiz, sources.length)).toEqual([]);
      });
    }
  });
}
