import { describe, expect, it } from 'vitest';
import { localeCodes } from '../src/i18n/locales.ts';
import { getMessages } from '../src/i18n/messages.ts';
import en from '../src/i18n/messages/en.json' with { type: 'json' };
import {
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

  it('shows both attributions of a source published under two licenses', () => {
    expect(heartAttribution()).toContain('The Database Center for Life Science');
    expect(heartAttribution()).toContain('ライフサイエンス統合データベースセンター');
  });

  it.each(localeCodes)('fills the model source into the attribution line (%s)', (locale) => {
    const line = viewerMessages(getMessages(locale))['viewer.attribution'];
    expect(line).toContain(heartAttribution());
    expect(line).not.toContain('{source}');
  });

  it('builds model paths from the base URL', () => {
    expect(heartModelUrls('/heart-atlas/')).toEqual({
      models: {
        high: '/heart-atlas/models/heart-lod0.glb',
        low: '/heart-atlas/models/heart-lod1.glb',
      },
      poster: '/heart-atlas/models/heart-poster.png',
    });
  });
});
