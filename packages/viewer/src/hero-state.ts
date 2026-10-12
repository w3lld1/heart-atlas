/** Motion level of the page, as in `<html data-motion>`. */
export type HeroMotion = 'full' | 'calm' | 'off';

/** What the home page heart does at each motion level. */
export function heroBehaviour(motion: HeroMotion): { beat: boolean; turn: boolean } {
  const full = motion === 'full';
  return { beat: full, turn: full };
}

/** A point on the canvas as shares of its width and height, from the top left corner. */
export type Share = [x: number, y: number];

/** Converts normalized device coordinates (-1…1, y up) into shares of the canvas. */
export function ndcToShare(x: number, y: number): Share {
  return [(x + 1) / 2, (1 - y) / 2];
}

/** True when any point moved by more than `epsilon` of the canvas, or the set of points changed. */
export function sharesChanged(
  before: Readonly<Record<string, Share>>,
  after: Readonly<Record<string, Share>>,
  epsilon = 0.0005,
): boolean {
  const keys = Object.keys(after);
  if (keys.length !== Object.keys(before).length) return true;
  return keys.some((key) => {
    const a = before[key];
    const b = after[key];
    return !a || !b || Math.abs(a[0] - b[0]) > epsilon || Math.abs(a[1] - b[1]) > epsilon;
  });
}

/** Mesh look under the home page "ghost": everything that is not lit turns see-through. */
export function ghostLook(lit: boolean, ghost: boolean): { opacity: number; transparent: boolean } {
  const see = ghost && !lit;
  return { opacity: see ? 0.14 : 1, transparent: see };
}
