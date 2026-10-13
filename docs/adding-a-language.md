# Adding a language

A language is one registry entry, one strings file and, at your own pace, translated articles. No route or component names a locale code: everything reads the registry.

## 1. Registry entry

Add the language to `productionLocales` in [`apps/web/src/i18n/locales.ts`](../apps/web/src/i18n/locales.ts):

```ts
export const productionLocales = {
  ru: { name: 'Русский', dir: 'ltr', fallback: 'en' },
  en: { name: 'English', dir: 'ltr', fallback: null },
  de: { name: 'Deutsch', dir: 'ltr', fallback: 'en' },
} as const satisfies LocaleRegistry;
```

- The key is the locale code. It becomes the first URL segment (`/heart-atlas/de/…`), the `lang` attribute and the folder name in `content/`.
- `name` is the native name shown in the language switcher.
- `dir` is `ltr` or `rtl`.
- `fallback` is the locale whose strings and articles are shown when a translation is missing, or `null`. Fallbacks chain (`de` → `en`); an unknown code or a cycle makes the build fail (`apps/web/src/i18n/registry.ts`).

`defaultLocale` (`ru`) is where the root URL redirects; leave it unless the maintainer decides otherwise.

The registry feeds the routes, the language switcher, `hreflang` links, the per-locale web app manifests and the service worker, so nothing else needs a code change.

## 2. Strings file

Copy `apps/web/src/i18n/messages/en.json` to `apps/web/src/i18n/messages/<code>.json` and translate the values. `en.json` is the reference key set.

```sh
pnpm i18n:check
```

The check fails on a missing file, a missing key, an empty value, unsorted keys or a repeated key, and warns about keys that are not in `en.json` and about strings files without a registry entry. CI runs it in the `i18n` job.

At runtime `getMessages()` falls back along the chain for any missing key, but the check keeps files complete, so do not rely on that.

Placeholders like `{rate}`, `{n}`, `{source}` and Pagefind's `[SEARCH_TERM]` and `[COUNT]` must stay as they are.

When you add a key to `en.json` (for any feature), add it to every strings file, including the test locale `apps/web/test/fixtures/i18n/qps-plocm.json`, then run `pnpm i18n:sort`: strings files keep their keys sorted, and the check fails otherwise.

## 3. Articles

Translate articles into `content/<code>/<type>/<slug>.mdx`, keeping the slug of the original. Until a translation exists, the page `/<code>/<type>/<slug>/` shows the article in the first fallback language that has it, with a notice and a canonical link to the original; it is not indexed for search in the new language.

Give each translation its own `aliases` in that language: abbreviations and other names readers will type into search. See [Adding an article](adding-an-article.md).

Sources stay as they are; source titles are in the language of publication.

## Right-to-left languages

- `BaseLayout.astro` and `EmbedLayout.astro` set `<html dir>` from the registry.
- CSS uses logical properties only (`margin-inline-start`, `padding-inline`, `inset-inline-start`), so layouts mirror. Stylelint (`stylelint-use-logical` in `stylelint.config.mjs`) rejects horizontal physical properties such as `margin-left`; vertical ones like `margin-top` are allowed.
- Diagrams keep `direction: ltr` inside the SVG: anatomy does not mirror with writing direction.
- A fallback article inside an RTL page gets the `lang` and `dir` of the language it is written in.

### Test locale `qps-plocm`

The repository ships a right-to-left pseudo-locale, `qps-plocm` ("Test RTL", falls back to `en`), in `apps/web/test/fixtures/i18n/locales.ts` with strings in `qps-plocm.json`. It is never part of a production build. Build and test with it:

```sh
HA_TEST_LOCALES=1 pnpm build
HA_TEST_LOCALES=1 pnpm e2e
```

The e2e tests must run with the same `HA_TEST_LOCALES` value the site was built with. CI runs the e2e job both ways. In this build axe skips only `html-lang-valid` and `valid-lang`, because axe does not know the pseudo-locale code.

## Checklist

- [ ] Entry in `productionLocales`
- [ ] `messages/<code>.json` translated; `pnpm i18n:check` passes
- [ ] `pnpm test`, `pnpm build` and `pnpm e2e` pass
- [ ] Pages checked in a browser, and with `HA_TEST_LOCALES=1` if you changed layout or CSS
