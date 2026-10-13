// Sorts the keys of every strings file, so new strings land in their own place instead of at the
// end of the file. A key repeated with the same value (a merge that kept both sides) is kept once;
// one repeated with different values is refused, since JSON.parse would keep only the last.
// Run: pnpm i18n:sort
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { keyOrder, sortedMessages } from '../src/i18n/check.ts';

const dirs = [
  new URL('../src/i18n/messages/', import.meta.url),
  new URL('../test/fixtures/i18n/', import.meta.url),
];

let failed = false;
for (const dir of dirs) {
  for (const name of readdirSync(dir).filter((file) => file.endsWith('.json'))) {
    const url = new URL(name, dir);
    const text = readFileSync(url, 'utf8');
    const conflicting = keyOrder(text).duplicates.filter((key) => {
      const lines = text
        .split('\n')
        .filter((line) => line.startsWith(`  ${JSON.stringify(key)}:`))
        .map((line) => line.replace(/,$/, ''));
      return new Set(lines).size > 1;
    });
    if (conflicting.length > 0) {
      console.error(
        `✗ ${fileURLToPath(url)}: keys repeated with different values: ${conflicting.join(', ')}`,
      );
      failed = true;
      continue;
    }
    const sorted = sortedMessages(JSON.parse(text) as Record<string, unknown>);
    if (sorted !== text) {
      writeFileSync(url, sorted);
      console.log(`sorted ${fileURLToPath(url)}`);
    }
  }
}
if (failed) process.exit(1);
