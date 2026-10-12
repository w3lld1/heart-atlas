import { describe, expect, it } from 'vitest';
import { quizStorageKey } from '../src/lib/quiz-client.ts';
import {
  isQuizDone,
  isRead,
  nextUnread,
  readStorageKey,
  setRead,
} from '../src/lib/track-progress.ts';

function memoryStore() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  };
}

const blocked = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
  removeItem: () => {
    throw new Error('blocked');
  },
};

describe('read marks', () => {
  it('are stored per article and can be removed', () => {
    const store = memoryStore();
    expect(readStorageKey('ru/anatomy/heart-valves')).toBe('ha:read:ru/anatomy/heart-valves');
    expect(isRead('ru/anatomy/heart-valves', store)).toBe(false);
    setRead('ru/anatomy/heart-valves', true, store);
    expect(isRead('ru/anatomy/heart-valves', store)).toBe(true);
    expect(isRead('en/anatomy/heart-valves', store)).toBe(false);
    setRead('ru/anatomy/heart-valves', false, store);
    expect(isRead('ru/anatomy/heart-valves', store)).toBe(false);
  });

  it('read as unread and never throw without storage', () => {
    expect(() => setRead('ru/a/b', true, blocked)).not.toThrow();
    expect(isRead('ru/a/b', blocked)).toBe(false);
    expect(isRead('ru/a/b', undefined)).toBe(false);
  });
});

describe('isQuizDone', () => {
  it('is true once a full pass is saved at any level', () => {
    const store = memoryStore();
    expect(isQuizDone('ru/disease/x', store)).toBe(false);
    store.setItem(
      'ha:quiz:ru/disease/x',
      JSON.stringify({ student: { correct: 2, total: 4, date: '2026-10-12' } }),
    );
    expect(isQuizDone('ru/disease/x', store)).toBe(true);
  });

  it('reads the key the quiz writes', () => {
    const store = memoryStore();
    store.setItem(
      quizStorageKey('en/anatomy/y'),
      JSON.stringify({ patient: { correct: 1, total: 1, date: '' } }),
    );
    expect(isQuizDone('en/anatomy/y', store)).toBe(true);
  });

  it('is false for broken data or blocked storage', () => {
    const store = memoryStore();
    store.setItem('ha:quiz:ru/disease/x', '{not json');
    expect(isQuizDone('ru/disease/x', store)).toBe(false);
    expect(isQuizDone('ru/disease/x', blocked)).toBe(false);
  });
});

describe('nextUnread', () => {
  const steps = [{ key: 'a' }, { key: 'b' }, { key: 'c' }];

  it('finds the first step not read, even after a later one', () => {
    expect(nextUnread(steps, () => false)).toBe(0);
    expect(nextUnread(steps, (key) => key === 'a' || key === 'c')).toBe(1);
  });

  it('is undefined when every step is read', () => {
    expect(nextUnread(steps, () => true)).toBeUndefined();
  });
});
