# Architecture

How the repository is laid out and how a page gets from source files to GitHub Pages. Stage specs in [`plans/`](plans/) explain why things are the way they are; this page says where they are.

## Repository layout

| Path                   | What it is                                                                                                                                                                    | License         |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| `apps/web`             | The site: Astro pages, layouts, components, React islands, the post-build integration, unit tests (`test/`) and Playwright tests (`e2e/`).                                    | MIT             |
| `packages/heart-clock` | `@heart-atlas/heart-clock`: the cardiac cycle timer, synthetic ECG, heart sound events, left-heart pressures and the disease presets. Plain TypeScript, no DOM.               | MIT             |
| `packages/models`      | `@heart-atlas/models`: builds `heart.glb` from BodyParts3D, compresses it into the files the site loads, and validates `structures.yaml` and `LICENSES.yaml`.                  | MIT             |
| `packages/viewer`      | `@heart-atlas/viewer`: the 3D heart viewer, a React component on react-three-fiber with a poster image, keyboard control and structure highlighting.                           | MIT             |
| `content/`             | Articles as MDX (`content/<locale>/<type>/<slug>.mdx`) and the list of trusted source organizations (`trusted-sources.yaml`).                                                  | CC BY-SA 4.0    |
| `assets/`              | The 3D model and its data: `assets/models/heart/` and the license register `assets/models/LICENSES.yaml`.                                                                     | CC BY-SA 4.0    |
| `scripts/`             | Repository scripts, for now `check-dois.mjs` (checks every DOI in `content/` against Crossref).                                                                               | MIT             |
| `docs/`                | Contributor docs (this folder), [`accessibility.md`](accessibility.md) and the stage specs in `docs/plans/`.                                                                  | —               |

It is a pnpm workspace (`pnpm-workspace.yaml`). Packages export TypeScript sources directly (`exports` in each `package.json` points at `src/*.ts`), so there is no package build step. The root `vitest.config.ts` runs the Vitest projects of `apps/*`, `packages/*` and `scripts/`.

## Root scripts

From `package.json`:

| Command           | What it does                                                                                          |
| ----------------- | ----------------------------------------------------------------------------------------------------- |
| `pnpm dev`        | Builds the model files, then starts `astro dev`.                                                      |
| `pnpm build`      | Builds the model files, then `astro build` into `apps/web/dist`.                                      |
| `pnpm preview`    | Serves `apps/web/dist` with `astro preview`.                                                          |
| `pnpm lint`       | ESLint, `prettier --check` and Stylelint.                                                             |
| `pnpm format`     | `prettier --write .`                                                                                  |
| `pnpm typecheck`  | `typecheck` in every package (`astro check` for the site, `tsc --noEmit` for the packages).           |
| `pnpm test`       | All Vitest unit tests.                                                                                |
| `pnpm i18n:check` | Checks that every strings file has every key of `en.json`.                                            |
| `pnpm e2e`        | Playwright against `astro preview`; run `pnpm build` first.                                           |
| `pnpm lhci`       | Lighthouse CI with the thresholds in `apps/web/lighthouserc.json`; run `pnpm build` first.            |

`apps/web` adds `build:test-content`, `js-budget` and `models` (run them with `pnpm --filter @heart-atlas/web <script>`).

## How a page is built

`apps/web/astro.config.mjs` sets `site` and `base` from `SITE_URL` and `BASE_PATH` (default `https://w3lld1.github.io` and `/heart-atlas/`) and registers three integrations: MDX, React and the project's post-build integration. The output is a static site.

1. **Model files.** `pnpm build` and `pnpm dev` first run `pnpm models`, which calls `packages/models/src/build.ts` and writes `heart-lod0.glb`, `heart-lod1.glb` and `heart-poster.png` into `apps/web/public/models/`. See [Adding a 3D model](adding-a-model.md).
2. **Content collection.** `apps/web/src/content.config.ts` defines one collection, `articles`, loaded from the repository root `content/**/*.mdx` and validated with `createArticleSchema()` from `apps/web/src/lib/content.ts`. A frontmatter error stops the build. With `HA_TEST_CONTENT=1` the collection reads the fictional articles in `apps/web/test/fixtures/site-content/` instead.
3. **Routes.** Every page lives under `apps/web/src/pages/[locale]/` and `getStaticPaths` generates one copy per locale in the registry:
   - `index.astro`: home; `[type]/index.astro`: list of articles of one type; `[type]/[slug].astro`: an article.
   - `anatomy.astro`: the 3D viewer and the list of anatomy articles; `heart-clock.astro`: the heart clock with all presets.
   - `search/index.astro`, `offline.astro`.
   - `embed/`: pages for `<iframe>` embedding (below).
   - `apps/web/src/pages/index.astro` at the root only redirects to the default locale, because static hosting has no server redirects.
4. **Article pages.** `apps/web/src/lib/articles.ts` (`articlePages`) turns collection ids like `ru/disease/atrial-fibrillation` into one page per locale. If a locale has no translation, the page shows the first locale in its fallback chain that has one, with a notice and a canonical link to the original. The page renders the MDX with the components from `apps/web/src/components/article-components.ts`, the review notice, the source list and, when the frontmatter has `preset`, the heart clock monitor.
5. **Layouts.** `BaseLayout.astro` sets `lang` and `dir` from the registry, adds the header, search form, language switcher, footer and service worker registration. `searchable` marks `<main>` with `data-pagefind-body` so Pagefind indexes it. `EmbedLayout.astro` is the bare layout for embeds.
6. **Post-build.** `apps/web/integrations/post-build.ts` runs on `astro:build:done`, in this order:
   1. `search-index.ts`: Pagefind indexes the built HTML into `dist/pagefind/`.
   2. `pwa.ts` `writeManifests`: one `manifest.<locale>.webmanifest` per locale.
   3. `pwa.ts` `writeServiceWorker`: writes `dist/sw.js` from `service-worker.js` with a generated config (precache list, locales, a version hash). The build fails if the precache is over 5 MB.

### Locales and UI strings

- `apps/web/src/i18n/locales.ts` is the locale registry: `productionLocales` (code, native name, `dir`, `fallback`) and `defaultLocale`. Routes, manifests and the service worker all read it; no component hardcodes a locale code.
- `apps/web/src/i18n/registry.ts` validates the registry and computes fallback chains.
- UI strings are flat JSON files in `apps/web/src/i18n/messages/<locale>.json`; `en.json` is the reference key set and gives the `MessageKey` type. `getMessages(locale)` in `messages.ts` merges the fallback chain, so a missing key shows the fallback string.
- `apps/web/src/i18n/paths.ts` builds `${BASE_URL}<locale>/<path>` links. Always build internal links from `import.meta.env.BASE_URL`.

See [Adding a language](adding-a-language.md).

### Islands

Most of the site is static HTML. Interactive parts are React islands that load only on the pages that use them:

| Island                                               | Where                                                           | Loads with                       |
| ---------------------------------------------------- | --------------------------------------------------------------- | -------------------------------- |
| `HeartViewer` (`packages/viewer`)                    | `[locale]/anatomy.astro` (`cycle="own"`: heartbeat button), `[locale]/heart-clock.astro` (`cycle="page"`: beats with the clock) | `client:visible`; 3D on click on the heart clock page |
| `HeartModelEmbed` (`components/viewer/`)             | `[locale]/embed/heart-model.astro`                              | `client:visible`, 3D on click    |
| `HeartClockDemo` (`components/heart-clock/`)         | `[locale]/heart-clock.astro`, articles with `preset` (`ArticleClock.astro`) | `client:visible`     |
| `EcgEmbed` (`components/heart-clock/`)               | `[locale]/embed/ecg.astro`                                      | `client:load`                    |

The article diagrams (`components/diagrams/`) and the patient/student switch are not islands: diagrams are inline SVG with CSS animation and work without JavaScript. `apps/web/scripts/js-budget.ts` fails CI if an article page can load more than 100 KB of gzipped JavaScript.

### Embed routes

`apps/web/src/pages/[locale]/embed/`:

- `index.astro`: the code builder (pick a module, get `<iframe>` code).
- `ecg.astro`: the heart clock monitor; accepts `?preset=<id>` and `?rate=`.
- `heart-model.astro`: the 3D model; accepts `?structure=<id>` from `structures.yaml`.
- `[type]/[slug].astro`: any article (anatomy, disease, diagnostic) with its review notice and sources.

Query parameters are parsed with `apps/web/src/lib/embed.ts` (`parseEmbedParams`): each page lists the parameters it accepts with a parser, and anything else is ignored. Embed pages use `EmbedLayout.astro`: `noindex`, a canonical link to the full page, the disclaimer, credits and the license, and no service worker.

## CI and deploy

- `.github/actions/setup/action.yml`: installs Node from `.nvmrc`, pnpm from `packageManager` and the workspace dependencies.
- `.github/workflows/ci.yml` (pull requests and pushes to `main`): jobs `lint`, `types`, `unit`, `i18n`, `build` (with the internal link check `scripts/check-internal-links.mjs` and the JS budget), `e2e` and `lighthouse`. The e2e job runs twice, on the production build and with `HA_TEST_LOCALES=1`; each run checks both the real content and a `build:test-content` build with `HA_TEST_CONTENT=1`.
- `.github/workflows/deploy.yml` (pushes to `main`): builds with `SITE_URL` and `BASE_PATH` from `actions/configure-pages` and deploys `apps/web/dist` to GitHub Pages.
- `.github/workflows/links.yml` (weekly and manual): lychee checks links in Markdown and content YAML, and external links in MDX and Astro files (their relative links resolve only on the built site, so the `build` job checks them); `scripts/check-dois.mjs` checks DOIs. Problems go into an open issue titled "Битые ссылки".
- `.github/workflows/models.yml` (manual): rebuilds `heart.glb` from BodyParts3D and pushes it to a new branch.
- `.github/workflows/labels.yml`: syncs labels from `.github/labels.yml`.
