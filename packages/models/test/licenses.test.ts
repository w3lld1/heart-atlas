import { describe, expect, it } from 'vitest';
import { parseLicenses } from '../src/licenses.ts';

const valid = `
- file: a.glb
  title: A
  license: CC-BY-SA-4.0
  authors: [Someone]
  derived_from:
    - name: Source
      url: https://example.org
      license: CC-BY-4.0
      attribution: Source, CC BY 4.0
`;

describe('parseLicenses', () => {
  it('accepts a complete entry', () => {
    expect(parseLicenses(valid).errors).toEqual([]);
  });

  it('rejects NC and ND licenses', () => {
    const { errors } = parseLicenses(
      valid.replace('license: CC-BY-4.0', 'license: CC-BY-NC-SA-4.0'),
    );
    expect(errors).toEqual(['a.glb / Source: license CC-BY-NC-SA-4.0 is not allowed']);
    expect(parseLicenses(valid.replace('CC-BY-SA-4.0', 'CC-BY-ND-4.0')).errors).toHaveLength(1);
  });

  it('requires attribution and an https url for sources', () => {
    const { errors } = parseLicenses(
      valid
        .replace('https://example.org', 'http://example.org')
        .replace(/ {6}attribution:.*\n/, ''),
    );
    expect(errors).toEqual([
      'a.glb / Source: https url is required',
      'a.glb / Source: attribution is required',
    ]);
  });

  it('requires the second attribution when a source is also published under another license', () => {
    const { errors } = parseLicenses(`${valid}      also_published_as: CC-BY-SA-2.1-JP\n`);
    expect(errors).toEqual(['a.glb / Source: attribution_alt is required']);
  });

  it('requires the language of the second attribution', () => {
    const alt = `${valid}      also_published_as: CC-BY-SA-2.1-JP\n      attribution_alt: 'x'\n`;
    expect(parseLicenses(alt).errors).toEqual([
      'a.glb / Source: attribution_alt_lang must be a language tag such as ja',
    ]);
    expect(parseLicenses(`${alt}      attribution_alt_lang: ja\n`).errors).toEqual([]);
  });

  it('reports entries that are not mappings instead of throwing', () => {
    expect(parseLicenses('- 3\n- null\n').errors).toEqual([
      '#0: entry must be a mapping',
      '#1: entry must be a mapping',
    ]);
  });

  it('rejects duplicate files', () => {
    expect(parseLicenses(valid + valid).errors).toContain('a.glb: duplicate entry');
  });
});
