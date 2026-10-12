// Reading progress of learning tracks, kept in the reader's browser.
// Spec: docs/plans/2026-10-12-stage-6-quizzes-tracks.md ("Учебные треки").
import { quizStorageKey, type QuizResults } from './quiz-storage.ts';

/** One step of a track, as the track page and its steps.json describe it. */
export type TrackStep = {
  /** `<type>/<slug>`: the article's path under the page locale. */
  path: string;
  /** `<content locale>/<type>/<slug>`: the article the reader actually reads, for storage keys. */
  key: string;
  title: string;
} & Foreign;

/** Language and direction of text written in another language than the page. */
export type Foreign = { lang?: string | undefined; dir?: 'ltr' | 'rtl' | undefined };

/** What `/<locale>/tracks/<id>/steps.json` holds. */
export type TrackData = { title: string; steps: TrackStep[] } & Foreign;

/** localStorage key of the "read" mark; the id is `<locale>/<type>/<slug>`. */
export const readStorageKey = (key: string): string => `ha:read:${key}`;

/** Storage that may be missing or throw: private windows, blocked site data. */
type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem'>;

function storage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export function isRead(key: string, store: Storage | undefined = storage()): boolean {
  try {
    const value = store?.getItem(readStorageKey(key));
    return value !== null && value !== undefined;
  } catch {
    return false;
  }
}

export function setRead(key: string, read: boolean, store: Storage | undefined = storage()): void {
  try {
    if (read) store?.setItem(readStorageKey(key), new Date().toISOString());
    else store?.removeItem(readStorageKey(key));
  } catch {
    // Without storage the checkbox still works, only for this page.
  }
}

/** A quiz counts as done once a full pass is saved at any level. */
export function isQuizDone(key: string, store: Storage | undefined = storage()): boolean {
  try {
    const results = JSON.parse(store?.getItem(quizStorageKey(key)) ?? '{}') as QuizResults;
    return Object.values(results).some((result) => result !== undefined);
  } catch {
    return false;
  }
}

/** The first step not marked read, or undefined when every step is. */
export function nextUnread(
  steps: readonly Pick<TrackStep, 'key'>[],
  read: (key: string) => boolean = isRead,
): number | undefined {
  const index = steps.findIndex((step) => !read(step.key));
  return index === -1 ? undefined : index;
}

/**
 * Fills an element with a page-language string whose `{title}` may be in another language: the
 * title goes in its own element with `lang` and `dir`, a link when `href` is given.
 */
export function fillTitle(
  target: HTMLElement,
  template: string,
  title: string,
  { lang, dir }: Foreign = {},
  href?: string,
): void {
  const [before = '', after = ''] = template.split('{title}');
  const node = document.createElement(href ? 'a' : 'span');
  if (node instanceof HTMLAnchorElement && href) node.href = href;
  node.textContent = title;
  if (lang) node.lang = lang;
  if (dir) node.dir = dir;
  target.replaceChildren(before, node, after);
}
