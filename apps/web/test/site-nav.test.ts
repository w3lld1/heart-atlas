import { describe, expect, it } from 'vitest';
import en from '../src/i18n/messages/en.json';
import type { Messages } from '../src/i18n/messages.ts';
import { articleTypes } from '../src/lib/content.ts';
import { navCurrent, navLabel, siteNav } from '../src/lib/site-nav.ts';

describe('siteNav', () => {
  it('lists home, anatomy, the sections the language has, then the heart clock', () => {
    expect(siteNav(['diagnostic', 'disease', 'anatomy']).map((item) => item.path)).toEqual([
      '',
      'anatomy/',
      'disease/',
      'diagnostic/',
      'heart-clock/',
    ]);
  });

  it('keeps anatomy for a language without articles', () => {
    expect(siteNav([]).map((item) => item.id)).toEqual(['home', 'anatomy', 'heart-clock']);
  });

  it('adds learning tracks before the heart clock when the language has any', () => {
    expect(siteNav(['disease'], true).map((item) => item.id)).toEqual([
      'home',
      'anatomy',
      'disease',
      'tracks',
      'heart-clock',
    ]);
  });

  it('ignores types that are not article sections', () => {
    expect(siteNav(['search', 'embed']).map((item) => item.id)).toEqual([
      'home',
      'anatomy',
      'heart-clock',
    ]);
  });
});

describe('navCurrent', () => {
  const [home, anatomy, disease] = siteNav(['disease']);

  it('marks the page itself', () => {
    expect(home && navCurrent(home, '')).toBe('page');
    expect(home && navCurrent(home, '/')).toBe('page');
    expect(disease && navCurrent(disease, 'disease/')).toBe('page');
    expect(disease && navCurrent(disease, 'disease')).toBe('page');
  });

  it('marks the section of an article', () => {
    expect(anatomy && navCurrent(anatomy, 'anatomy/heart-valves/')).toBe('true');
    expect(disease && navCurrent(disease, 'disease/myocarditis/')).toBe('true');
  });

  it('marks home only on the home page', () => {
    expect(home && navCurrent(home, 'disease/')).toBeUndefined();
    expect(anatomy && navCurrent(anatomy, 'search/')).toBeUndefined();
  });

  it('does not match a section by a shared prefix', () => {
    expect(disease && navCurrent(disease, 'diseases-other/')).toBeUndefined();
  });
});

describe('navLabel', () => {
  it('has a string for every item', () => {
    const t: Messages = en;
    for (const item of siteNav(articleTypes, true)) expect(navLabel(t, item)).toBeTruthy();
  });
});
