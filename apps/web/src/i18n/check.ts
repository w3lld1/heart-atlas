export type MessageCheck = {
  /** Keys present in the reference file but missing here. These fail the check. */
  missing: string[];
  /** Keys not present in the reference file. These are only warnings. */
  extra: string[];
  /** Keys whose value is not a non-empty string. These fail the check. */
  invalid: string[];
};

export function compareKeys(reference: object, messages: object): MessageCheck {
  const referenceKeys = Object.keys(reference);
  const keys = Object.keys(messages);
  return {
    missing: referenceKeys.filter((key) => !keys.includes(key)),
    extra: keys.filter((key) => !referenceKeys.includes(key)),
    invalid: Object.entries(messages)
      .filter(([, value]) => typeof value !== 'string' || value.trim() === '')
      .map(([key]) => key),
  };
}

/**
 * Key order problems in the raw text of a strings file (one `"key": value` per line, as Prettier
 * writes it). Keys are kept sorted, so two articles that add strings at the same time touch
 * different lines instead of both appending to the end. JSON.parse keeps only the last of two
 * equal keys, so duplicates are found in the text.
 */
export function keyOrder(text: string): { duplicates: string[]; firstUnsorted?: string } {
  // Keys are compared unescaped, as `sortedMessages` sorts them.
  const keys = [...text.matchAll(/^ {2}("(?:[^"\\]|\\.)*"):/gm)].map(
    (match) => JSON.parse(match[1] ?? '""') as string,
  );
  const seen = new Set<string>();
  const duplicates: string[] = [];
  let firstUnsorted: string | undefined;
  keys.forEach((key, i) => {
    if (seen.has(key)) duplicates.push(key);
    seen.add(key);
    const previous = keys[i - 1];
    if (firstUnsorted === undefined && previous !== undefined && previous > key) {
      firstUnsorted = key;
    }
  });
  return firstUnsorted === undefined ? { duplicates } : { duplicates, firstUnsorted };
}

/** A strings file with its keys sorted, formatted as Prettier formats JSON. */
export function sortedMessages(messages: Record<string, unknown>): string {
  const sorted = Object.fromEntries(
    Object.entries(messages).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  );
  return `${JSON.stringify(sorted, null, 2)}\n`;
}
