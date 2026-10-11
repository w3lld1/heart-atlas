# Adding a disease preset

A preset is a set of heart clock parameters that shows the textbook signs of one disease on the ECG, the heart sounds and the Wiggers diagram. The heart clock page lets the reader switch between all presets; an article with `preset` in its frontmatter shows a normal / disease switch for its own preset. Spec: [stage 3 presets](plans/2026-10-11-stage-3-presets.md).

## The rule for numbers

Every number in a preset either comes from a source or is marked as a model assumption:

- A sourced number has a comment next to it naming the source and the section or table, for example `// Severe aortic stenosis: mean gradient ≥40 mmHg (ACC/AHA 2020 VHD, Table 13).`
- When a source gives only a threshold, take the value at the threshold or clearly beyond it, and say so.
- When no source gives a number but the sign cannot be drawn without one (f-wave amplitude, the size of the S2 split), use a plausible value and mark it with `assumption:` in the comment.
- Numbers the picture does not need stay out of the preset.
- Use sources that meet the article source policy: guidelines and references from organizations in `content/trusted-sources.yaml`, reviews with a DOI, textbooks with an ISBN. Do not invent numbers or sources.

Write the table of parameters, values and sources into a spec in `docs/plans/` so a reviewer can check them in one place, as in [stage 3 presets](plans/2026-10-11-stage-3-presets.md) and its quotes file [stage 3 presets sources](plans/2026-10-11-stage-3-presets-sources.md).

## Steps

### 1. The preset

In [`packages/heart-clock/src/presets.ts`](../packages/heart-clock/src/presets.ts):

1. Add the id (kebab-case) to `presetIds`. The order is the order of the switch on the heart clock page.
2. Add a frozen partial parameter set to `presets`. Only list the parameters that change; everything else comes from `defaultParams`. Do not change `heartRate`: the reader sets it with the slider.

```ts
'aortic-stenosis': Object.freeze({
  // Severe aortic stenosis: mean gradient ≥40 mmHg (ACC/AHA 2020 VHD, Table 13).
  aorticValveGradient: 40,
  // The stenosis raises LV systolic pressure (StatPearls, Aortic Stenosis). assumption: 180,
  // so the aortic peak stays near 120 mmHg (119 in the model); no source gives an LV pressure.
  lvSystolic: 180,
}),
```

The parameters, their units and ranges are in `HeartParams`, `defaultParams` and `paramRanges` in `packages/heart-clock/src/params.ts`. A sign that no existing parameter can show needs a new parameter, which is a change to the model and needs a spec first.

### 2. Tests

[`packages/heart-clock/test/presets.test.ts`](../packages/heart-clock/test/presets.test.ts) already checks every id in `presetIds`:

- `presets` has an entry for every id;
- the preset passes `checkParams` at every heart rate in its `heartRateLimits`, and that range is the full `paramRanges.heartRate`. Only `atrial-septal-defect` is allowed a narrower range (its wide QRS does not fit the fastest rates). If your preset narrows the range too, the test fails; add an expectation for it with a comment explaining why.

Add a test for the sign the preset is meant to show, like the existing ones for ST elevation in `stemi` and the split S2 in `atrial-septal-defect`.

```sh
pnpm vitest run --project @heart-atlas/heart-clock
```

### 3. Strings

`HeartClockDemo` reads three strings for every id in `presetIds`. Add them to `apps/web/src/i18n/messages/en.json`, every other strings file and the test locale `apps/web/test/fixtures/i18n/qps-plocm.json`:

| Key                           | Content                                                                                                                                 |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `heartClock.preset.<id>`         | Name on the switch.                                                                                                                     |
| `heartClock.preset.<id>.summary` | What the preset shows and what the model does not show (murmurs, a second lead, the shape of a block). Only numbers from your table.     |
| `heartClock.preset.<id>.ecg`     | Text description of the ECG for screen readers; `{rate}` is replaced with the heart rate.                                              |

Then run `pnpm i18n:check`.

### 4. Sources on the page

Add every document your numbers come from to `presetSources` in [`apps/web/src/components/heart-clock/sources.ts`](../apps/web/src/components/heart-clock/sources.ts) as a `ClockSource`: `text` (the citation as shown), `href` (an https link) and `lang` (the language of the title). The heart clock page lists them under the monitor.

### 5. Using the preset

- **Heart clock page.** `[locale]/heart-clock.astro` passes all `presetIds`, so the new preset appears there with no further change.
- **Article.** Set `preset: <id>` in the frontmatter of the disease article (see [Adding an article](adding-an-article.md)). The schema in `apps/web/src/lib/content.ts` accepts any id from `presetIds` except `normal`. The article page then shows the monitor after the text with the switch `normal` / `<id>`, starting on the preset.
- **Embed.** The ECG embed `/<locale>/embed/ecg/` reads `?preset=<id>` and `?rate=` (`ecgEmbedParams` in `apps/web/src/components/heart-clock/EcgEmbed.tsx`). A new preset id is accepted there and listed in the embed builder automatically. If the preset narrows the heart rate range, `heartRateLimits` gives the builder its min and max, and an out-of-range `?rate=` is clamped.

### 6. Check

```sh
pnpm test
pnpm typecheck
pnpm i18n:check
pnpm build && pnpm e2e
```

Open the heart clock page with `pnpm dev`, switch to the preset and check the ECG, the sounds, the Wiggers diagram and the summary text.
