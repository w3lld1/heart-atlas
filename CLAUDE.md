# Heart Atlas

Open-source interactive web app about the heart and heart disease. Astro + React islands, three.js / react-three-fiber, MDX content in Git, static site on GitHub Pages under `/heart-atlas/`.

Plans and specs live in `docs/plans/`. Read the current stage spec before changing anything.

## Workflow

- Communicate with the maintainer in Russian. Code, identifiers and commit messages in English; Russian is fine in docs and specs.
- A large feature starts with a spec in `docs/plans/YYYY-MM-DD-name.md`, agreed before code.
- Work on a branch. One feature = a series of small PRs (PR 1, PR 2 …), each linked to an issue.
- Before a PR is ready: tests, lint, type check, e2e and green CI, then an independent review of the branch by a subagent. Fix critical and important findings before merge.
- Review findings that take about 30 minutes to fix are fixed in the same branch. Only things that need the maintainer's decision, large work, or are out of scope become separate issues.
- The maintainer merges. After merge: delete the branch, then watch the deploy and report the result.

## Code rules

- TypeScript strict. No `any` without a comment explaining why.
- Internal links and asset paths always go through `import.meta.env.BASE_URL`; never hardcode `/`.
- No hardcoded locale codes in routes or components: everything comes from the locale registry `apps/web/src/i18n/locales.ts`. UI strings live in `apps/web/src/i18n/messages/<locale>.json`; `en.json` is the reference key set.
- CSS uses logical properties only (`margin-inline-start`, not `margin-left`) so right-to-left languages work.
- Keep heavy code (3D, audio) in islands that load only on pages that need them.

## Medical content rules

- No physician review yet. Every article about a disease, diagnostic method or treatment needs at least two sources, at least one a clinical guideline from `content/trusted-sources.yaml`.
- Journal sources need a DOI, textbooks an ISBN. Do not invent sources, DOIs or numbers; if you cannot verify a fact against a source, leave it out.
- Articles with `review: null` show the "not reviewed by a physician" notice. Do not remove it.
- Never write individual treatment advice or self-treatment doses.
- `content/` and `assets/` are CC BY-SA 4.0. Only add assets whose license is compatible, and record third-party assets in `assets/models/LICENSES.yaml`.

## Tools

- Plugins ECC, ponytail and the Claude Design Skillstack bundles (3D and animation skills) are enabled in `.claude/settings.json`. Do not copy ECC hooks into settings: the plugin loads them, and a copy runs them twice.
- Design Skillstack examples use npm, physical CSS properties and root-absolute links; the repo rules above win (pnpm, logical properties, `BASE_URL`).
- Prefer the smallest change that works (ponytail), but never cut validation, error handling, accessibility or source checks.
