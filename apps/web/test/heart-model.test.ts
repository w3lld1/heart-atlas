import { describe, expect, it } from 'vitest';
import { localeCodes } from '../src/i18n/locales.ts';
import { getMessages } from '../src/i18n/messages.ts';
import en from '../src/i18n/messages/en.json' with { type: 'json' };
import {
  congenitalModelEntry,
  congenitalModelIds,
  congenitalModelUrls,
  congenitalSection,
  congenitalSourceIds,
  congenitalStructures,
  heartAttribution,
  heartModelUrls,
  heartStructures,
  viewerMessages,
} from '../src/lib/heart-model.ts';

describe('heart model data for the viewer', () => {
  it('has an English name for every structure in structures.yaml', () => {
    const missing = heartStructures(getMessages('en'))
      .map((s) => `structure.${s.id}`)
      .filter((key) => !(key in en));
    expect(missing).toEqual([]);
  });

  it('passes zone meshes through', () => {
    const septum = heartStructures(getMessages('en')).find(
      (s) => s.id === 'interventricular-septum',
    );
    expect(septum).toMatchObject({ kind: 'zone', meshes: ['right-ventricle', 'left-ventricle'] });
  });

  it('shows both attributions of a source published under two licenses, marking the language', () => {
    const [main, alt] = heartAttribution();
    expect(main?.text).toContain('The Database Center for Life Science');
    expect(main?.lang).toBeUndefined();
    expect(alt?.text).toContain('ライフサイエンス統合データベースセンター');
    expect(alt?.lang).toBe('ja');
  });

  it('reads the attribution of another model file', () => {
    expect(heartAttribution('congenital/tetralogy-of-fallot.glb')[0]?.text).toContain('Kopan, CT');
  });

  it.each(localeCodes)('leaves one {source} slot in the attribution line (%s)', (locale) => {
    const line = viewerMessages(getMessages(locale))['viewer.attribution'];
    expect(line.split('{source}')).toHaveLength(2);
    expect(getMessages(locale)['embed.credits'].split('{credits}')).toHaveLength(2);
  });

  it('builds model paths from the base URL', () => {
    expect(heartModelUrls('/heart-atlas/')).toEqual({
      models: {
        high: '/heart-atlas/models/heart-lod0.glb',
        low: '/heart-atlas/models/heart-lod1.glb',
      },
      poster: '/heart-atlas/models/heart-hero-poster.webp',
      heroPoster: '/heart-atlas/models/heart-hero-poster.webp',
    });
  });
});

describe('congenital model data for the viewer', () => {
  it('names every layer in every locale', () => {
    for (const locale of localeCodes) {
      for (const id of congenitalSourceIds()) {
        const unnamed = congenitalStructures(getMessages(locale), id).filter(
          (s) => s.label === s.id,
        );
        expect(unnamed, `${locale} ${id}`).toEqual([]);
      }
    }
  });

  it('shows the attribution of a model made of several source files once', () => {
    const parts = heartAttribution('congenital/transposition-of-the-great-arteries.glb');
    expect(parts.map((p) => p.text)).toEqual([
      'Mena, KA. Case Model #54 d-TGA Pre-Op, NIH 3D Heart Library (3DPX-007810), CC0 1.0',
    ]);
  });

  it('opens the tetralogy of Fallot model cut and the transposition model whole', () => {
    expect(congenitalSection('tetralogy-of-fallot')).toBe('frontal');
    expect(congenitalSection('transposition-of-the-great-arteries')).toBeUndefined();
  });

  it('points at the built files, the model record and the attribution of each model', () => {
    for (const id of congenitalModelIds) {
      expect(congenitalModelUrls('/base/', id)).toEqual({
        models: { high: `/base/models/${id}-lod0.glb`, low: `/base/models/${id}-lod1.glb` },
        poster: `/base/models/${id}-poster.webp`,
      });
      expect(congenitalModelEntry(id)).toMatch(/^https:\/\/3d\.nih\.gov\/entries\//);
      expect(
        heartAttribution(`congenital/${id}.glb`)
          .map((part) => part.text)
          .join(' '),
      ).toContain('NIH 3D Heart Library');
    }
  });
});
