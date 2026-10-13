# @heart-atlas/models

Builds and checks the 3D heart model. Spec: `docs/plans/2026-10-11-stage-1-heart-model.md`.

- `assets/models/heart/structures.yaml` lists the structures (ids are a public contract) and the BodyParts3D elements each one is built from.
- `assets/models/heart/conduction.yaml` holds the schematic conduction system.
- `pnpm --filter @heart-atlas/models assemble <obj dir>` writes `assets/models/heart/heart.glb`. The obj dir is the unpacked BodyParts3D archive pinned in `assets/models/heart/sources.yaml`; the `models` workflow in GitHub Actions does the download and opens a branch with the result.
- `assets/models/congenital/` holds patient models of congenital defects (spec `docs/plans/2026-10-12-congenital-models.md`). `node src/congenital.ts <id> <source dir>` prepares one from the NIH 3D Heart Library files (GLB or binary STL) pinned in `congenital/sources.yaml`, with the layers listed in `congenital/<id>.structures.yaml`; the sources are too large for the repository.
- `node src/build.ts <dir>` compresses every model in `MODELS` into `<name>-lod0.glb` and `<name>-lod1.glb`.
- `pnpm test` checks `assets/models/LICENSES.yaml` and that the model has a node for every structure.

The code is MIT; the model and the YAML data under `assets/` are CC BY-SA 4.0.
