import { z } from 'astro/zod';
import type { ArticlePage } from './articles.ts';

// Spec: docs/plans/2026-10-12-stage-6-quizzes-tracks.md ("Учебные треки").

/**
 * Track ids reuse the article id shape, `<locale>/track/<id>`, so `articlePages` resolves their
 * fallback translations like articles.
 */
export const TRACK_TYPE = 'track';

const stepSchema = z
  .string()
  .regex(/^[a-z]+\/[a-z0-9]+(-[a-z0-9]+)*$/, 'A step is <type>/<slug> of an article');

export const trackSchema = z.strictObject({
  title: z.string().trim().min(1),
  // What the track covers and in what order; no medical facts (checked in review).
  description: z.string().trim().min(1),
  level: z.enum(['patient', 'student', 'all']),
  steps: z
    .array(stepSchema)
    .min(1)
    .refine((steps) => new Set(steps).size === steps.length, 'A step appears twice'),
});
export type Track = z.infer<typeof trackSchema>;

/** The collection id of a track file: `ru/heart-basics.yaml` → `ru/track/heart-basics`. */
export function trackId(path: string): string {
  const match = /^([^/]+)\/([a-z0-9]+(?:-[a-z0-9]+)*)\.yaml$/.exec(path);
  if (!match) throw new Error(`Track file "${path}" is not <locale>/<id>.yaml`);
  return `${match[1]}/${TRACK_TYPE}/${match[2]}`;
}

/**
 * The article pages of a track's steps in the page locale, in order. Throws when a step has no
 * page there, so a track never links to a missing article.
 */
export function trackSteps<T>(
  track: Track,
  locale: string,
  pages: readonly ArticlePage<T>[],
): ArticlePage<T>[] {
  const byKey = new Map(
    pages
      .filter((page) => page.locale === locale)
      .map((page) => [`${page.type}/${page.slug}`, page]),
  );
  const missing = track.steps.filter((step) => !byKey.has(step));
  if (missing.length > 0) {
    throw new Error(`Track "${track.title}" (${locale}) has no article for: ${missing.join(', ')}`);
  }
  return track.steps.map((step) => byKey.get(step) as ArticlePage<T>);
}
