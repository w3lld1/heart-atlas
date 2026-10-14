# Adding an article

Articles are MDX files in `content/`, licensed CC BY-SA 4.0. The build validates every article against the schema in `apps/web/src/lib/content.ts` and stops on any error, so most rules on this page are enforced, not just recommended. The source policy is described in the [stage 0 spec](plans/2026-10-11-stage-0-foundation.md#политика-источников).

## Rules

No physician reviews the articles yet, so trust comes from sources:

- An article of type `disease`, `diagnostic` or `treatment` needs **at least two sources, at least one of them a clinical guideline** from an organization in [`content/trusted-sources.yaml`](../content/trusted-sources.yaml). Any article needs at least one source.
- Journal reviews need a DOI. Textbooks need an ISBN with a valid check digit. Reference works (for example StatPearls, MSD Manuals) must come from the trusted list.
- Do not invent sources, DOIs or numbers. If you cannot check a fact against a source, leave it out.
- Never give individual treatment advice or doses for self-treatment.
- Every article has two levels: for patients in plain language and for students with terminology. The student level may add detail (pathophysiology, classification, criteria) but must never contradict the patient level.
- Keep `review: null` until a physician has reviewed the article. Pages then show the "not reviewed by a physician" notice; do not remove it.

## File path

```
content/<locale>/<type>/<slug>.mdx
```

- `<locale>` is a code from the locale registry (`apps/web/src/i18n/locales.ts`).
- `<type>` is one of `anatomy`, `disease`, `diagnostic`, `treatment` and must match `type` in the frontmatter.
- `<slug>` is kebab-case (`^[a-z0-9]+(-[a-z0-9]+)*$`) and is the same in every language: `content/ru/disease/heart-failure.mdx` and `content/en/disease/heart-failure.mdx` are translations of one article.

The page URL is `/<locale>/<type>/<slug>/` under the site base. `apps/web/test/content.test.ts` checks the path layout.

## Frontmatter

```yaml
---
title: Aortic stenosis
description: What aortic stenosis is, why it develops, how it is detected and which treatment approaches clinical guidelines describe.
type: disease
preset: aortic-stenosis
aliases:
  - AS
  - aortic valve stenosis
sources:
  - tier: guideline
    org: esc
    title: 2025 ESC/EACTS Guidelines for the management of valvular heart disease
    year: 2025
    doi: 10.1093/eurheartj/ehaf194
    url: https://doi.org/10.1093/eurheartj/ehaf194
  - tier: guideline
    org: nice
    title: 'Heart valve disease presenting in adults: investigation and management (NG208)'
    year: 2021
    url: https://www.nice.org.uk/guidance/ng208
sources_checked: 2026-10-11
review: null
---
```

Unknown fields are rejected.

| Field             | Required | Rules                                                                                                                                                                                         |
| ----------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`           | yes      | Non-empty.                                                                                                                                                                                    |
| `description`     | yes      | Non-empty. Used as the page description.                                                                                                                                                      |
| `type`            | yes      | `anatomy`, `disease`, `diagnostic` or `treatment`; same as the folder.                                                                                                                        |
| `aliases`         | no       | Other names, abbreviations and old terms, in the article's language. Search finds the article by them; they are not shown on the page but can appear in search snippets. No duplicates, and none may repeat the title (case-insensitive). |
| `sources`         | yes      | List of sources, numbered from 1 in the order given. See below.                                                                                                                               |
| `sources_checked` | yes      | Date you last checked the sources (`YYYY-MM-DD`), not in the future. Tests warn when it is older than two years.                                                                             |
| `review`          | no       | `null` (default) or `{ reviewer, date }` once a physician has reviewed the article.                                                                                                           |
| `preset`          | no       | A heart clock preset id other than `normal` (see `presetIds` in `packages/heart-clock/src/presets.ts`). The page then shows the ECG monitor with a normal / disease switch. See [Adding a disease preset](adding-a-disease-preset.md). |
| `morePresets`     | no       | More preset ids for the same switch, after `preset` and its state after treatment, for an article about several kinds of one disease (for example `[av-block-second-degree-mobitz-1, av-block-second-degree-mobitz-2]`). Each brings its own state after treatment (unless `afterTreatment: false`). Needs `preset`; the same ids are allowed as for `preset`, without repeats, drawn in the same lead as `preset`. |
| `wiggers` | no | `false` hides the Wiggers diagram under the heart clock. It draws the left ventricle as the one that pumps to the body, so an article where the right ventricle does (corrected transposition) turns it off. Needs `preset`; the preset's description should not refer to the diagram. |
| `afterTreatment` | no | `false` leaves the states after treatment (`presetTreated`) out of the switch. Their descriptions are written for a usual heart, so an article about a heart built differently (corrected transposition) turns them off. Needs a preset with a state after treatment. |

### Sources

Each source has these fields:

| Field   | Required | Rules                                                                    |
| ------- | -------- | ------------------------------------------------------------------------ |
| `tier`  | yes      | `guideline`, `review`, `textbook` or `reference`.                        |
| `org`   | depends  | An id from `content/trusted-sources.yaml`. Required for `guideline` and `reference`, and the organization's tier in that file must match. |
| `title` | yes      | Title in the language of publication.                                    |
| `year`  | yes      | Whole number from 1900 to the current year.                              |
| `doi`   | depends  | `10.<digits>/<suffix>`. Required for `review`.                           |
| `isbn`  | depends  | ISBN-10 or ISBN-13 with a valid check digit. Required for `textbook`.     |
| `url`   | no       | Must be `https`.                                                         |

Every source needs at least one of `doi`, `isbn` or `url`.

### Trusted sources

[`content/trusted-sources.yaml`](../content/trusted-sources.yaml) maps an organization id to its name and tier (`guideline` or `reference`). It lists ESC, AHA/ACC, NICE, the Russian Ministry of Health, WHO, StatPearls and MSD Manuals. Joint documents count under the society that publishes them. Change this list only in a PR that explains why.

## Body

MDX articles use these components without importing them (they are passed by `apps/web/src/components/article-components.ts`):

### `<Cite>`

Marks a statement with the numbers of the sources that support it, as numbered in `sources`:

```mdx
Blood speeds up through the valve.<Cite n={2} />
Once symptoms appear, the risk rises sharply.<Cite n={[1, 2]} />
```

A number outside `1..sources.length` fails the build. Put a `<Cite>` after every medical statement.

### `<Patient>` and `<Student>`

The two reading levels. Write them as blocks with blank lines inside, and keep shared text and section headings outside them:

```mdx
## Symptoms

<Patient>

The most common first sign is breathlessness on exertion.<Cite n={2} />

</Patient>

<Student>

Text with terminology.<Cite n={2} />

</Student>
```

The level switch hides one level when JavaScript runs; without JavaScript both are shown with labels.

### `<Diagram>`

An animated schematic with a caption per state. Most diagrams switch between `normal` and `disease`; some use `diastole` / `systole`, `recording` / `symptom`, `normal` / `rbbb` / `lbbb` (bundle branch block), or a single `scheme` with no switch (`diagramStates` in `apps/web/src/components/diagrams/index.ts`). The captions are medical text, so they live in the article, one slot per state, and carry `<Cite>`; a slot for a state the diagram does not have fails the build:

```mdx
<Diagram name="aortic-stenosis">
  <p slot="normal">Normally blood leaves the left ventricle through a valve with three leaflets.<Cite n={2} /></p>
  <p slot="disease">In aortic stenosis the aortic opening is narrowed.<Cite n={2} /></p>
</Diagram>
```

`name` is the diagram's file name in kebab case: `components/diagrams/AvBlock.astro` is `av-block`; an unknown name fails the build. A new diagram is an Astro component with inline SVG in `components/diagrams/` (props `locale` and `uid`). The file is all it takes: `diagrams` in `index.ts` finds every component in the folder, so there is no list to edit. Only a diagram that does not use normal / disease also goes into `customStates` in `index.ts`, in alphabetical order. Its labels go in the strings files (see [Shared files](#shared-files)). Elements marked `data-only="<state>"` show only in that state. A diagram shows only what the article text says and its sources support. Design rules: [article visuals spec](plans/2026-10-11-article-visuals.md).

#### After treatment

A disease diagram can show a third state, "After treatment", next to Normal and Disease: for example a closed septal defect, a replaced valve or a ligated duct. It shows what an intervention changes and why, not how to treat anyone. Rules: [after-treatment spec](plans/2026-10-12-after-treatment-mode.md).

- **The art** shows what was done (a patch, an occluder, a valve prosthesis) and what stays after it according to the sources. It is not a copy of Normal, names no device brands, and does not prefer one method when the sources describe several.
- **The caption** describes the result: what is closed, replaced or restored. It promises no cure, does not say who needs which intervention, and gives no doses. When the sources describe several methods, it says that the doctor chooses the method. It cites at least one source of the article with `tier: guideline` that describes this intervention.
- **One PR does it all.** A diagram shows the same states in every article, so the registry, the art and the captions in every article and language that uses the diagram change together.

Steps:

1. In `customStates` in `apps/web/src/components/diagrams/index.ts`, give the diagram the `withTreatment` set (Normal, Disease, After treatment; starts on Disease).
2. In the diagram component, draw the state with elements marked `data-only="treated"` and `<text>` labels for them (empty `<text>` fails the tests). Shared outlines stay unmarked.
3. Update the accessible name `diagram.<name>.title` in every strings file so it describes all three states.
4. Find the articles with `grep -rl 'name="<diagram>"' content` and add the caption to each `<Diagram>` in every language:

```mdx
<Diagram name="atrial-septal-defect">
  <p slot="normal">…</p>
  <p slot="disease">…</p>
  <p slot="treated">…what the intervention closed, replaced or restored, as the cited guideline describes it.<Cite n={1} /></p>
</Diagram>
```

5. `pnpm build` fails when a diagram with the treated state has no treated caption. `pnpm test` fails on a missing caption too, and when the caption cites no guideline source of the article. The article e2e must pass.

### `<EcgMonitor>`

The live heart clock monitor inside an article. `preset` is the preset to start with; `presets` lists the presets the reader can switch between (without it there is no switch). Children are an optional caption, which is article text and carries `<Cite>`:

```mdx
<EcgMonitor preset="normal" presets={['normal', 'atrial-fibrillation']}>
  The P wave disappears in atrial fibrillation.<Cite n={1} />
</EcgMonitor>
```

An unknown preset id fails the build. A disease article with `preset` in its frontmatter already shows the monitor after the text, so it does not need `<EcgMonitor>` as well.

### `<HeartSounds>`

The heart sounds player: normal S1 and S2 next to the murmur of a valve disease, synthesised in step with the heart clock (docs/plans/2026-10-13-heart-sounds.md). `sound` is one of `aortic-stenosis`, `aortic-regurgitation`, `mitral-stenosis`, `mitral-regurgitation`, `mitral-valve-prolapse` (or `normal`). It renders as a framed block «Послушайте сердце» / “Listen to the heart”; put it at the end of the diagnosis section, after its text. The player cites the sources of each sound by their numbers in the article's source list, so every source in `heart-sounds/sources.ts` for the article's sound and for `normal` must be in the article's `sources` (the build names any that is missing; add it at the end of the list so existing numbers stay). Children are an optional caption.

```mdx
<HeartSounds sound="aortic-stenosis" />
```

An unknown sound fails the build. Adding a new sound means adding it to `heart-sounds/auscultation.ts` with sources, which is app work, not article work.

## Translations

Translate an article by adding a file with the same `<type>/<slug>.mdx` under another locale. Give each translation its own `aliases` in that language. Until a translation exists, the page in that locale shows the article from the fallback language with a notice. See [Adding a language](adding-a-language.md).

## Check locally

Requirements: Node 24 (`.nvmrc`) and pnpm (`packageManager` in `package.json`).

```sh
pnpm install
pnpm dev          # http://localhost:4321/heart-atlas/ ; reloads on save
pnpm test         # schema, file paths and <Cite> numbers for every article
pnpm build        # full build; fails on any frontmatter error
```

To run the end-to-end tests too:

```sh
pnpm --filter @heart-atlas/web exec playwright install chromium
pnpm build && pnpm e2e
```

The content error form on GitHub (`.github/ISSUE_TEMPLATE/content-error.yml`) is where readers report mistakes; the "not reviewed" notice on every article links to it.

## Shared files

Several articles are often written at the same time, so an article touches as few shared files as it can, and where it must, it adds lines in their sorted place rather than at the end:

- A diagram is its own file in `apps/web/src/components/diagrams/`; nothing registers it. The folder holds only diagrams, and file names are PascalCase words without acronyms (`WpwSyndrome.astro`, not `WPWSyndrome.astro`), since the name comes from the file.
- Strings files (`apps/web/src/i18n/messages/*.json`, `apps/web/test/fixtures/i18n/qps-plocm.json`) keep their keys sorted. Add the new keys anywhere and run `pnpm i18n:sort`; `pnpm i18n:check` (and CI) fails on unsorted or repeated keys. Two articles then touch different lines unless their keys sort next to each other.
- Lists keyed by article in tests and code are sorted, and a new entry goes in its alphabetical place, for example `customStates`.
- The 3D model e2e (`apps/web/e2e/article-model.spec.ts`) reads the structures from each disease and diagnostic article's `<HeartModel highlight={[...]}>`, so a new article with the model adds no line there. Write the ids as a literal list of quoted strings on that tag, with one model per article, as the other articles do; the test fails when it cannot read the list.
- Article PRs do not edit `CHANGELOG.md`; the release PR writes its section.
- A new disease needs its slug in a group of the disease catalogue, `apps/web/src/lib/disease-groups.ts` (one line in its alphabetical place; the unit test fails otherwise). Slugs of planned articles are often listed there already.
- A heart clock preset also touches shared lists (`presetIds` and the maps after it in `packages/heart-clock/src/presets.ts`, `presetShape` in `packages/viewer/src/disease.ts`, `presetSources`, `apps/web/e2e/ecg-presets.spec.ts`, the curves snapshot). Presets are the app stream's work ([Adding a disease preset](adding-a-disease-preset.md)), so they are not added from article PRs.
- When a merge does conflict in a strings file, keep both sides and run `pnpm i18n:sort`: it drops a key repeated with the same value and refuses one repeated with different values.
