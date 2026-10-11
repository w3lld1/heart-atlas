import { describe, expect, it } from 'vitest';
import { iframeCode, integerIn, parseEmbedParams } from '../src/lib/embed.ts';

describe('parseEmbedParams', () => {
  const parsers = { rate: integerIn(40, 180) };

  it('keeps whitelisted parameters with valid values', () => {
    expect(parseEmbedParams('?rate=90', parsers)).toEqual({ rate: 90 });
  });

  it('ignores unknown parameters', () => {
    expect(parseEmbedParams('?rate=90&autoplay=1&src=evil', parsers)).toEqual({ rate: 90 });
  });

  it('drops invalid values', () => {
    for (const rate of ['', '39', '181', '90.5', '-60', '1e2', ' 90', '0x5a', 'abc']) {
      expect(parseEmbedParams(new URLSearchParams({ rate }), parsers)).toEqual({});
    }
  });

  it('accepts range bounds', () => {
    expect(parseEmbedParams('?rate=40', parsers)).toEqual({ rate: 40 });
    expect(parseEmbedParams('?rate=180', parsers)).toEqual({ rate: 180 });
  });
});

describe('iframeCode', () => {
  it('includes title and lazy loading', () => {
    const code = iframeCode({
      src: 'https://example.org/ru/embed/ecg/',
      title: 'ЭКГ',
      height: 600,
    });
    expect(code).toBe(
      '<iframe src="https://example.org/ru/embed/ecg/" title="ЭКГ" width="100%" height="600" loading="lazy" style="border: 0"></iframe>',
    );
  });

  it('escapes attribute values', () => {
    const code = iframeCode({
      src: 'https://example.org/?a=1&b=2',
      title: 'A "quoted" <title>',
      height: 1,
    });
    expect(code).toContain('src="https://example.org/?a=1&amp;b=2"');
    expect(code).toContain('title="A &quot;quoted&quot; &lt;title>"');
  });
});
