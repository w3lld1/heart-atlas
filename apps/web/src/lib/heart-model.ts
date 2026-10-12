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
import structuresYaml from '../../../../assets/models/heart/structures.yaml?raw';
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
 * second carries its language, so pages can mark it with lang.
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
  return sources;
}

/**
 * Viewer strings for a locale. `viewer.attribution` keeps its `{source}` placeholder: the viewer
 * fills in `heartAttribution()` from its `attribution` prop, each part with its language.
 */
export function viewerMessages(t: Messages): ViewerMessages {
  return Object.fromEntries(viewerMessageKeys.map((key) => [key, t[key]])) as ViewerMessages;
}
