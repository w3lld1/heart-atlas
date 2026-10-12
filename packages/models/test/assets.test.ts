import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateBytes } from 'gltf-validator';
import { MODELS } from '../src/build.ts';
import { parseSources } from '../src/congenital.ts';
import { parseLicenses } from '../src/licenses.ts';
import { checkStructureNodes, readModel } from '../src/model-check.ts';
import { assetsDir } from '../src/paths.ts';
import { parseStructures } from '../src/structures.ts';
import { parse } from 'yaml';

// Data and docs next to the models; every other file (models, buffers, textures) needs an entry.
const NOT_A_MODEL = /\.(ya?ml|md|json)$/i;

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

const licenses = parseLicenses(readFileSync(join(assetsDir, 'LICENSES.yaml'), 'utf8'));

describe('assets/models/LICENSES.yaml', () => {
  it('follows the license rules', () => {
    expect(licenses.errors).toEqual([]);
  });

  it('has an entry for every model file and a file for every entry', () => {
    const files = listFiles(assetsDir)
      .filter((f) => !NOT_A_MODEL.test(f))
      .map((f) => relative(assetsDir, f).split('\\').join('/'));
    const registered = licenses.entries.map((e) => e.file);
    expect(files.filter((f) => !registered.includes(f))).toEqual([]);
    expect(registered.filter((f) => !existsSync(join(assetsDir, f)))).toEqual([]);
  });

  it('records the same BodyParts3D archive hash as sources.yaml', () => {
    const sources = parse(readFileSync(join(assetsDir, 'heart/sources.yaml'), 'utf8')) as {
      bodyparts3d: { sha256: string };
    };
    const heart = licenses.entries.find((e) => e.file === 'heart/heart.glb');
    const bp3d = heart?.derived_from?.find((d) => d.name.startsWith('BodyParts3D')) as
      { sha256?: string } | undefined;
    expect(bp3d?.sha256).toBe(sources.bodyparts3d.sha256);
  });
});

describe.each(MODELS)('$source', (model) => {
  const path = join(assetsDir, model.source);

  it('has one node per structure in its structures.yaml', async () => {
    const structures = parseStructures(readFileSync(join(assetsDir, model.structures), 'utf8'));
    const doc = await readModel(readFileSync(path));
    expect(checkStructureNodes(doc, structures)).toEqual([]);
  });

  it('passes glTF-Validator without errors', async () => {
    const report = await validateBytes(new Uint8Array(readFileSync(path)));
    const errors = report.issues.messages.filter((m) => m.severity === 0);
    expect(errors).toEqual([]);
  });
});

it('every congenital model has a pinned source', () => {
  const sources = parseSources(readFileSync(join(assetsDir, 'congenital/sources.yaml'), 'utf8'));
  const congenital = MODELS.filter((m) => m.source.startsWith('congenital/'));
  expect(congenital.map((m) => m.name).sort()).toEqual(Object.keys(sources).sort());
  for (const m of congenital) {
    const entry = licenses.entries.find((e) => e.file === m.source);
    const source = sources[m.name];
    expect(entry?.derived_from?.map((d) => d.sha256)).toContain(source?.sha256);
  }
});
