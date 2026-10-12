import { describe, expect, it } from 'vitest';
import {
  anchorFollows,
  ghostLook,
  heroBehaviour,
  ndcToShare,
  sharesChanged,
} from '../src/hero-state.ts';

describe('heroBehaviour', () => {
  it('beats and turns only at full motion', () => {
    expect(heroBehaviour('full')).toEqual({ beat: true, turn: true });
    expect(heroBehaviour('calm')).toEqual({ beat: false, turn: false });
    expect(heroBehaviour('off')).toEqual({ beat: false, turn: false });
  });
});

describe('ndcToShare', () => {
  it('maps device coordinates to shares from the top left corner', () => {
    expect(ndcToShare(-1, 1)).toEqual([0, 0]);
    expect(ndcToShare(0, 0)).toEqual([0.5, 0.5]);
    expect(ndcToShare(1, -1)).toEqual([1, 1]);
  });
});

describe('sharesChanged', () => {
  it('ignores moves smaller than the threshold and notices new or lost points', () => {
    expect(sharesChanged({ a: [0.5, 0.5] }, { a: [0.5001, 0.5] })).toBe(false);
    expect(sharesChanged({ a: [0.5, 0.5] }, { a: [0.51, 0.5] })).toBe(true);
    expect(sharesChanged({}, { a: [0.5, 0.5] })).toBe(true);
    expect(sharesChanged({ a: [0.5, 0.5] }, { b: [0.5, 0.5] })).toBe(true);
  });
});

describe('ghostLook', () => {
  it('makes only unlit meshes see-through, and only under the ghost', () => {
    expect(ghostLook(false, true)).toEqual({ opacity: 0.14, transparent: true });
    expect(ghostLook(true, true)).toEqual({ opacity: 1, transparent: false });
    expect(ghostLook(false, false)).toEqual({ opacity: 1, transparent: false });
  });
});

describe('anchorFollows', () => {
  it('moves points with the chambers that carry them', () => {
    expect(anchorFollows('left-ventricle', 'chamber')).toEqual(['left-ventricle']);
    expect(anchorFollows('sa-node', 'conduction')).toEqual(['right-atrium']);
    expect(anchorFollows('right-coronary-artery', 'coronary-artery')).toEqual([
      'right-ventricle',
      'left-ventricle',
    ]);
    expect(anchorFollows('pulmonary-valve', 'valve')).toEqual([]);
  });
});
