import { describe, expect, it } from 'vitest';
import { threeDCode } from '../integrations/pwa.ts';

describe('threeDCode', () => {
  it('matches only the 3D scene chunk, with either path separator', () => {
    expect(threeDCode.test('dist/_astro/Scene.Db1ekpsL.js')).toBe(true);
    expect(threeDCode.test('dist\\_astro\\Scene.Db1-k_L.js')).toBe(true);
    expect(threeDCode.test('dist/_astro/HeroScene.BEW1eFar.js')).toBe(false);
    expect(threeDCode.test('dist/_astro/Scene.Db1ekpsL.css')).toBe(false);
    expect(threeDCode.test('dist/_astro/hero.CI1qrHyO.js')).toBe(false);
  });
});
