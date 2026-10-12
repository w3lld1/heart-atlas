/**
 * Fills a message with a count, choosing the plural form for the locale. A message is plain text
 * with `{count}`, or one ICU-style plural block, for example
 * `{count, plural, one {# article} other {# articles}}`, where `#` is the count. Forms are the
 * CLDR categories of Intl.PluralRules; `other` is required and used for any missing form.
 */
export function formatCount(message: string, locale: string, count: number): string {
  const number = new Intl.NumberFormat(locale).format(count);
  const block = /\{count, plural,((?:\s*[a-z]+ \{[^{}]*\})+)\s*\}/.exec(message);
  if (!block) return message.replaceAll('{count}', number);
  const forms = new Map(
    [...(block[1] ?? '').matchAll(/([a-z]+) \{([^{}]*)\}/g)].map((m) => [m[1], m[2] ?? '']),
  );
  const form = forms.get(new Intl.PluralRules(locale).select(count)) ?? forms.get('other');
  if (form === undefined) throw new Error(`Plural message without an "other" form: ${message}`);
  return message.replace(block[0], form.replaceAll('#', number));
}
