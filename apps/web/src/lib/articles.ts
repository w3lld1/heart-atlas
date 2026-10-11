import { fallbackChain, type LocaleRegistry } from '../i18n/registry.ts';

/** Collection ids look like `ru/disease/atrial-fibrillation` (content/<locale>/<type>/<slug>.mdx). */
export type ArticleKey = { locale: string; type: string; slug: string };

export function parseArticleId(id: string): ArticleKey {
  const [locale, type, slug, ...rest] = id.split('/');
  if (!locale || !type || !slug || rest.length > 0) {
    throw new Error(`Article id "${id}" is not <locale>/<type>/<slug>`);
  }
  return { locale, type, slug };
}

export type ArticlePage<T> = {
  /** Locale of the page URL. */
  locale: string;
  type: string;
  slug: string;
  /** The entry shown on the page: in `locale`, or in the first fallback locale that has it. */
  entry: T;
  /** Locale the entry is written in; differs from `locale` when the translation is missing. */
  contentLocale: string;
};

/**
 * One page per locale and per type/slug that exists in any locale. A page whose locale lacks the
 * article shows the first locale in its fallback chain that has it; with none, there is no page.
 */
export function articlePages<T extends { id: string }>(
  entries: readonly T[],
  registry: LocaleRegistry,
): ArticlePage<T>[] {
  const byKey = new Map<string, Map<string, T>>();
  for (const entry of entries) {
    const { locale, type, slug } = parseArticleId(entry.id);
    const key = `${type}/${slug}`;
    const translations = byKey.get(key) ?? new Map<string, T>();
    translations.set(locale, entry);
    byKey.set(key, translations);
  }

  const pages: ArticlePage<T>[] = [];
  for (const locale of Object.keys(registry)) {
    const chain = fallbackChain(registry, locale);
    for (const [key, translations] of byKey) {
      const contentLocale = chain.find((code) => translations.has(code));
      const entry = contentLocale === undefined ? undefined : translations.get(contentLocale);
      if (contentLocale === undefined || entry === undefined) continue;
      const [type = '', slug = ''] = key.split('/');
      pages.push({ locale, type, slug, entry, contentLocale });
    }
  }
  return pages;
}

/**
 * Article types whose list is not a `/<locale>/<type>/` page of its own: the anatomy page with
 * the 3D viewer lives at `/<locale>/anatomy/` and lists the anatomy articles under the viewer.
 */
export const typesListedElsewhere: ReadonlySet<string> = new Set(['anatomy']);
