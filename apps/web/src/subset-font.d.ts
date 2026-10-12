// subset-font ships no types; this is the part of its API the site uses.
declare module 'subset-font' {
  export default function subsetFont(
    font: Buffer,
    text: string,
    options?: { targetFormat?: 'sfnt' | 'woff' | 'woff2' | 'truetype' },
  ): Promise<Buffer>;
}
