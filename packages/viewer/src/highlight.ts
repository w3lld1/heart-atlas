import type { ViewerStructure } from './types.ts';

/** Expands structure ids (zones included) into the mesh names to highlight. Unknown ids are dropped. */
export function meshesFor(
  ids: readonly string[],
  structures: readonly ViewerStructure[],
): Set<string> {
  const meshes = new Set<string>();
  for (const id of ids) {
    const s = structures.find((x) => x.id === id);
    if (!s) continue;
    if (s.kind === 'zone') for (const m of s.meshes ?? []) meshes.add(m);
    else meshes.add(s.id);
  }
  return meshes;
}

/** Groups structures in the order their groups first appear, for the structure list. */
export function groupStructures(
  structures: readonly ViewerStructure[],
): [group: string, items: ViewerStructure[]][] {
  const groups = new Map<string, ViewerStructure[]>();
  for (const s of structures) groups.set(s.group, [...(groups.get(s.group) ?? []), s]);
  return [...groups];
}
