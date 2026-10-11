import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildLod, LODS } from '../src/build.ts';
import { checkStructureNodes, readModel } from '../src/model-check.ts';
import { assetsDir } from '../src/paths.ts';
import { parseStructures } from '../src/structures.ts';

const source = readFileSync(join(assetsDir, 'heart/heart.glb'));
const structures = parseStructures(readFileSync(join(assetsDir, 'heart/structures.yaml'), 'utf8'));

describe.each(LODS)('$file', (lod) => {
  it('stays within budget and keeps a node for every structure', async () => {
    const bytes = await buildLod(source, lod);
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
});
