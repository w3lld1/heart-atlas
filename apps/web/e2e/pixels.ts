import type { Locator } from '@playwright/test';

/**
 * Share of pixels that differ noticeably between two shots of `target` taken `gapMs` apart.
 * Decoded in the page, so re-rendering noise of a software GPU (a channel off by a few levels)
 * does not count as motion; a beating heart changes far more than 1 % of the canvas.
 */
export async function changedShare(target: Locator, gapMs = 150): Promise<number> {
  // Both shots from one scroll position: a canvas at a fractional offset resamples differently.
  await target.scrollIntoViewIfNeeded();
  const a = await target.screenshot();
  await target.page().waitForTimeout(gapMs);
  const b = await target.screenshot();
  return target.page().evaluate(
    async ([first, second]) => {
      const decode = async (base64: string) => {
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const image = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
        const canvas = new OffscreenCanvas(image.width, image.height);
        const context = canvas.getContext('2d');
        if (!context) throw new Error('No 2D context');
        context.drawImage(image, 0, 0);
        return context.getImageData(0, 0, image.width, image.height).data;
      };
      const [p, q] = await Promise.all([decode(first), decode(second)]);
      if (p.length !== q.length) throw new Error('The two shots differ in size');
      let changed = 0;
      for (let i = 0; i < p.length; i += 4) {
        const d = Math.max(
          Math.abs((p[i] ?? 0) - (q[i] ?? 0)),
          Math.abs((p[i + 1] ?? 0) - (q[i + 1] ?? 0)),
          Math.abs((p[i + 2] ?? 0) - (q[i + 2] ?? 0)),
        );
        if (d > 16) changed++;
      }
      return changed / (p.length / 4);
    },
    [a.toString('base64'), b.toString('base64')] as const,
  );
}

/** Above this share of changed pixels the picture is moving. */
export const MOVING = 0.01;
