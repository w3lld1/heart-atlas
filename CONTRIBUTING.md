# Contributing to Heart Atlas

Thank you for helping. Issues and pull requests are welcome in English or Russian. / Issue и PR можно писать на русском.

By contributing you agree that code is licensed under [MIT](LICENSE) and content (anything in `content/` and `assets/`) under [CC BY-SA 4.0](LICENSE-CONTENT). Please follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to help

- **Report a content error.** Use the [content error form](https://github.com/w3lld1/heart-atlas/issues/new?template=content-error.yml). Point to the article, the wrong statement and a source that shows the correct one.
- **Write or improve an article.** See "Medical content" below and [Adding an article](docs/adding-an-article.md).
- **Translate.** See "Adding a language" below.
- **Write code.** Pick an issue labelled `good first issue` or `help wanted`, or open an issue first for anything larger.
- **Review as a physician.** If you are a cardiologist or teach cardiology, open an issue titled "Medical reviewer". We will add you to the reviewer list once the review workflow is in place.

## How we work

1. **Spec before code.** A large feature starts with a plan in `docs/plans/YYYY-MM-DD-name.md`, agreed in an issue or PR before implementation.
2. **One feature, a series of small PRs.** Each PR links its issue (`Closes #N` or `Refs #N`) and does one thing.
3. **Branch from `main`.** Name branches `feat/…`, `fix/…`, `docs/…`, `chore/…`.
4. **Before asking for review**, run locally: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm i18n:check`, `pnpm build` and, for UI changes, `pnpm e2e` (after `pnpm build`). CI runs the same checks plus Lighthouse and the JS budget.
5. **Commits** follow [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`.
6. **The maintainer merges.** Review comments that take about half an hour to fix are fixed in the same PR; anything bigger becomes a separate issue.

## Guides

- [Architecture](docs/architecture.md): repository layout, how a page is built, CI and deploy.
- [Adding an article](docs/adding-an-article.md): file path, frontmatter, sources, MDX components, local checks.
- [Adding a language](docs/adding-a-language.md): locale registry, strings, right-to-left, the test locale.
- [Adding a 3D model](docs/adding-a-model.md): structures, the model build, license rules.
- [Adding a disease preset](docs/adding-a-disease-preset.md): heart clock presets and where they appear.
- [Accessibility](docs/accessibility.md): automated checks and the manual checklist.

## Medical content

Until physician reviewers join, trust comes from sources. The hard rules:

- Articles about a disease, diagnostic method or treatment need **at least two sources, at least one of them a clinical guideline** from an organization in `content/trusted-sources.yaml`.
- Journal articles need a DOI, textbooks an ISBN. Do not invent sources, DOIs or numbers.
- Never give individual treatment advice or doses for self-treatment.
- Keep the "not reviewed by a physician" notice (`review: null`) until a physician has reviewed the article.

The build rejects articles that break the schema. Details, fields and components: [Adding an article](docs/adding-an-article.md).

## Adding a language

Add an entry to the locale registry `apps/web/src/i18n/locales.ts`, translate `apps/web/src/i18n/messages/en.json` into `<code>.json` and check it with `pnpm i18n:check`. Articles can follow at your own pace; until then readers see the fallback language with a notice. Step by step: [Adding a language](docs/adding-a-language.md).

## Using Claude Code

The repository ships `.claude/settings.json`, which enables two plugins for everyone who opens the project in Claude Code:

- [ECC (Everything Claude Code)](https://github.com/affaan-m/ECC): agents and skills for planning, TDD, code review and security checks.
- [ponytail](https://github.com/DietrichGebert/ponytail): keeps the agent on the smallest solution that works; run `/ponytail-review` on your diff.

Claude Code asks you to trust the plugin marketplaces the first time. `CLAUDE.md` describes the project rules for the agent. Plugin hooks need Node.js on your PATH.
