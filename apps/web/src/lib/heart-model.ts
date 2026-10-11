import { parseLicenses } from '@heart-atlas/models/licenses';
import { parseStructures } from '@heart-atlas/models/structures';
import type { ViewerMessages, ViewerModels, ViewerStructure } from '@heart-atlas/viewer';
import { viewerMessageKeys } from '@heart-atlas/viewer';
import licensesYaml from '../../../../assets/models/LICENSES.yaml?raw';
import structuresYaml from '../../../../assets/models/heart/structures.yaml?raw';
import type { Messages } from '../i18n/messages.ts';

/** Files written by `pnpm models` (packages/models/src/build.ts) into public/models/. */
export function heartModelUrls(base: string): { models: ViewerModels; poster: string } {
  return {
    models: { high: `${base}models/heart-lod0.glb`, low: `${base}models/heart-lod1.glb` },
    poster: `${base}models/heart-poster.png`,
  };
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
 * published under two licenses gets both lines, since it is not settled which one applies.
 */
export function heartAttribution(): string {
  const { entries, errors } = parseLicenses(licensesYaml);
  const heart = entries.find((e) => e.file === 'heart/heart.glb');
  const sources =
    heart?.derived_from?.flatMap((d) =>
      d.attribution_alt ? [d.attribution, d.attribution_alt] : [d.attribution],
    ) ?? [];
  if (errors.length > 0 || sources.length === 0) {
    throw new Error(`LICENSES.yaml has no valid entry for heart/heart.glb: ${errors.join('; ')}`);
  }
  return sources.join('; ');
}

/** Viewer strings for a locale, with the model source filled into the attribution line. */
export function viewerMessages(t: Messages): ViewerMessages {
  const messages = Object.fromEntries(
    viewerMessageKeys.map((key) => [key, t[key]]),
  ) as ViewerMessages;
  messages['viewer.attribution'] = messages['viewer.attribution'].replace(
    '{source}',
    heartAttribution(),
  );
  return messages;
}
