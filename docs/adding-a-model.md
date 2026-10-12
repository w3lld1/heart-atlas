# Adding a 3D model

The site has one model, the normal adult heart, built from [BodyParts3D](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html) by the `@heart-atlas/models` package. This page covers changing that model (adding or regrouping structures) and the license rules for any file you add under `assets/models/`. Design decisions and measurements are in the [stage 1 heart model spec](plans/2026-10-11-stage-1-heart-model.md).

## Licenses first

Everything in `assets/` is published under CC BY-SA 4.0, so a model or texture may only be added if its license allows that.

| Source license                                     | Allowed | Notes                                                  |
| -------------------------------------------------- | ------- | ------------------------------------------------------ |
| CC0 1.0                                            | yes     |                                                        |
| CC BY 4.0                                          | yes     | Keep the attribution.                                  |
| CC BY-SA 4.0                                       | yes     |                                                        |
| CC BY-SA 2.1 JP                                    | yes     | Allows a later version with the same elements.          |
| Any NC or ND license                               | no      | ND forbids adaptations; NC is incompatible with BY-SA. |
| No open license, "for education only", unknown     | no      |                                                        |

The allowlist is `ALLOWED_LICENSES` in [`packages/models/src/licenses.ts`](../packages/models/src/licenses.ts) (SPDX ids `CC0-1.0`, `CC-BY-4.0`, `CC-BY-SA-4.0`, `CC-BY-SA-2.1-JP`). Adding another license needs its own PR that explains why it is compatible.

### `assets/models/LICENSES.yaml`

Every file under `assets/models/` except YAML and Markdown needs an entry in [`assets/models/LICENSES.yaml`](../assets/models/LICENSES.yaml), and every entry needs a file. `packages/models/test/assets.test.ts` fails otherwise.

```yaml
- file: heart/heart.glb # path relative to assets/models/
  title: Heart (normal adult)
  license: CC-BY-SA-4.0 # license of this file, from the allowlist
  authors: [Heart Atlas contributors]
  derived_from: # third-party material it is made from
    - name: BodyParts3D 4.0
      url: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html # https only
      license: CC-BY-4.0 # from the allowlist
      attribution: 'BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International'
      also_published_as: CC-BY-SA-2.1-JP # optional; then attribution_alt is required
      attribution_alt: '…'
      attribution_alt_lang: ja # language of attribution_alt, required with it
      retrieved: 2026-10-11
      sha256: … # of the downloaded archive; must match heart/sources.yaml
  changes: >- # what was changed, as CC licenses require
    …
  notes: >- # optional, e.g. the source for hand-made parts
    …
```

`file`, `title`, `license` and `authors` are required. A source needs `name`, an `https` `url`, an allowed `license` and `attribution`. The site shows the attribution lines in the viewer and in the 3D embed.

## How the heart model is built

```
assets/models/heart/sources.yaml       pinned BodyParts3D archive (url, sha256, obj_dir)
assets/models/heart/structures.yaml    structures and the BodyParts3D elements of each
assets/models/heart/conduction.yaml    hand-made schematic conduction system
        │  pnpm --filter @heart-atlas/models assemble <obj dir>   (packages/models/src/assemble.ts)
        ▼
assets/models/heart/heart.glb          committed source model, one named node per structure
        │  pnpm models   (packages/models/src/build.ts, runs before every dev and build)
        ▼
apps/web/public/models/heart-lod0.glb, heart-lod1.glb, heart-poster.png
```

`build.ts` compresses with Meshopt and fails if a level of detail goes over its budget (`LODS` in `build.ts`: 3 MB / 300 000 triangles and 1.5 MB / 100 000 triangles).

## Adding or changing a structure

1. Edit [`assets/models/heart/structures.yaml`](../assets/models/heart/structures.yaml):
   - `id`: kebab-case English, side first (`left-atrium`), unique. Ids are a public contract: the viewer, the strings files and the embed's `?structure=` use them, so do not rename an existing id.
   - `kind: mesh` with `elements` (BodyParts3D element ids, the `.obj` files in the archive) and `fma` (the FMA concepts they belong to, taken from the archive's `partof_element_parts.txt`, not from memory). A `mesh` without `elements` must have an entry with the same id in `conduction.yaml`.
   - `kind: zone` with `meshes`: an empty anchor node; the viewer highlights the listed meshes together.
   - `group`: one of `GROUPS` in `packages/models/src/structures.ts` (`chamber`, `septum`, `valve`, `muscle`, `artery`, `vein`, `coronary-artery`, `cardiac-vein`, `conduction`).
2. For hand-made parts, edit [`assets/models/heart/conduction.yaml`](../assets/models/heart/conduction.yaml) (ellipsoids and tubes in BodyParts3D millimetres) and cite the anatomical source for the placement in a comment and in `notes` of `LICENSES.yaml`.
3. Add the name `structure.<id>` to every strings file: `apps/web/src/i18n/messages/*.json` and `apps/web/test/fixtures/i18n/qps-plocm.json`. `apps/web/test/heart-model.test.ts` checks English; `pnpm i18n:check` checks the rest.
4. Rebuild `heart.glb`. The BodyParts3D archive is not in the repository, so use the **models** workflow (`.github/workflows/models.yml`): run it from the Actions tab on your branch. It downloads the archive pinned in `sources.yaml`, checks its SHA-256, runs `assemble`, runs the `@heart-atlas/models` tests and pushes the new `heart.glb` to a branch `models/heart-rebuild-<run id>-<attempt>`. Open a PR from it or merge it into yours. To run it locally, download and unzip the archive yourself and pass the unpacked directory to `assemble`.
5. If the change alters what the model shows, update `changes` in `LICENSES.yaml`, and replace `heart/poster.png` (a front view of the model rendered with three.js, shown until the viewer loads) if the front view changed. No script in the repository renders the poster.

## Adding a different model

The pipeline and the viewer are written for the heart model (`heartModelUrls` in `apps/web/src/lib/heart-model.ts` loads `heart-lod0.glb` and `heart-lod1.glb`). A new model, for example a diseased heart, needs code changes and a short spec in `docs/plans/` first. Whatever the code, the license rules above apply to every file you add.

## Checks

```sh
pnpm vitest run --project @heart-atlas/models   # licenses, structures, glTF-Validator, LOD budgets
pnpm test                                        # everything, including the strings check for structures
pnpm build                                       # builds the LODs and the site
```
