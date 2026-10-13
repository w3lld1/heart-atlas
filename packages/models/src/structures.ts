import { parse } from 'yaml';

export const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const GROUPS = [
  'chamber',
  'septum',
  'valve',
  'muscle',
  'artery',
  'vein',
  'coronary-artery',
  'cardiac-vein',
  'conduction',
  /** A whole segmentation layer of a congenital model (assets/models/congenital/<id>.structures.yaml). */
  'layer',
] as const;
export type Group = (typeof GROUPS)[number];

export interface MeshStructure {
  id: string;
  kind: 'mesh';
  group: Group;
  fma?: string[];
  /** BodyParts3D element files; absent for meshes generated from conduction.yaml. */
  elements?: string[];
}

export interface ZoneStructure {
  id: string;
  kind: 'zone';
  group: Group;
  meshes: string[];
}

export type Structure = MeshStructure | ZoneStructure;

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

/** Parses and validates structures.yaml. Throws with every problem listed. */
export function parseStructures(text: string): Structure[] {
  const data: unknown = parse(text);
  if (!Array.isArray(data)) throw new Error('structures.yaml must be a list');
  const errors: string[] = [];
  const ids = new Set<string>();
  const structures: Structure[] = [];
  for (const [index, item] of data.entries()) {
    const entry = item as Record<string, unknown>;
    const id = entry['id'];
    const where = typeof id === 'string' ? id : `#${index}`;
    if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
      errors.push(`${where}: id must match ${ID_PATTERN}`);
      continue;
    }
    if (ids.has(id)) errors.push(`${id}: duplicate id`);
    ids.add(id);
    const group = entry['group'];
    if (!GROUPS.includes(group as Group)) errors.push(`${id}: unknown group ${String(group)}`);
    if (entry['kind'] === 'mesh') {
      const elements = entry['elements'];
      const fma = entry['fma'];
      if (elements !== undefined && !isStringArray(elements)) errors.push(`${id}: bad elements`);
      if (fma !== undefined && !isStringArray(fma)) errors.push(`${id}: bad fma`);
      structures.push({
        id,
        kind: 'mesh',
        group: group as Group,
        ...(isStringArray(fma) ? { fma } : {}),
        ...(isStringArray(elements) ? { elements } : {}),
      });
    } else if (entry['kind'] === 'zone') {
      const meshes = entry['meshes'];
      if (!isStringArray(meshes) || meshes.length === 0) {
        errors.push(`${id}: zone needs meshes`);
        continue;
      }
      structures.push({ id, kind: 'zone', group: group as Group, meshes });
    } else {
      errors.push(`${id}: kind must be mesh or zone`);
    }
  }
  const meshIds = new Set(structures.filter((s) => s.kind === 'mesh').map((s) => s.id));
  for (const s of structures) {
    if (s.kind !== 'zone') continue;
    for (const m of s.meshes) if (!meshIds.has(m)) errors.push(`${s.id}: unknown mesh ${m}`);
  }
  if (errors.length > 0) throw new Error(`Invalid structures.yaml:\n${errors.join('\n')}`);
  return structures;
}
