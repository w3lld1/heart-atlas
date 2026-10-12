import { parse } from 'yaml';

/**
 * Licenses whose material may go into CC BY-SA 4.0 assets. Adding one needs a PR that explains
 * why it is compatible (docs/plans/2026-10-11-stage-1-heart-model.md, "Совместимость лицензий").
 */
export const ALLOWED_LICENSES = [
  'CC0-1.0',
  'CC-BY-4.0',
  'CC-BY-SA-4.0',
  'CC-BY-SA-2.1-JP',
] as const;

export interface SourceEntry {
  name: string;
  url: string;
  license: string;
  attribution: string;
  also_published_as?: string;
  attribution_alt?: string;
  retrieved?: string;
  sha256?: string;
  /** Language of attribution_alt (BCP 47), so pages can mark it with lang. */
  attribution_alt_lang?: string;
}

export interface LicenseEntry {
  file: string;
  title: string;
  license: string;
  authors: string[];
  derived_from?: SourceEntry[];
  changes?: string;
  notes?: string;
}

const isText = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const allowed = (v: unknown): boolean =>
  ALLOWED_LICENSES.includes(v as (typeof ALLOWED_LICENSES)[number]);

/** Parses LICENSES.yaml and returns entries plus every rule violation found. */
export function parseLicenses(text: string): { entries: LicenseEntry[]; errors: string[] } {
  const data: unknown = parse(text);
  const errors: string[] = [];
  if (!Array.isArray(data)) return { entries: [], errors: ['LICENSES.yaml must be a list'] };
  const seen = new Set<string>();
  for (const [index, item] of data.entries()) {
    if (typeof item !== 'object' || item === null) {
      errors.push(`#${index}: entry must be a mapping`);
      continue;
    }
    const e = item as Record<string, unknown>;
    const where = isText(e['file']) ? e['file'] : `#${index}`;
    if (!isText(e['file'])) errors.push(`${where}: file is required`);
    else if (seen.has(e['file'])) errors.push(`${where}: duplicate entry`);
    else seen.add(e['file']);
    if (!isText(e['title'])) errors.push(`${where}: title is required`);
    if (!allowed(e['license']))
      errors.push(`${where}: license ${String(e['license'])} is not allowed`);
    if (!Array.isArray(e['authors']) || !e['authors'].every(isText) || e['authors'].length === 0) {
      errors.push(`${where}: authors is required`);
    }
    const sources = e['derived_from'];
    if (sources !== undefined && !Array.isArray(sources))
      errors.push(`${where}: derived_from must be a list`);
    for (const raw of Array.isArray(sources) ? (sources as unknown[]) : []) {
      if (typeof raw !== 'object' || raw === null) {
        errors.push(`${where}: source must be a mapping`);
        continue;
      }
      const s = raw as Record<string, unknown>;
      const name = isText(s['name']) ? s['name'] : '?';
      if (!isText(s['name'])) errors.push(`${where}: source needs a name`);
      if (!isText(s['url']) || !/^https:\/\//.test(s['url']))
        errors.push(`${where} / ${name}: https url is required`);
      if (!allowed(s['license']))
        errors.push(`${where} / ${name}: license ${String(s['license'])} is not allowed`);
      if (!isText(s['attribution'])) errors.push(`${where} / ${name}: attribution is required`);
      if (s['also_published_as'] !== undefined) {
        if (!allowed(s['also_published_as'])) {
          errors.push(
            `${where} / ${name}: also_published_as ${String(s['also_published_as'])} is not allowed`,
          );
        }
        if (!isText(s['attribution_alt']))
          errors.push(`${where} / ${name}: attribution_alt is required`);
      }
      if (s['attribution_alt'] !== undefined) {
        const lang = s['attribution_alt_lang'];
        if (typeof lang !== 'string' || !/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(lang))
          errors.push(`${where} / ${name}: attribution_alt_lang must be a language tag such as ja`);
      }
    }
  }
  return { entries: data as LicenseEntry[], errors };
}
