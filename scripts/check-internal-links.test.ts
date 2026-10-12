import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  extractLinks,
  findBrokenLinks,
  isExternal,
  pageUrl,
  targetPath,
} from './check-internal-links.mjs';

describe('extractLinks', () => {
  it('reads href and src in either quote style, skipping code samples', () => {
    const html = `<a href="../a/">A</a><img src='/b.png'><pre><code>&lt;iframe src="x"&gt;<a href="/code/">c</a></code></pre>`;
    expect(extractLinks(html)).toEqual(['../a/', '/b.png']);
  });

  it('reads srcset candidates, form actions and script src, decoding entities', () => {
    const html = [
      '<img srcset="/a.webp 1x, /b.webp 2x">',
      '<form action="../search/">',
      '<script src="/c.js"></script>',
      '<script>el.innerHTML = \'<a href="/dyn/">\';</script>',
      '<a href="/d/?x=1&amp;y=2">d</a>',
      '<code-sample></code-sample><a href="/e/">e</a>',
    ].join('');
    expect(extractLinks(html)).toEqual([
      '/a.webp',
      '/b.webp',
      '../search/',
      '/c.js',
      '/d/?x=1&y=2',
      '/e/',
    ]);
  });
});

describe('isExternal', () => {
  it('skips other schemes, protocol-relative links and anchors', () => {
    for (const link of [
      'https://doi.org/10.1/x',
      'mailto:a@b.c',
      'data:image/png;base64,',
      '//cdn.example/x',
      '#top',
      '',
    ]) {
      expect(isExternal(link)).toBe(true);
    }
    expect(isExternal('../a/')).toBe(false);
  });

  it('treats absolute links to the site itself as internal', () => {
    expect(isExternal('https://example.org/base/ru/', 'https://example.org')).toBe(false);
    expect(isExternal('https://example.org.evil/base/', 'https://example.org')).toBe(true);
    expect(isExternal('HTTPS://Example.org/base/', 'https://example.org')).toBe(false);
  });
});

describe('pageUrl and targetPath', () => {
  it('maps build files to URLs and resolves links against them', () => {
    expect(pageUrl(join('ru', 'a', 'index.html'), '/base/')).toBe('/base/ru/a/');
    expect(pageUrl('404.html', '/base/')).toBe('/base/404.html');
    expect(targetPath('../b/#x', '/base/ru/a/', '/base/')).toBe('ru/b/');
    expect(targetPath('/base/m%20n.png?v=1', '/base/', '/base/')).toBe('m n.png');
    expect(targetPath('/other/', '/base/', '/base/')).toBeUndefined();
    expect(targetPath('/base/%E0%A4%A', '/base/', '/base/')).toBeUndefined();
  });
});

describe('findBrokenLinks', () => {
  let dist = '';
  afterEach(() => rm(dist, { recursive: true, force: true }));

  it('reports only links whose target is missing', async () => {
    dist = await mkdtemp(join(tmpdir(), 'links-'));
    await mkdir(join(dist, 'ru', 'a'), { recursive: true });
    await mkdir(join(dist, 'ru', 'b'), { recursive: true });
    await writeFile(join(dist, 'ru', 'b', 'index.html'), '<p>b</p>');
    await writeFile(join(dist, 'logo.svg'), '<svg/>');
    await writeFile(
      join(dist, 'ru', 'a', 'index.html'),
      [
        '<a href="../b/">ok</a>',
        '<a href="../b">ok without slash</a>',
        '<img src="/base/logo.svg">',
        '<link rel="canonical" href="https://example.org/base/ru/a/">',
        '<a href="../missing/">missing</a>',
        '<a href="https://example.org/base/en/a/">missing translation</a>',
        '<a href="/elsewhere/">outside base</a>',
        '<a href="https://doi.org/10.1/x">external</a>',
      ].join(''),
    );
    expect(await findBrokenLinks(dist, '/base/', 'https://example.org')).toEqual([
      { page: '/base/ru/a/', link: '../missing/' },
      { page: '/base/ru/a/', link: 'https://example.org/base/en/a/' },
      { page: '/base/ru/a/', link: '/elsewhere/' },
    ]);
  });
});
