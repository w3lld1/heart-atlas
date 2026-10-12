import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import subsetFont from 'subset-font';

/**
 * @font-face rules for the handwritten line of the home page, with the font inlined as data URLs
 * and cut down to the characters of `text`. The whole Caveat font is about 100 KB for Cyrillic and
 * Latin; one line needs a few KB. Inlined, it arrives with the page, so the line never swaps fonts.
 * Build time only: reads Fontsource's Caveat 600 files from node_modules.
 */
export async function handFontCss(text: string, family = 'Caveat Hand'): Promise<string> {
  // Astro runs the build from apps/web, where @fontsource/caveat is installed.
  const require = createRequire(join(process.cwd(), 'package.json'));
  const cssFile = require.resolve('@fontsource/caveat/600.css');
  const css = readFileSync(cssFile, 'utf8');
  const chars = [...new Set(text)];
  const faces: string[] = [];
  for (const face of css.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
    const body = face[1] ?? '';
    const file = /url\(\.\/(files\/[^)]+\.woff2)\)/.exec(body)?.[1];
    const range = /unicode-range:\s*([^;]+);/.exec(body)?.[1];
    if (!file || !range) continue;
    const inRange = (char: string) => {
      const cp = char.codePointAt(0) ?? 0;
      return range.split(',').some((part) => {
        const [from = '', to = from] = part.trim().replace(/^U\+/i, '').split('-');
        return cp >= Number.parseInt(from, 16) && cp <= Number.parseInt(to, 16);
      });
    };
    const covered = chars.filter(inRange);
    if (covered.length === 0) continue;
    const font = await subsetFont(readFileSync(join(dirname(cssFile), file)), covered.join(''), {
      targetFormat: 'woff2',
    });
    const codes = covered.map((c) => `U+${(c.codePointAt(0) ?? 0).toString(16).toUpperCase()}`);
    faces.push(
      `@font-face{font-family:'${family}';font-style:normal;font-weight:600;font-display:swap;` +
        `src:url(data:font/woff2;base64,${font.toString('base64')}) format('woff2');` +
        `unicode-range:${codes.join(',')}}`,
    );
  }
  return faces.join('\n');
}
