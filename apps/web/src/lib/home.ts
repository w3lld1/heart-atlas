import type { MessageKey } from '../i18n/messages.ts';

/** A card around the heart on the home page, from the table in docs/plans/2026-10-12-home-redesign.md. */
export interface StageCard {
  id: 'anatomy' | 'chambers' | 'ecg' | 'valves' | 'flow' | 'disease';
  /** Article (`type/slug`) or section (`type`) the card links to. */
  target: string;
  /** Where the card links when the article is not written in the page's language. */
  fallback: string;
  /** Structure groups of structures.yaml lit on the model; none for the whole heart. */
  groups: readonly string[];
  /** Everything else turns see-through, so structures inside the heart can be seen. */
  ghost: boolean;
  /** Structure the card's line points at: a part of it visible on the poster (anchors.json). */
  anchor: string;
  title: MessageKey;
  note: MessageKey;
}

export const stageCards: readonly StageCard[] = [
  {
    id: 'anatomy',
    target: 'anatomy/heart-structure',
    fallback: 'anatomy',
    groups: [],
    ghost: false,
    anchor: 'left-ventricle',
    title: 'home.card.anatomy',
    note: 'home.card.anatomyNote',
  },
  {
    id: 'chambers',
    target: 'anatomy/heart-chambers',
    fallback: 'anatomy',
    groups: ['chamber'],
    ghost: false,
    anchor: 'right-ventricle',
    title: 'home.card.chambers',
    note: 'home.card.chambersNote',
  },
  {
    id: 'ecg',
    target: 'diagnostic/ecg',
    fallback: 'diagnostic',
    groups: ['conduction'],
    ghost: true,
    anchor: 'sa-node',
    title: 'home.card.ecg',
    note: 'home.card.ecgNote',
  },
  {
    id: 'valves',
    target: 'anatomy/heart-valves',
    fallback: 'anatomy',
    groups: ['valve'],
    ghost: true,
    anchor: 'pulmonary-valve',
    title: 'home.card.valves',
    note: 'home.card.valvesNote',
  },
  {
    id: 'flow',
    target: 'anatomy/coronary-circulation',
    fallback: 'anatomy',
    groups: ['coronary-artery', 'cardiac-vein'],
    ghost: false,
    anchor: 'right-coronary-artery',
    title: 'home.card.flow',
    note: 'home.card.flowNote',
  },
  {
    id: 'disease',
    target: 'disease',
    fallback: 'disease',
    groups: [],
    ghost: false,
    anchor: 'left-atrium',
    title: 'home.card.disease',
    note: 'home.card.diseaseNote',
  },
];

export interface Anchor {
  /** Share of the poster width, from the left edge. */
  x: number;
  /** Share of the poster height, from the top edge. */
  y: number;
}

/**
 * Path of a card's link, relative to the locale root. An article written in another language
 * falls back to its section; a section with no article in the language has no card (null).
 */
export function cardPath(
  card: Pick<StageCard, 'target' | 'fallback'>,
  has: { article: (path: string) => boolean; section: (type: string) => boolean },
): string | null {
  if (card.target.includes('/')) {
    if (has.article(card.target)) return `${card.target}/`;
  } else if (has.section(card.target)) {
    return `${card.target}/`;
  }
  return has.section(card.fallback) ? `${card.fallback}/` : null;
}

/** Cards of the "key sections" row on the home page. */
export type SectionId =
  'anatomy' | 'disease' | 'diagnostic' | 'model' | 'clock' | 'sounds' | 'code';
