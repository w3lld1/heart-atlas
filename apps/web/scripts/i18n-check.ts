// Checks that every locale has a strings file with all keys of the English reference, sorted and
// without duplicates. Missing keys, missing files, unsorted or repeated keys fail; extra keys only
// warn. Run: pnpm i18n:check (pnpm i18n:sort fixes the order).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { compareKeys, keyOrder } from '../src/i18n/check.ts';
import { productionLocales } from '../src/i18n/locales.ts';
import { testLocales } from '../test/fixtures/i18n/locales.ts';

const messagesDir = new URL('../src/i18n/messages/', import.meta.url);
const testMessagesDir = new URL('../test/fixtures/i18n/', import.meta.url);

const readJson = (url: URL): object => JSON.parse(readFileSync(url, 'utf8')) as object;
const reference = readJson(new URL('en.json', messagesDir));

const files = [
  ...Object.keys(productionLocales).map((code) => new URL(`${code}.json`, messagesDir)),
  ...Object.keys(testLocales).map((code) => new URL(`${code}.json`, testMessagesDir)),
];

let failed = false;

for (const [dir, registry] of [
  [messagesDir, productionLocales],
  [testMessagesDir, testLocales],
] as const) {
  for (const name of readdirSync(dir).filter((file) => file.endsWith('.json'))) {
    if (!(name.slice(0, -'.json'.length) in registry)) {
      console.warn(
        `! ${fileURLToPath(new URL(name, dir))}: no locale registry entry, file is unused`,
      );
    }
  }
}

for (const url of files) {
  const path = fileURLToPath(url);
  if (!existsSync(url)) {
    console.error(`✗ ${path}: file is missing`);
    failed = true;
    continue;
  }
  const { duplicates, firstUnsorted } = keyOrder(readFileSync(url, 'utf8'));
  for (const key of duplicates) console.error(`✗ ${path}: key "${key}" appears more than once`);
  if (firstUnsorted !== undefined) {
    console.error(`✗ ${path}: keys are not sorted from "${firstUnsorted}"; run pnpm i18n:sort`);
  }
  if (duplicates.length > 0 || firstUnsorted !== undefined) failed = true;
  const { missing, extra, invalid } = compareKeys(reference, readJson(url));
  for (const key of missing) console.error(`✗ ${path}: missing key "${key}"`);
  for (const key of invalid) console.error(`✗ ${path}: "${key}" must be a non-empty string`);
  for (const key of extra) console.warn(`! ${path}: extra key "${key}" (not in en.json)`);
  if (missing.length > 0 || invalid.length > 0) failed = true;
}

if (failed) process.exit(1);
console.log(`i18n: ${files.length} strings files have all ${Object.keys(reference).length} keys`);
