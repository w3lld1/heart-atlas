import { parseLicenses } from '@heart-atlas/models/licenses';
import { parseStructures } from '@heart-atlas/models/structures';
import type {
  AttributionPart,
  ViewerMessages,
  ViewerModels,
  ViewerStructure,
} from '@heart-atlas/viewer';
import { viewerMessageKeys } from '@heart-atlas/viewer';
import anchorsJson from '../../../../assets/models/heart/anchors.json';
import licensesYaml from '../../../../assets/models/LICENSES.yaml?raw';
import congenitalSourcesYaml from '../../../../assets/models/congenital/sources.yaml?raw';
import structuresYaml from '../../../../assets/models/heart/structures.yaml?raw';
import { parse } from 'yaml';
import type { Messages } from '../i18n/messages.ts';

/** Files written by `pnpm models` (packages/models/src/build.ts) into public/models/. */
export function heartModelUrls(base: string): {
  models: ViewerModels;
  poster: string;
  heroPoster: string;
} {
  return {
    models: { high: `${base}models/heart-lod0.glb`, low: `${base}models/heart-lod1.glb` },
    // The viewer shows the transparent WebP poster, taken with its own camera: 33 KB, not 122.
    poster: `${base}models/heart-hero-poster.webp`,
    heroPoster: `${base}models/heart-hero-poster.webp`,
  };
}

/** The home page poster: its size and where each visible structure is on it (render-poster.ts). */
export function heroPoster(): {
  width: number;
  height: number;
  anchors: Partial<Record<string, { x: number; y: number; pixels: number }>>;
} {
  return anchorsJson;
}

/** Congenital models built by packages/models (MODELS in build.ts): docs/plans/2026-10-12-congenital-models.md. */
export const congenitalModelIds = ['tetralogy-of-fallot'] as const;
export type CongenitalModelId = (typeof congenitalModelIds)[number];

export function isCongenitalModelId(id: string): id is CongenitalModelId {
  return (congenitalModelIds as readonly string[]).includes(id);
}

/** LOD files and poster of a congenital model, written by `pnpm models` into public/models/. */
export function congenitalModelUrls(
  base: string,
  id: CongenitalModelId,
): { models: ViewerModels; poster: string } {
  return {
    models: { high: `${base}models/${id}-lod0.glb`, low: `${base}models/${id}-lod1.glb` },
    poster: `${base}models/${id}-poster.webp`,
  };
}

/** Layer lists of the congenital models, congenital/<id>.structures.yaml, keyed by model id. */
const congenitalStructuresYaml = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>('../../../../assets/models/congenital/*.structures.yaml', {
      query: '?raw',
      import: 'default',
      eager: true,
    }),
  ).map(([path, text]) => [path.replace(/^.*\/(.+)\.structures\.yaml$/, '$1'), text]),
);

const congenitalSources = (): Record<string, { entry?: unknown; section?: unknown }> =>
  parse(congenitalSourcesYaml) as Record<string, { entry?: unknown; section?: unknown }>;

/** Every model pinned in congenital/sources.yaml, including ones no article shows yet. */
export function congenitalSourceIds(): string[] {
  return Object.keys(congenitalSources());
}

/** The NIH 3D Heart Library record a congenital model comes from (congenital/sources.yaml). */
export function congenitalModelEntry(id: CongenitalModelId): string {
  const entry = congenitalSources()[id]?.entry;
  if (typeof entry !== 'string' || !entry.startsWith('https://')) {
    throw new Error(`congenital/sources.yaml has no entry URL for ${id}`);
  }
  return entry;
}

/** Whether the viewer opens a congenital model cut along the frontal plane (congenital/sources.yaml). */
export function congenitalSection(id: string): 'frontal' | undefined {
  return congenitalSources()[id]?.section === 'frontal' ? 'frontal' : undefined;
}

/** Layers of a congenital model, with names in the reader's language. */
export function congenitalStructures(t: Messages, id: string): ViewerStructure[] {
  const yaml = congenitalStructuresYaml[id];
  if (yaml === undefined) throw new Error(`No congenital/${id}.structures.yaml`);
  return parseStructures(yaml).map((s) => ({
    id: s.id,
    label: t[`structure.${s.id}` as keyof Messages] ?? s.id,
    group: s.group,
    kind: s.kind,
  }));
}

/** Ids of the structures in the given groups of structures.yaml. */
export function structureIds(groups: readonly string[]): string[] {
  return parseStructures(structuresYaml)
    .filter((s) => groups.includes(s.group))
    .map((s) => s.id);
}

/** Structures from structures.yaml with names in the reader's language. */
export function heartStructures(t: Messages): ViewerStructure[] {
  return parseStructures(structuresYaml).map((s) => ({
    id: s.id,
    label: t[`structure.${s.id}` as keyof Messages] ?? s.id,
    group: s.group,
    kind: s.kind,
    ...(s.kind === 'zone' ? { meshes: s.meshes } : {}),
  }));
}

/**
 * The attributions the source licenses require, exactly as recorded in LICENSES.yaml. A source
 * published under two licenses gets both lines, since it is not settled which one applies; the
 * second carries its language, so pages can mark it with lang. A model made of several source
 * files has one record per file with the same attribution, shown once.
 */
export function heartAttribution(file = 'heart/heart.glb'): AttributionPart[] {
  const { entries, errors } = parseLicenses(licensesYaml);
  const model = entries.find((e) => e.file === file);
  const sources =
    model?.derived_from?.flatMap((d) =>
      d.attribution_alt
        ? [
            { text: d.attribution },
            {
              text: d.attribution_alt,
              ...(d.attribution_alt_lang ? { lang: d.attribution_alt_lang } : {}),
            },
          ]
        : [{ text: d.attribution }],
    ) ?? [];
  if (errors.length > 0 || sources.length === 0) {
    throw new Error(`LICENSES.yaml has no valid entry for ${file}: ${errors.join('; ')}`);
  }
  return sources.filter((part, i) => sources.findIndex((p) => p.text === part.text) === i);
}

/**
 * Viewer strings for a locale. `viewer.attribution` keeps its `{source}` placeholder: the viewer
 * fills in `heartAttribution()` from its `attribution` prop, each part with its language.
 */
export function viewerMessages(t: Messages): ViewerMessages {
  return Object.fromEntries(viewerMessageKeys.map((key) => [key, t[key]])) as ViewerMessages;
}
