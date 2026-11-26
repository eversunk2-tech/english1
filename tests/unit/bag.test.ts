// spec 5.6.1 (v8) 섞은 카드 더미 — 12.1 bag.test ①~⑩. 기대값은 spec 문장에서 따로 세운다.
import { describe, expect, it } from 'vitest';
import questionsJson from '../../src/data/questions.json';
import veryhardJson from '../../src/data/veryhard.json';
import {
  bagPool,
  bagsFor,
  drawAnswers,
  emptyBag,
  remainingCount,
  returnUnshown,
  sanitizeBag,
  type BagName,
  type BagState,
} from '../../src/game/bag.ts';
import { mulberry32, type Rng } from '../../src/game/rng.ts';
import type { BandChoice, Question, QuestionsFile } from '../../src/game/types.ts';

const main = (questionsJson as QuestionsFile).questions;
const vh = (veryhardJson as QuestionsFile).questions;
const POOLS = { main, veryhard: vh };
const P: Record<BagName, Question[]> = {
  '3-4': main.filter((q) => q.band === '3-4'),
  '5-6': main.filter((q) => q.band === '5-6'),
  veryhard: vh.slice(),
};
const SIZE: Record<BagName, number> = { '3-4': 143, '5-6': 87, veryhard: 94 };
const COOL = 30;
const SEEDS = 200;

type States = Partial<Record<BagName, BagState>>;

/** 한 판: 쓰는 더미의 상태를 넣어 뽑고 새 상태로 바꿔 둔다 */
function play(states: States, names: readonly BagName[], rng: Rng): string[] {
  const r = drawAnswers(
    names.map((name) => ({ name, pool: P[name], state: states[name] ?? emptyBag() })),
    10,
    rng,
  );
  for (const n of names) states[n] = r.states[n]!;
  return r.answers.map((q) => q.id);
}

describe('bag (spec 5.6.1)', () => {
  it('풀 크기: 3-4 143, 5-6 87, veryhard 94 (bagPool)', () => {
    for (const n of ['3-4', '5-6', 'veryhard'] as BagName[]) expect(bagPool(n, POOLS).length).toBe(SIZE[n]);
    expect(bagPool('5-6', POOLS).map((q) => q.id)).toEqual(P['5-6'].map((q) => q.id));
  });

  it('① 5~6 경계: 8판 80개 모두 다름, 9판 = 남은 7개 전부 + 6~8판에 없는 새 3개, used·recent', () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const rng = mulberry32(seed);
      const st: States = {};
      const games: string[][] = [];
      for (let g = 0; g < 8; g++) games.push(play(st, ['5-6'], rng));
      const first80 = games.flat();
      expect(new Set(first80).size).toBe(80);
      const left7 = P['5-6'].map((q) => q.id).filter((id) => !first80.includes(id));
      expect(left7.length).toBe(7);
      const g9 = play(st, ['5-6'], rng);
      expect(new Set(g9).size).toBe(10);
      for (const id of left7) expect(g9).toContain(id);
      const extra = g9.filter((id) => !left7.includes(id));
      expect(extra.length).toBe(3);
      const last30 = games.slice(5).flat();
      for (const id of extra) expect(last30).not.toContain(id);
      expect(st['5-6']!.used.slice().sort()).toEqual(extra.slice().sort());
      // recent = 9판 10개(나중에 뽑은 것이 앞) + 8판 + 7판
      expect(st['5-6']!.recent.length).toBe(30);
      expect(new Set(st['5-6']!.recent.slice(0, 10))).toEqual(new Set(g9));
      expect(st['5-6']!.recent.slice(0, 10)).toEqual(g9.slice().reverse());
      expect(new Set(st['5-6']!.recent.slice(10))).toEqual(new Set([...games[6]!, ...games[7]!]));
    }
  });

  it('② 바퀴 성질: 혼자 노는 더미 3종 × 60판 — 풀 크기씩 끊은 구간이 풀 전체를 정확히 한 번씩', () => {
    for (const name of ['3-4', '5-6', 'veryhard'] as BagName[]) {
      const all = P[name].map((q) => q.id).sort();
      for (let seed = 1; seed <= SEEDS; seed++) {
        const rng = mulberry32(seed);
        const st: States = {};
        const seq: string[] = [];
        for (let g = 0; g < 60; g++) seq.push(...play(st, [name], rng));
        const n = SIZE[name];
        for (let k = 0; (k + 1) * n <= seq.length; k++) {
          expect(seq.slice(k * n, (k + 1) * n).sort(), `${name} seed ${seed} 바퀴 ${k}`).toEqual(all);
        }
      }
    }
  });

  /** 같은 id가 나온 판 번호 차가 늘 4 이상, 한 판 안 중복 0 */
  function expectGap(games: string[][], label: string): void {
    const last = new Map<string, number>();
    games.forEach((g, i) => {
      expect(new Set(g).size, `${label} 판 ${i}`).toBe(g.length);
      for (const id of g) {
        const prev = last.get(id);
        if (prev !== undefined) expect(i - prev, `${label} ${id}`).toBeGreaterThanOrEqual(4);
        last.set(id, i);
      }
    });
  }

  it('③ 간격: 혼자 노는 더미 60판과 학년군을 무작위로 바꾸는 80판 — 같은 id 사이 판 차 ≥ 4, 한 판 안 중복 0', () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      for (const name of ['3-4', '5-6', 'veryhard'] as BagName[]) {
        const rng = mulberry32(seed);
        const st: States = {};
        const games: string[][] = [];
        for (let g = 0; g < 60; g++) games.push(play(st, [name], rng));
        expectGap(games, `${name} seed ${seed}`);
      }
      const rng = mulberry32(seed + 1000);
      const pick = mulberry32(seed + 5000);
      const st: States = {};
      const games: string[][] = [];
      for (let g = 0; g < 80; g++) {
        const band = (['3-4', '5-6', 'all'] as BandChoice[])[Math.floor(pick() * 3)]!;
        const names = bagsFor(band, 'normal');
        const ids = play(st, names, rng);
        expect(ids.length).toBe(10);
        games.push(ids);
      }
      expectGap(games, `mixed seed ${seed}`);
    }
  });

  it('④ "모두" 공유: 3-4로 5판 뒤 all 1판 — 3-4 used에 있던 id 0개, 뽑힌 문항은 제 학년군 더미 used에 더해짐', () => {
    const band34 = new Set(P['3-4'].map((q) => q.id));
    const band56 = new Set(P['5-6'].map((q) => q.id));
    for (let seed = 1; seed <= SEEDS; seed++) {
      const rng = mulberry32(seed);
      const st: States = {};
      for (let g = 0; g < 5; g++) play(st, ['3-4'], rng);
      const used34 = st['3-4']!.used.slice();
      expect(used34.length).toBe(50);
      const g6 = play(st, bagsFor('all', 'easy'), rng);
      expect(g6.filter((id) => used34.includes(id))).toEqual([]);
      const new34 = g6.filter((id) => band34.has(id));
      const new56 = g6.filter((id) => band56.has(id));
      expect(new34.length + new56.length).toBe(10);
      expect(st['3-4']!.used).toEqual([...used34, ...new34]);
      expect(st['5-6']!.used).toEqual(new56);
    }
  });

  it('⑤ sanitizeBag: 깨진 값 → 빈 더미, 풀에 없는 id·중복 버림, recent 30개, 풀 변경(추가·삭제·학년군 이동)', () => {
    const ids56 = P['5-6'].map((q) => q.id);
    for (const raw of ['{broken', 'null', '42', '"x"', '[]', JSON.stringify({ v: 2, used: [], recent: [] }), JSON.stringify({ v: 1, used: 'a', recent: [] }), JSON.stringify({ v: 1, used: ['a', 3], recent: [] }), JSON.stringify({ v: 1, used: [] }), JSON.stringify({ used: [], recent: [] }), null, undefined, 5]) {
      expect(sanitizeBag(raw, ids56), String(raw)).toEqual({ used: [], recent: [] });
    }
    const s = sanitizeBag(
      JSON.stringify({ v: 1, used: [ids56[0], 'gone-99', ids56[1], ids56[0]], recent: [ids56[1], 'x', ids56[1], ...ids56.slice(2, 40)] }),
      ids56,
    );
    expect(s.used).toEqual([ids56[0], ids56[1]]);
    expect(s.recent.length).toBe(30);
    expect(s.recent.slice(0, 2)).toEqual([ids56[1], ids56[2]]);
    // 이미 읽은 객체도 받는다
    expect(sanitizeBag({ v: 1, used: [ids56[3]], recent: [] }, ids56).used).toEqual([ids56[3]]);

    // 풀에 새 id를 더하면(가짜 풀 88개, used 80) 남은 8개에 새 id 포함
    const fake: Question = { ...P['5-6'][0]!, id: 'new-01', word: 'newword' };
    const pool88 = [...P['5-6'], fake];
    const used80 = ids56.slice(0, 80);
    const st80 = sanitizeBag(JSON.stringify({ v: 1, used: used80, recent: [] }), pool88.map((q) => q.id));
    expect(remainingCount(pool88, st80)).toBe(8);
    const r = drawAnswers([{ name: '5-6', pool: pool88, state: st80 }], 10, mulberry32(1));
    expect(r.answers.slice(0, 8).map((q) => q.id).sort()).toEqual([...ids56.slice(80), 'new-01'].sort());

    // 풀에서 id를 지우면 남은 수가 그만큼 줄고 오류 없음
    const pool85 = P['5-6'].filter((q) => q.id !== ids56[84] && q.id !== ids56[85]);
    const st85 = sanitizeBag(JSON.stringify({ v: 1, used: used80, recent: [] }), pool85.map((q) => q.id));
    expect(remainingCount(pool85, st85)).toBe(5);
    expect(() => drawAnswers([{ name: '5-6', pool: pool85, state: st85 }], 10, mulberry32(2))).not.toThrow();

    // 문항의 band를 5-6 → 3-4로 옮기면 5-6 used에서 빠지고 3-4에서는 남은 문항
    const moved = { ...P['5-6'][0]!, band: '3-4' as const };
    const main2 = main.map((q) => (q.id === moved.id ? moved : q));
    const p34 = bagPool('3-4', { main: main2, veryhard: vh });
    const p56 = bagPool('5-6', { main: main2, veryhard: vh });
    const raw56 = JSON.stringify({ v: 1, used: [moved.id, ids56[1]], recent: [moved.id] });
    const s56 = sanitizeBag(raw56, p56.map((q) => q.id));
    expect(s56.used).toEqual([ids56[1]]);
    expect(s56.recent).toEqual([]);
    const s34 = sanitizeBag(JSON.stringify({ v: 1, used: [], recent: [] }), p34.map((q) => q.id));
    expect(remainingCount(p34, s34)).toBe(144);
    expect(p34.some((q) => q.id === moved.id)).toBe(true);
  });

  it('⑥ 시작 때 다 쓴 더미(used = 풀 전체) → 새 바퀴, recent 30개는 그 판에서 뽑히지 않음', () => {
    const ids = P['5-6'].map((q) => q.id);
    const recent = ids.slice(-COOL).reverse();
    for (let seed = 1; seed <= SEEDS; seed++) {
      const r = drawAnswers([{ name: '5-6', pool: P['5-6'], state: { used: ids.slice(), recent } }], 10, mulberry32(seed));
      const got = r.answers.map((q) => q.id);
      expect(new Set(got).size).toBe(10);
      for (const id of got) expect(recent).not.toContain(id);
      expect(r.states['5-6']!.used).toEqual(got);
    }
  });

  it('⑦ returnUnshown: 4~10번을 되돌리면 used·recent에서 빠지고 1~3번은 남음, 경계 판에서도 새 바퀴 used가 맞음', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const rng = mulberry32(seed);
      const st: States = {};
      const g1 = play(st, ['3-4'], rng);
      const back = returnUnshown(st, g1.slice(3));
      expect(back['3-4']!.used).toEqual(g1.slice(0, 3));
      expect(back['3-4']!.recent.slice().sort()).toEqual(g1.slice(0, 3).sort());
      expect(remainingCount(P['3-4'], back['3-4']!)).toBe(140);

      // 경계 판: 5-6에서 80개를 낸 상태 → 옛 바퀴 7 + 새 바퀴 3
      const st2: States = {};
      for (let g = 0; g < 8; g++) play(st2, ['5-6'], rng);
      const before = st2['5-6']!.used.slice();
      const left7 = P['5-6'].map((q) => q.id).filter((id) => !before.includes(id));
      const g9 = play(st2, ['5-6'], rng);
      const new3 = g9.filter((id) => !left7.includes(id));
      // 문제 1~7은 옛 바퀴의 남은 7개(먼저 모두 넣음), 8~10은 새 바퀴 3개
      expect(g9.slice(0, 7).sort()).toEqual(left7.slice().sort());
      // 1~3번까지 나온 경우(옛 바퀴 것만 나옴)와 1~8번까지 나온 경우(새 바퀴 1개 나옴)
      for (const k of [3, 8]) {
        const shown = g9.slice(0, k);
        const b2 = returnUnshown(st2, g9.slice(k))['5-6']!;
        // 새 바퀴 used = 새 바퀴 3개 중 화면에 나온 것만
        expect(b2.used.slice().sort()).toEqual(new3.filter((id) => shown.includes(id)).sort());
        for (const id of g9.slice(k)) {
          expect(b2.used).not.toContain(id);
          expect(b2.recent).not.toContain(id);
        }
        for (const id of shown) expect(b2.recent).toContain(id);
        // 되돌린 옛 바퀴 문항은 새 바퀴의 아직 안 낸 문항
        expect(remainingCount(P['5-6'], b2)).toBe(87 - b2.used.length);
      }
    }
  });

  it('⑧ 같은 상태 + 같은 씨앗 = 같은 결과, drawAnswers는 입력 상태를 바꾸지 않는다', () => {
    const ids = P['3-4'].map((q) => q.id);
    const state: BagState = { used: ids.slice(0, 40), recent: ids.slice(30, 40).reverse() };
    const snap = JSON.stringify(state);
    const a = drawAnswers([{ name: '3-4', pool: P['3-4'], state }, { name: '5-6', pool: P['5-6'], state: emptyBag() }], 10, mulberry32(42));
    const b = drawAnswers([{ name: '3-4', pool: P['3-4'], state }, { name: '5-6', pool: P['5-6'], state: emptyBag() }], 10, mulberry32(42));
    expect(a.answers.map((q) => q.id)).toEqual(b.answers.map((q) => q.id));
    expect(a.states).toEqual(b.states);
    expect(JSON.stringify(state)).toBe(snap);
  });

  it('⑨ 작은 풀: 6개·n 10 → 6개만 돌려주고 끝남, 15개 → 매 판 10개 서로 다름', () => {
    const small6 = P['3-4'].slice(0, 6);
    const r = drawAnswers([{ name: '3-4', pool: small6, state: emptyBag() }], 10, mulberry32(1));
    expect(r.answers.length).toBe(6);
    expect(new Set(r.answers.map((q) => q.id)).size).toBe(6);
    // 다 쓴 6개 풀에서도 끝난다
    const r2 = drawAnswers([{ name: '3-4', pool: small6, state: r.states['3-4']! }], 10, mulberry32(2));
    expect(r2.answers.length).toBe(6);
    // 빈 풀
    expect(drawAnswers([{ name: '3-4', pool: [], state: emptyBag() }], 10, mulberry32(3)).answers).toEqual([]);

    const small15 = P['3-4'].slice(0, 15);
    let state = emptyBag();
    const rng = mulberry32(9);
    for (let g = 0; g < 20; g++) {
      const d = drawAnswers([{ name: '3-4', pool: small15, state }], 10, rng);
      expect(d.answers.length).toBe(10);
      expect(new Set(d.answers.map((q) => q.id)).size).toBe(10);
      state = d.states['3-4']!;
    }
  });

  it('⑩ bagsFor: veryhard → [veryhard](학년 무시), all → [3-4, 5-6], 세 난이도는 같은 더미', () => {
    for (const band of ['3-4', '5-6', 'all'] as BandChoice[]) expect(bagsFor(band, 'veryhard')).toEqual(['veryhard']);
    for (const d of ['easy', 'normal', 'hard'] as const) {
      expect(bagsFor('all', d)).toEqual(['3-4', '5-6']);
      expect(bagsFor('3-4', d)).toEqual(['3-4']);
      expect(bagsFor('5-6', d)).toEqual(['5-6']);
    }
  });
});
