import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { bestKey, loadBest, loadDifficulty, loadRecent, migrateBest, saveBest, saveDifficulty, saveRecent } from '../../src/platform/storage.ts';

class FakeStorage {
  m = new Map<string, string>();
  getItem(k: string): string | null {
    return this.m.has(k) ? (this.m.get(k) as string) : null;
  }
  setItem(k: string, v: string): void {
    this.m.set(k, String(v));
  }
}

let store: FakeStorage;
const g = globalThis as unknown as { window?: unknown };

beforeEach(() => {
  store = new FakeStorage();
  g.window = { localStorage: store };
});
afterEach(() => {
  delete g.window;
});

describe('storage v2 (spec 5.5)', () => {
  it('최고 점수 키는 catchword.best.<band>.<difficulty>', () => {
    expect(bestKey('5-6', 'hard')).toBe('catchword.best.5-6.hard');
    saveBest('5-6', 'hard', 1234.4);
    expect(store.getItem('catchword.best.5-6.hard')).toBe('1234');
    expect(loadBest('5-6', 'hard')).toBe(1234);
    expect(loadBest('5-6', 'normal')).toBe(0);
  });

  it('Very Hard 최고 점수·최근 목록은 학년과 상관없이 따로(v4)', () => {
    expect(bestKey('3-4', 'veryhard')).toBe('catchword.best.veryhard');
    expect(bestKey('5-6', 'veryhard')).toBe('catchword.best.veryhard');
    saveBest('5-6', 'veryhard', 3000);
    expect(store.getItem('catchword.best.veryhard')).toBe('3000');
    expect(loadBest('3-4', 'veryhard')).toBe(3000);
    expect(loadBest('3-4', 'hard')).toBe(0);
    saveRecent(['zebra', 'frog'], 'veryhard');
    saveRecent(['cat']);
    expect(store.getItem('catchword.recent.veryhard')).toBe('["zebra","frog"]');
    expect(store.getItem('catchword.recent')).toBe('["cat"]');
    expect(loadRecent('veryhard')).toEqual(['zebra', 'frog']);
    expect(loadRecent('hard')).toEqual(['cat']);
    expect(loadRecent()).toEqual(['cat']);
    saveDifficulty('veryhard');
    expect(loadDifficulty()).toBe('veryhard');
  });

  it('v1 키만 있으면 Easy로 한 번 옮기고 옛 키는 남긴다', () => {
    store.setItem('catchword.best.3-4', '987');
    store.setItem('catchword.best.all', '500');
    store.setItem('catchword.best.all.easy', '700');
    migrateBest();
    expect(store.getItem('catchword.best.3-4.easy')).toBe('987');
    expect(store.getItem('catchword.best.3-4')).toBe('987');
    expect(loadBest('3-4', 'easy')).toBe(987);
    expect(loadBest('3-4', 'normal')).toBe(0);
    // 새 Easy 키가 이미 있으면 덮어쓰지 않음
    expect(store.getItem('catchword.best.all.easy')).toBe('700');
    // 한 번만: 다시 불러도 그대로
    saveBest('3-4', 'easy', 1200);
    migrateBest();
    expect(loadBest('3-4', 'easy')).toBe(1200);
    expect(store.getItem('catchword.best.5-6.easy')).toBe(null);
  });

  it('난이도 기억: 없거나 이상한 값이면 normal', () => {
    expect(loadDifficulty()).toBe('normal');
    saveDifficulty('hard');
    expect(store.getItem('catchword.difficulty')).toBe('hard');
    expect(loadDifficulty()).toBe('hard');
    store.setItem('catchword.difficulty', 'nightmare');
    expect(loadDifficulty()).toBe('normal');
  });

  it('localStorage가 막혀 있으면 저장만 건너뜀', () => {
    g.window = {
      get localStorage(): never {
        throw new Error('blocked');
      },
    };
    expect(() => saveBest('3-4', 'easy', 5)).not.toThrow();
    expect(() => migrateBest()).not.toThrow();
    expect(loadBest('3-4', 'easy')).toBe(0);
    expect(loadDifficulty()).toBe('normal');
  });
});
