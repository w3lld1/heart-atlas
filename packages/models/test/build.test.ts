import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateBytes } from 'gltf-validator';
import { describe, expect, it } from 'vitest';
import { buildLod, LODS, lodFile, MODELS } from '../src/build.ts';
import { checkStructureNodes, readModel } from '../src/model-check.ts';
import { assetsDir } from '../src/paths.ts';
import { parseStructures } from '../src/structures.ts';

const cases = MODELS.flatMap((model) =>
  LODS.map((lod) => ({ model, lod, file: lodFile(model, lod) })),
);

const built = new Map(
  await Promise.all(
    MODELS.map(async (model) => {
      const source = readFileSync(join(assetsDir, model.source));
      const lods = await Promise.all(LODS.map((lod) => buildLod(source, lod, model.simplifyError)));
      return lods.map(
        (bytes, i) => [lodFile(model, LODS[i] as (typeof LODS)[number]), bytes] as const,
      );
    }),
  ).then((lists) => lists.flat()),
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

describe.each(cases)('$file', ({ model, lod, file }) => {
  const bytes = built.get(file) ?? new Uint8Array();
  const structures = parseStructures(readFileSync(join(assetsDir, model.structures), 'utf8'));

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

it.each(MODELS)('the low LOD of $name is actually simplified', async (model) => {
  const [high, low] = await Promise.all(
    LODS.map((lod) => triangles(built.get(lodFile(model, lod)) ?? new Uint8Array())),
  );
  expect(low).toBeLessThan(0.8 * (high ?? 0));
});
