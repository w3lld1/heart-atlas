import { getCollection } from 'astro:content';
import { locales } from '../i18n/locales.ts';
import { articlePages } from './articles.ts';
import type { Foreign, TrackData } from './track-progress.ts';
import { trackSteps } from './tracks.ts';

/** lang and dir for text in `code` on a page in `locale`; nothing when they match. */
export const foreign = (code: string, locale: string): Foreign =>
  code === locale ? {} : { lang: code, dir: locales[code]?.dir ?? 'ltr' };

/**
 * Every track page: one per locale and track, in the locale's own translation or a fallback one.
 * The track page and its steps.json share it, so they always list the same steps.
 */
export async function trackRoutes() {
  const articles = articlePages(await getCollection('articles'), locales);
  const tracks = articlePages(await getCollection('tracks'), locales);
  const quizzes = new Set((await getCollection('quizzes')).map((quiz) => quiz.id));
  return tracks.map((page) => {
    const same = tracks.filter((other) => other.slug === page.slug);
    const steps = trackSteps(page.entry.data, page.locale, articles).map((step) => {
      const key = `${step.contentLocale}/${step.type}/${step.slug}`;
      return { page: step, key, path: `${step.type}/${step.slug}`, quiz: quizzes.has(key) };
    });
    const data: TrackData = {
      title: page.entry.data.title,
      ...foreign(page.contentLocale, page.locale),
      steps: steps.map((step) => ({
        path: step.path,
        key: step.key,
        title: step.page.entry.data.title,
        ...foreign(step.page.contentLocale, page.locale),
      })),
    };
    return {
      params: { locale: page.locale, id: page.slug },
      props: {
        track: page.entry.data,
        contentLocale: page.contentLocale,
        steps,
        data,
        pageLocales: same.map((other) => other.locale),
        translatedLocales: same
          .filter((other) => other.locale === other.contentLocale)
          .map((other) => other.locale),
      },
    };
  });
}
