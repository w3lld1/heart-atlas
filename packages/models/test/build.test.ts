import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateBytes } from 'gltf-validator';
import { describe, expect, it } from 'vitest';
import { buildLod, LODS } from '../src/build.ts';
import { checkStructureNodes, readModel } from '../src/model-check.ts';
import { assetsDir } from '../src/paths.ts';
import { parseStructures } from '../src/structures.ts';

const source = readFileSync(join(assetsDir, 'heart/heart.glb'));
const structures = parseStructures(readFileSync(join(assetsDir, 'heart/structures.yaml'), 'utf8'));

const built = new Map(
  await Promise.all(LODS.map(async (lod) => [lod.file, await buildLod(source, lod)] as const)),
);

function triangles(bytes: Uint8Array): Promise<number> {
  return readModel(bytes).then((doc) =>
    doc
      .getRoot()
      .listMeshes()
      .flatMap((m) => m.listPrimitives())
      .reduce((n, p) => n + (p.getIndices()?.getCount() ?? 0) / 3, 0),
  );
}

describe.each(LODS)('$file', (lod) => {
  const bytes = built.get(lod.file) ?? new Uint8Array();

  it('stays within budget and keeps a node for every structure', async () => {
    expect(bytes.byteLength).toBeLessThanOrEqual(lod.maxBytes);
    const doc = await readModel(bytes);
    expect(checkStructureNodes(doc, structures)).toEqual([]);
    expect(
      doc
        .getRoot()
        .listExtensionsUsed()
        .map((e) => e.extensionName),
    ).toContain('EXT_meshopt_compression');
  });

  it('passes glTF-Validator, which only cannot decode Meshopt', async () => {
    const report = await validateBytes(bytes);
    const problems = report.issues.messages.filter(
      (m) => m.severity <= 1 && m.code !== 'UNSUPPORTED_EXTENSION',
    );
    expect(report.issues.numErrors).toBe(0);
    expect(problems).toEqual([]);
  });
});

it('the low LOD is actually simplified', async () => {
  const [high, low] = await Promise.all(
    LODS.map((lod) => triangles(built.get(lod.file) ?? new Uint8Array())),
  );
  expect(low).toBeLessThan(0.8 * (high ?? 0));
});
