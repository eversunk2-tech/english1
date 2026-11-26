import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import questionsJson from '../../src/data/questions.json';
import veryhardJson from '../../src/data/veryhard.json';
import { bestKey, loadBest, loadDifficulty, migrateBest, migrateRecentToBags, saveBest, saveDifficulty } from '../../src/platform/storage.ts';
import { BagStore } from '../../src/platform/bagStore.ts';
import { drawAnswers, type BagName } from '../../src/game/bag.ts';
import { mulberry32 } from '../../src/game/rng.ts';
import type { QuestionsFile } from '../../src/game/types.ts';

const main = (questionsJson as QuestionsFile).questions;
const veryhard = (veryhardJson as QuestionsFile).questions;
const POOLS = { main, veryhard };
const idOf = (w: string): string => [...main, ...veryhard].find((q) => q.word === w)!.id;

class FakeStorage {
  m = new Map<string, string>();
  getItem(k: string): string | null {
    return this.m.has(k) ? (this.m.get(k) as string) : null;
  }
  setItem(k: string, v: string): void {
    this.m.set(k, String(v));
  }
  removeItem(k: string): void {
    this.m.delete(k);
  }
}

/** 읽기·쓰기·지우기를 센다 */
class CountingStorage extends FakeStorage {
  gets: string[] = [];
  sets: string[] = [];
  override getItem(k: string): string | null {
    this.gets.push(k);
    return super.getItem(k);
  }
  override setItem(k: string, v: string): void {
    this.sets.push(k);
    super.setItem(k, v);
  }
}

/** 한 판 뽑고 바로 저장(App.startGame과 같은 순서) */
function playOne(bs: BagStore, names: BagName[], seed: number): string[] {
  const r = drawAnswers(
    names.map((name) => ({ name, pool: bs.pool(name), state: bs.load(name) })),
    10,
    mulberry32(seed),
  );
  for (const n of names) bs.save(n, r.states[n]!);
  return r.answers.map((q) => q.id);
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

  it('Very Hard 최고 점수는 학년과 상관없이 따로(v4)', () => {
    expect(bestKey('3-4', 'veryhard')).toBe('catchword.best.veryhard');
    expect(bestKey('5-6', 'veryhard')).toBe('catchword.best.veryhard');
    saveBest('5-6', 'veryhard', 3000);
    expect(store.getItem('catchword.best.veryhard')).toBe('3000');
    expect(loadBest('3-4', 'veryhard')).toBe(3000);
    expect(loadBest('3-4', 'hard')).toBe(0);
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

describe('BagStore (v8, spec 5.6.1 ⑥)', () => {
  it('persist 모드: catchword.bag.5-6에 {"v":1,…} 저장, 새 BagStore가 다시 읽는다', () => {
    const a = new BagStore(POOLS, { persist: true });
    const first = playOne(a, ['5-6'], 1);
    const raw = JSON.parse(store.getItem('catchword.bag.5-6')!);
    expect(raw.v).toBe(1);
    expect(raw.used).toEqual(first);
    expect(raw.recent).toEqual(first.slice().reverse());
    const b = new BagStore(POOLS, { persist: true });
    expect(b.load('5-6').used).toEqual(first);
    const second = playOne(b, ['5-6'], 2);
    expect(second.filter((id) => first.includes(id))).toEqual([]);
    expect(JSON.parse(store.getItem('catchword.bag.5-6')!).used).toEqual([...first, ...second]);
  });

  it('persist 끔(seed 모드): localStorage에 catchword.bag.* 읽기 0·쓰기 0, 미리 넣은 값이 있어도 빈 더미로 시작', () => {
    const cs = new CountingStorage();
    g.window = { localStorage: cs };
    const pre = JSON.stringify({ v: 1, used: main.filter((q) => q.band === '5-6').slice(0, 50).map((q) => q.id), recent: [] });
    cs.setItem('catchword.bag.5-6', pre);
    cs.sets = [];
    const bs = new BagStore(POOLS, { persist: false });
    expect(bs.load('5-6').used).toEqual([]);
    const a = playOne(bs, ['5-6'], 3);
    const b = playOne(bs, ['5-6'], 4);
    expect(new Set([...a, ...b]).size).toBe(20);
    playOne(bs, ['3-4', '5-6'], 5);
    playOne(bs, ['veryhard'], 6);
    expect(cs.gets.filter((k) => k.startsWith('catchword.bag.'))).toEqual([]);
    expect(cs.sets.filter((k) => k.startsWith('catchword.bag.'))).toEqual([]);
    expect(cs.getItem('catchword.bag.5-6')).toBe(pre);
  });

  it('getItem/setItem이 예외를 던지면 오류 없이 메모리로 이어 간다(두 판 중복 0)', () => {
    g.window = {
      localStorage: {
        getItem(): never {
          throw new Error('blocked');
        },
        setItem(): never {
          throw new Error('blocked');
        },
        removeItem(): never {
          throw new Error('blocked');
        },
      },
    };
    const bs = new BagStore(POOLS, { persist: true });
    let a: string[] = [];
    let b: string[] = [];
    expect(() => {
      a = playOne(bs, ['5-6'], 7);
      b = playOne(bs, ['5-6'], 8);
    }).not.toThrow();
    expect(new Set([...a, ...b]).size).toBe(20);
    expect(() => migrateRecentToBags(POOLS)).not.toThrow();
  });

  it('localStorage 자체가 막혀 있어도(접근하면 예외) 메모리로 이어 간다', () => {
    g.window = {
      get localStorage(): never {
        throw new Error('blocked');
      },
    };
    const bs = new BagStore(POOLS, { persist: true });
    const a = playOne(bs, ['3-4'], 9);
    const b = playOne(bs, ['3-4'], 10);
    expect(new Set([...a, ...b]).size).toBe(20);
  });
});

describe('migrateRecentToBags (v8, spec 5.6.1 ⑦)', () => {
  it('옛 catchword.recent(3~4·5~6 섞임)·catchword.recent.veryhard → 각 더미의 used·recent, 옛 키 지움, 모르는 단어는 버림', () => {
    const w56 = main.filter((q) => q.band === '5-6').slice(0, 2);
    // 새것이 앞
    store.setItem('catchword.recent', JSON.stringify(['cat', w56[0]!.word, 'nosuchword', 'dog', w56[1]!.word]));
    store.setItem('catchword.recent.veryhard', JSON.stringify(['zebra', 'frog', 'cat']));
    migrateRecentToBags(POOLS);
    expect(store.getItem('catchword.recent')).toBe(null);
    expect(store.getItem('catchword.recent.veryhard')).toBe(null);
    const b34 = JSON.parse(store.getItem('catchword.bag.3-4')!);
    expect(b34.v).toBe(1);
    expect(b34.used.slice().sort()).toEqual([idOf('cat'), idOf('dog')].sort());
    expect(b34.recent).toEqual([idOf('cat'), idOf('dog')]);
    const b56 = JSON.parse(store.getItem('catchword.bag.5-6')!);
    expect(b56.used.slice().sort()).toEqual([w56[0]!.id, w56[1]!.id].sort());
    expect(b56.recent).toEqual([w56[0]!.id, w56[1]!.id]);
    const bvh = JSON.parse(store.getItem('catchword.bag.veryhard')!);
    // Very Hard 더미에는 Very Hard 단어만(cat은 Very Hard 풀에 없음)
    expect(bvh.used.slice().sort()).toEqual([idOf('zebra'), idOf('frog')].sort());
    expect(bvh.recent).toEqual([idOf('zebra'), idOf('frog')]);
    // BagStore로 읽으면 남은 수가 줄어 있다
    const bs = new BagStore(POOLS, { persist: true });
    expect(bs.load('3-4').used.length).toBe(2);
  });

  it('이미 있는 catchword.bag.*는 그대로 두고 옛 키는 지운다', () => {
    const existing = JSON.stringify({ v: 1, used: [idOf('frog')], recent: [] });
    store.setItem('catchword.bag.3-4', JSON.stringify({ v: 1, used: [], recent: [] }));
    store.setItem('catchword.bag.veryhard', existing);
    store.setItem('catchword.recent', JSON.stringify(['cat', 'dog']));
    store.setItem('catchword.recent.veryhard', JSON.stringify(['zebra']));
    migrateRecentToBags(POOLS);
    expect(store.getItem('catchword.bag.3-4')).toBe(JSON.stringify({ v: 1, used: [], recent: [] }));
    expect(store.getItem('catchword.bag.veryhard')).toBe(existing);
    expect(store.getItem('catchword.bag.5-6')).toBe(null);
    expect(store.getItem('catchword.recent')).toBe(null);
    expect(store.getItem('catchword.recent.veryhard')).toBe(null);
  });

  it('옛 키가 없으면 아무것도 쓰지 않는다, 깨진 값이면 옮길 것 없이 지운다', () => {
    migrateRecentToBags(POOLS);
    expect([...store.m.keys()]).toEqual([]);
    store.setItem('catchword.recent', '{broken');
    migrateRecentToBags(POOLS);
    expect([...store.m.keys()]).toEqual([]);
  });
});
