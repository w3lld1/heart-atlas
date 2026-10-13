import { describe, expect, it } from 'vitest';
import { compareKeys, keyOrder, sortedMessages } from '../../src/i18n/check.ts';
import { getMessages } from '../../src/i18n/messages.ts';
import en from '../../src/i18n/messages/en.json';
import ru from '../../src/i18n/messages/ru.json';

describe('messages', () => {
  it('returns strings of the requested locale', () => {
    expect(getMessages('ru')['nav.language']).toBe(ru['nav.language']);
    expect(getMessages('en')['nav.language']).toBe(en['nav.language']);
  });

  it('every message key resolves for every production locale', () => {
    for (const code of ['ru', 'en']) {
      const messages = getMessages(code);
      for (const key of Object.keys(en)) expect(messages).toHaveProperty(key);
    }
  });

  it('throws for an unknown locale', () => {
    expect(() => getMessages('xx')).toThrow('Unknown locale "xx"');
  });
});

describe('compareKeys', () => {
  it('reports missing keys as errors and extra keys separately', () => {
    expect(compareKeys({ a: 'A', b: 'B' }, { b: 'B', c: 'C' })).toEqual({
      missing: ['a'],
      extra: ['c'],
      invalid: [],
    });
  });

  it('passes identical key sets', () => {
    expect(compareKeys(en, ru)).toEqual({ missing: [], extra: [], invalid: [] });
  });

  it('reports empty and non-string values', () => {
    expect(compareKeys({ a: 'A', b: 'B' }, { a: ' ', b: { nested: 'B' } }).invalid).toEqual([
      'a',
      'b',
    ]);
  });
});

describe('key order', () => {
  it('finds repeated keys and the first key out of order', () => {
    expect(keyOrder('{\n  "a": "1",\n  "b": "2",\n  "c": "3"\n}\n')).toEqual({ duplicates: [] });
    expect(keyOrder('{\n  "a": "1",\n  "c": "3",\n  "b": "2",\n  "a": "1"\n}\n')).toEqual({
      duplicates: ['a'],
      firstUnsorted: 'b',
    });
  });

  it('writes a sorted file that passes the order check', () => {
    const text = sortedMessages({ 'b.x': 'Б', a: 'A "q"', 'a.b': 'C' });
    expect(text).toBe('{\n  "a": "A \\"q\\"",\n  "a.b": "C",\n  "b.x": "Б"\n}\n');
    expect(keyOrder(text)).toEqual({ duplicates: [] });
  });
});
