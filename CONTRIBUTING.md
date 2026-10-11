# Contributing to Heart Atlas

Thank you for helping. Issues and pull requests are welcome in English or Russian. / Issue и PR можно писать на русском.

By contributing you agree that code is licensed under [MIT](LICENSE) and content (anything in `content/` and `assets/`) under [CC BY-SA 4.0](LICENSE-CONTENT). Please follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to help

- **Report a content error.** Use the [content error form](https://github.com/w3lld1/heart-atlas/issues/new?template=content-error.yml). Point to the article, the wrong statement and a source that shows the correct one.
- **Write or improve an article.** See "Medical content" below.
- **Translate.** See "Adding a language" below.
- **Write code.** Pick an issue labelled `good first issue` or `help wanted`, or open an issue first for anything larger.
- **Review as a physician.** If you are a cardiologist or teach cardiology, open an issue titled "Medical reviewer". We will add you to the reviewer list once the review workflow is in place.

## How we work

1. **Spec before code.** A large feature starts with a plan in `docs/plans/YYYY-MM-DD-name.md`, agreed in an issue or PR before implementation.
2. **One feature, a series of small PRs.** Each PR links its issue (`Closes #N` or `Refs #N`) and does one thing.
3. **Branch from `main`.** Name branches `feat/…`, `fix/…`, `docs/…`, `chore/…`.
4. **Before asking for review**, run locally: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` and, for UI changes, `pnpm test:e2e`. CI runs the same checks. (These scripts are added during stage 0; until then CI is not set up.)
5. **Commits** follow [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`.
6. **The maintainer merges.** Review comments that take about half an hour to fix are fixed in the same PR; anything bigger becomes a separate issue.

## Medical content

Until physician reviewers join, trust comes from sources:

- Articles about a disease, diagnostic method or treatment need **at least two sources, at least one of them a clinical guideline** from an organization in `content/trusted-sources.yaml` (ESC, AHA/ACC, NICE, the Russian Ministry of Health, WHO).
- Journal articles need a DOI. Textbooks need an ISBN. Reference sources are limited to the trusted list (for example StatPearls, MSD Manuals).
- Record the date you checked the sources in `sources_checked`.
- Every article has two levels: for patients in plain language and for students with terminology. The student level may add detail (pathophysiology, classification, criteria) but must never contradict the patient level. Write `<Patient>` and `<Student>` as blocks with blank lines inside, and keep shared text and section headings outside them.
- Mark each statement with the sources that support it: `<Cite n={2} />` or `<Cite n={[1, 3]} />`, numbered as in `sources`.
- Never give individual treatment advice or doses for self-treatment.
- Optionally list other names, abbreviations and old terms in `aliases` (for example `aliases: [мерцательная аритмия, ФП]`). Search finds the article by them. They do not appear on the article page, but can appear in search result snippets.

The build rejects articles that break these rules. The full schema is described in the [stage 0 spec](docs/plans/2026-10-11-stage-0-foundation.md#политика-источников).

## Adding a language

1. Add an entry to the locale registry `apps/web/src/i18n/locales.ts`: code, native name, writing direction (`ltr` or `rtl`) and a fallback locale.
2. Copy `apps/web/src/i18n/messages/en.json` to `<code>.json` and translate it. `pnpm i18n:check` reports missing keys.
3. Translate articles into `content/<code>/…` at your own pace. Untranslated articles are shown in the fallback language with a notice. Give each translation its own `aliases` in that language.

## Using Claude Code

The repository ships `.claude/settings.json`, which enables two plugins for everyone who opens the project in Claude Code:

- [ECC (Everything Claude Code)](https://github.com/affaan-m/ECC): agents and skills for planning, TDD, code review and security checks.
- [ponytail](https://github.com/DietrichGebert/ponytail): keeps the agent on the smallest solution that works; run `/ponytail-review` on your diff.

Claude Code asks you to trust the plugin marketplaces the first time. `CLAUDE.md` describes the project rules for the agent. Plugin hooks need Node.js on your PATH.
