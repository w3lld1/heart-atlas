import { presetIds, presetTreated } from '@heart-atlas/heart-clock';
import { z } from 'astro/zod';
import { parse } from 'yaml';

// Source policy from docs/plans/2026-10-11-stage-0-foundation.md ("Политика источников").

export const articleTypes = ['anatomy', 'disease', 'diagnostic', 'treatment'] as const;
export type ArticleType = (typeof articleTypes)[number];

/** Article types that make clinical claims and need a clinical guideline among their sources. */
const clinicalTypes: ReadonlySet<ArticleType> = new Set(['disease', 'diagnostic', 'treatment']);

export const sourceTiers = ['guideline', 'review', 'textbook', 'reference'] as const;

/** Tiers whose sources must name an organization from content/trusted-sources.yaml. */
const orgTiers = ['guideline', 'reference'] as const;

export const trustedSourcesSchema = z.record(
  z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Organization id must be kebab-case'),
  z.strictObject({ name: z.string().min(1), tier: z.enum(orgTiers) }),
);
export type TrustedSources = z.infer<typeof trustedSourcesSchema>;

export function parseTrustedSources(yamlText: string): TrustedSources {
  return trustedSourcesSchema.parse(parse(yamlText));
}

/** Validates the ISBN-10 or ISBN-13 check digit, ignoring hyphens and spaces. */
export function isValidIsbn(value: string): boolean {
  const isbn = value.replace(/[\s-]/g, '').toUpperCase();
  if (/^\d{9}[\dX]$/.test(isbn)) {
    const sum = [...isbn].reduce(
      (acc, char, i) => acc + (char === 'X' ? 10 : Number(char)) * (10 - i),
      0,
    );
    return sum % 11 === 0;
  }
  if (/^\d{13}$/.test(isbn)) {
    const sum = [...isbn].reduce((acc, char, i) => acc + Number(char) * (i % 2 === 0 ? 1 : 3), 0);
    return sum % 10 === 0;
  }
  return false;
}

/**
 * A calendar date as YAML gives it: a Date for an unquoted value, a string for a quoted one.
 * Unlike z.coerce.date(), it rejects null, numbers and booleans, which `new Date()` would turn
 * into 1970 instead of failing.
 */
const dateSchema = z
  .union([z.date(), z.iso.date().transform((value) => new Date(value))])
  .refine((date) => date.getTime() <= Date.now() + 24 * 60 * 60 * 1000, 'Date is in the future');

const doiSchema = z.string().regex(/^10\.\d{4,9}\/\S+$/, 'DOI must look like 10.1234/abc');
// YAML reads an unhyphenated ISBN as a number, so accept that too.
const isbnSchema = z
  .union([z.string(), z.number().int().transform(String)])
  .refine(isValidIsbn, 'ISBN check digit is invalid');

export function createSourceSchema(trusted: TrustedSources) {
  return z
    .strictObject({
      tier: z.enum(sourceTiers),
      org: z.string().optional(),
      title: z.string().min(1),
      year: z.number().int().min(1900).max(new Date().getUTCFullYear()),
      doi: doiSchema.optional(),
      isbn: isbnSchema.optional(),
      url: z.url({ protocol: /^https$/, error: 'URL must use https' }).optional(),
    })
    .superRefine((source, ctx) => {
      if (source.doi === undefined && source.isbn === undefined && source.url === undefined) {
        ctx.addIssue({ code: 'custom', message: 'Source needs a doi, isbn or url' });
      }
      const org = source.org === undefined ? undefined : trusted[source.org];
      if (source.org !== undefined && org === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['org'],
          message: `Unknown org "${source.org}"; ids come from content/trusted-sources.yaml`,
        });
      } else if (source.tier === 'guideline' || source.tier === 'reference') {
        if (org === undefined) {
          ctx.addIssue({
            code: 'custom',
            path: ['org'],
            message: `A ${source.tier} source needs an org from content/trusted-sources.yaml`,
          });
        } else if (org.tier !== source.tier) {
          ctx.addIssue({
            code: 'custom',
            path: ['tier'],
            message: `Organization "${source.org}" is listed as ${org.tier}, not ${source.tier}`,
          });
        }
      }
      if (source.tier === 'review' && source.doi === undefined) {
        ctx.addIssue({ code: 'custom', path: ['doi'], message: 'A review source needs a doi' });
      }
      if (source.tier === 'textbook' && source.isbn === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['isbn'],
          message: 'A textbook source needs an isbn',
        });
      }
    });
}

export const reviewSchema = z.strictObject({
  reviewer: z.string().min(1),
  date: dateSchema,
});
export type Review = z.infer<typeof reviewSchema>;

export function createArticleSchema(trusted: TrustedSources) {
  return z
    .strictObject({
      title: z.string().min(1),
      description: z.string().min(1),
      type: z.enum(articleTypes),
      // Other names, abbreviations and old terms that search should find the article by.
      aliases: z.array(z.string().trim().min(1)).default([]),
      sources: z.array(createSourceSchema(trusted)).min(1, 'An article needs at least one source'),
      sources_checked: dateSchema,
      // Optional until the project has physician reviewers. While null, pages show ReviewNotice.
      review: reviewSchema.nullable().default(null),
      // Heart clock preset shown on the page with a normal / disease switch. `normal` alone would
      // show nothing new, so it is not accepted. Spec: docs/plans/2026-10-11-stage-3-presets.md.
      // An "after treatment" preset comes only with its disease (`presetTreated`).
      preset: z
        .enum(presetIds)
        .exclude(['normal', ...new Set(Object.values(presetTreated))])
        .optional(),
    })
    .superRefine((article, ctx) => {
      const seen = new Set([article.title.toLocaleLowerCase()]);
      for (const [index, alias] of article.aliases.entries()) {
        const key = alias.toLocaleLowerCase();
        if (seen.has(key)) {
          ctx.addIssue({
            code: 'custom',
            path: ['aliases', index],
            message: `Alias "${alias}" repeats the title or another alias`,
          });
        }
        seen.add(key);
      }
      if (!clinicalTypes.has(article.type)) return;
      if (article.sources.length < 2) {
        ctx.addIssue({
          code: 'custom',
          path: ['sources'],
          message: `A ${article.type} article needs at least two sources`,
        });
      }
      if (!article.sources.some((source) => source.tier === 'guideline')) {
        ctx.addIssue({
          code: 'custom',
          path: ['sources'],
          message: `A ${article.type} article needs at least one guideline source`,
        });
      }
    });
}
export type Article = z.infer<ReturnType<typeof createArticleSchema>>;

/** Sources older than this many years get a warning so someone re-checks them. */
export const SOURCES_STALE_AFTER_YEARS = 2;

export function isSourcesCheckStale(checked: Date, now: Date = new Date()): boolean {
  const limit = new Date(now);
  limit.setUTCFullYear(limit.getUTCFullYear() - SOURCES_STALE_AFTER_YEARS);
  return checked < limit;
}
