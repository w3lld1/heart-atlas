// Content check for the after-treatment state of diagrams: the caption must exist and cite a
// clinical guideline of the article. Spec: docs/plans/2026-10-12-after-treatment-mode.md.

/** Problems with the `treated` captions of every `<Diagram>` in an article's MDX source. */
export function treatedCaptionErrors(
  mdx: string,
  hasTreated: (name: string) => boolean,
  /** `tier` of each article source, in order: `<Cite n={1} />` is the first. */
  sourceTiers: readonly string[],
): string[] {
  const errors: string[] = [];
  for (const [, name = '', body = ''] of mdx.matchAll(
    /<Diagram\s+name="([^"]+)"[^>]*>([\s\S]*?)<\/Diagram>/g,
  )) {
    if (!hasTreated(name)) continue;
    const caption = /<p\s+slot="treated"\s*>([\s\S]*?)<\/p>/.exec(body)?.[1];
    if (caption === undefined) {
      errors.push(`<Diagram name="${name}"> has no <p slot="treated"> caption`);
      continue;
    }
    const cited = [...caption.matchAll(/<Cite n=\{([^}]*)\}/g)]
      .flatMap((match) => (match[1] ?? '').replace(/[[\]\s]/g, '').split(','))
      .map(Number);
    if (cited.length === 0) {
      errors.push(`<Diagram name="${name}">: the "treated" caption cites no source`);
    } else if (!cited.some((n) => sourceTiers[n - 1] === 'guideline')) {
      errors.push(`<Diagram name="${name}">: the "treated" caption cites no clinical guideline`);
    }
  }
  return errors;
}
