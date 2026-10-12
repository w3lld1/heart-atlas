import type { Messages } from '../i18n/messages.ts';
import { articleTypes } from './content.ts';

/** A place in the site menu; `path` is relative to the locale root and ends with "/". */
export interface NavItem {
  id: 'home' | 'heart-clock' | 'tracks' | (typeof articleTypes)[number];
  path: string;
}

/**
 * The site menu of one language: home, anatomy (its page with the 3D viewer exists in every
 * language), each other article section the language has, learning tracks when it has any, then
 * the heart clock.
 */
export function siteNav(sectionTypes: Iterable<string>, hasTracks = false): NavItem[] {
  const present = new Set(sectionTypes);
  return [
    { id: 'home', path: '' },
    ...articleTypes
      .filter((type) => type === 'anatomy' || present.has(type))
      .map((type) => ({ id: type, path: `${type}/` })),
    ...(hasTracks ? [{ id: 'tracks' as const, path: 'tracks/' }] : []),
    { id: 'heart-clock', path: 'heart-clock/' },
  ];
}

/**
 * Which menu item the page belongs to, for `aria-current`: "page" when the page is the item
 * itself, "true" when it is inside the item's section (an article under its list). The home item
 * only matches the home page. `pagePath` is the path after the locale segment.
 */
export function navCurrent(item: NavItem, pagePath: string): 'page' | 'true' | undefined {
  const path = pagePath.replace(/^\/+/, '').replace(/\/?$/, '/');
  const page = path === '/' ? '' : path;
  if (page === item.path) return 'page';
  if (item.path !== '' && page.startsWith(item.path)) return 'true';
  return undefined;
}

/** The menu label of an item in the page language. */
export function navLabel(t: Messages, item: NavItem): string {
  if (item.id === 'home') return t['nav.home'];
  if (item.id === 'heart-clock') return t['nav.clock'];
  if (item.id === 'tracks') return t['nav.tracks'];
  return t[`articles.type.${item.id}`];
}
