/**
 * Query parameters of embed pages. Each module lists the parameters it accepts with a parser that
 * returns undefined for an invalid value; anything else in the query string is ignored, so a typo
 * or a crafted URL cannot change what the page does.
 */
export type ParamParsers = Record<string, (value: string) => unknown>;

export type ParsedParams<P extends ParamParsers> = {
  [K in keyof P]?: Exclude<ReturnType<P[K]>, undefined>;
};

export function parseEmbedParams<P extends ParamParsers>(
  search: string | URLSearchParams,
  parsers: P,
): ParsedParams<P> {
  const query = typeof search === 'string' ? new URLSearchParams(search) : search;
  const result: Record<string, unknown> = {};
  for (const [name, parse] of Object.entries(parsers)) {
    const raw = query.get(name);
    if (raw === null) continue;
    const value = parse(raw);
    if (value !== undefined) result[name] = value;
  }
  return result as ParsedParams<P>;
}

/** Whole number in [min, max] written in plain decimal digits, otherwise undefined. */
export function integerIn(min: number, max: number) {
  return (value: string): number | undefined => {
    if (!/^\d{1,4}$/.test(value)) return undefined;
    const number = Number(value);
    return number >= min && number <= max ? number : undefined;
  };
}

/** `<iframe>` code for an embed page. `title` is required: screen readers announce it. */
export function iframeCode({
  src,
  title,
  height,
}: {
  src: string;
  title: string;
  height: number;
}): string {
  const escape = (value: string) =>
    value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  return `<iframe src="${escape(src)}" title="${escape(title)}" width="100%" height="${height}" loading="lazy" style="border: 0"></iframe>`;
}
