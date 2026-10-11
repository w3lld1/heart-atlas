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

An animated schematic with a caption per state. Most diagrams switch between `normal` and `disease`; some use `diastole` / `systole`, `recording` / `symptom`, or a single `scheme` with no switch (`diagramStates` in `apps/web/src/components/diagrams/index.ts`). The captions are medical text, so they live in the article, one slot per state, and carry `<Cite>`; a slot for a state the diagram does not have fails the build:

```mdx
<Diagram name="aortic-stenosis">
  <p slot="normal">Normally blood leaves the left ventricle through a valve with three leaflets.<Cite n={2} /></p>
  <p slot="disease">In aortic stenosis the aortic opening is narrowed.<Cite n={2} /></p>
</Diagram>
```

`name` must be a key of `diagrams` in `apps/web/src/components/diagrams/index.ts`; an unknown name fails the build. A new diagram is an Astro component with inline SVG in `components/diagrams/` (props `locale` and `uid`), registered in `index.ts` (and in `customStates` if it does not use normal / disease), with its labels in the strings files. Elements marked `data-only="<state>"` show only in that state. A diagram shows only what the article text says and its sources support. Design rules: [article visuals spec](plans/2026-10-11-article-visuals.md).

### `<EcgMonitor>`

The live heart clock monitor inside an article. `preset` is the preset to start with; `presets` lists the presets the reader can switch between (without it there is no switch). Children are an optional caption, which is article text and carries `<Cite>`:

```mdx
<EcgMonitor preset="normal" presets={['normal', 'atrial-fibrillation']}>
  The P wave disappears in atrial fibrillation.<Cite n={1} />
</EcgMonitor>
```

An unknown preset id fails the build. A disease article with `preset` in its frontmatter already shows the monitor after the text, so it does not need `<EcgMonitor>` as well.

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
