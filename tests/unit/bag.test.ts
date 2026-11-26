// spec 5.6.1 (v8·v9) 섞은 카드 더미 — 12.1 bag.test ①~⑨ + v9 ①~⑤. 기대값은 spec 문장에서 따로 세운다.
import { describe, expect, it } from 'vitest';
import questionsJson from '../../src/data/questions.json';
import veryhardJson from '../../src/data/veryhard.json';
import extraJson from '../../src/data/vocab/clue-extra.json';
import {
  BAG_NAMES,
  bagPool,
  drawAnswers,
  drawGame,
  drawSpecFor,
  specBagNames,
  type DrawSpec,
  emptyBag,
  remainingCount,
  returnUnshown,
  sanitizeBag,
  type BagName,
  type BagState,
} from '../../src/game/bag.ts';
import { buildGamePlans, buildPlans } from '../../src/game/questions.ts';
import { mulberry32, type Rng } from '../../src/game/rng.ts';
import type { Difficulty } from '../../src/config.ts';
import type { BandChoice, Question, QuestionsFile } from '../../src/game/types.ts';

const main = (questionsJson as QuestionsFile).questions;
const vh = (veryhardJson as QuestionsFile).questions;
const advanced = (extraJson as { veryhardAdvanced: string[] }).veryhardAdvanced;
const POOLS = { main, veryhard: vh, advanced };
const advSet = new Set(advanced);
const P: Record<BagName, Question[]> = {
  '3-4': main.filter((q) => q.band === '3-4'),
  '5-6': main.filter((q) => q.band === '5-6'),
  'vh-mid': vh.filter((q) => !advSet.has(q.word)),
  'vh-adv': vh.filter((q) => advSet.has(q.word)),
};
/** spec 5.6.1 ① 표(v9) */
const SIZE: Record<BagName, number> = { '3-4': 143, '5-6': 87, 'vh-mid': 71, 'vh-adv': 48 };
/** v8의 bagsFor(Easy/Normal/Hard 부분) — 학년군의 기본 더미(테스트 안에 따로 적음) */
const v8BagsFor = (band: BandChoice): BagName[] => (band === 'all' ? ['3-4', '5-6'] : [band]);
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

/**
 * 무거운 테스트의 시간 제한(vitest 기본 5초 대신). 근거: 배포 러너(run 45878021468 attempt 1)에서 같은 테스트가 로컬(맥)보다
 * 최대 약 5.6배 느렸다(예: bag ③ 1.6초 → 7.3초, questions easy·5-6 0.69초 → 3.5초). 이 값을 쓰는 테스트는 로컬 최대 약 1.1초
 * (러너 추정 6~7초)라 30초면 러너 추정의 3배 이상 여유가 있다.
 */
const SLOW_TIMEOUT_MS = 30_000;

/**
 * 혼자 노는 더미 하나를 빈 상태·mulberry32(seed)로 60판 이어 뽑은 결과. ②(바퀴)와 ③(간격)이 똑같은 60판을 각자 다시 뽑던 것을
 * 한 번만 뽑아 함께 쓴다(배포 러너 5초 제한 대응). 뽑는 방법·씨앗은 두 테스트에 있던 것 그대로이고, 결과 배열은 어느 테스트도 바꾸지 않는다.
 */
const soloCache = new Map<string, string[][]>();
function soloGames(name: BagName, seed: number): string[][] {
  const key = `${name}|${seed}`;
  let games = soloCache.get(key);
  if (!games) {
    const rng = mulberry32(seed);
    const st: States = {};
    games = [];
    for (let g = 0; g < 60; g++) games.push(play(st, [name], rng));
    soloCache.set(key, games);
  }
  return games;
}

describe('bag (spec 5.6.1)', () => {
  it('v9 ① BAG_NAMES·풀 크기: 3-4 143, 5-6 87, vh-mid 71, vh-adv 48 (bagPool, 데이터 파일 순서)', () => {
    expect(BAG_NAMES).toEqual(['3-4', '5-6', 'vh-mid', 'vh-adv']);
    for (const n of BAG_NAMES) {
      expect(bagPool(n, POOLS).length).toBe(SIZE[n]);
      expect(bagPool(n, POOLS).map((q) => q.id)).toEqual(P[n].map((q) => q.id));
    }
    // 네 더미는 서로 겹치지 않고 349문항 전부
    const all = BAG_NAMES.flatMap((n) => P[n].map((q) => q.id));
    expect(new Set(all).size).toBe(143 + 87 + 71 + 48);
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

  it('② 바퀴 성질: 혼자 노는 더미 4종 × 60판 — 풀 크기씩 끊은 구간이 풀 전체를 정확히 한 번씩', () => {
    for (const name of BAG_NAMES) {
      const all = P[name].map((q) => q.id).sort();
      for (let seed = 1; seed <= SEEDS; seed++) {
        const seq: string[] = soloGames(name, seed).flat();
        const n = SIZE[name];
        for (let k = 0; (k + 1) * n <= seq.length; k++) {
          expect(seq.slice(k * n, (k + 1) * n).sort(), `${name} seed ${seed} 바퀴 ${k}`).toEqual(all);
        }
      }
    }
  }, SLOW_TIMEOUT_MS);

  /**
   * 같은 id가 나온 판 번호 차가 늘 4 이상, 한 판 안 중복 0.
   * 검사 내용은 그대로이고, id마다 expect를 부르던 것(③에서 약 64만 번)을 위반 목록을 모아 한 번 비교하는 것으로 바꿨다
   * (배포 러너에서 5초 제한을 넘던 원인). 위반이 있으면 목록에 판 번호·id가 그대로 찍힌다.
   */
  function expectGap(games: string[][], label: string): void {
    const last = new Map<string, number>();
    const bad: string[] = [];
    games.forEach((g, i) => {
      if (new Set(g).size !== g.length) bad.push(`${label} 판 ${i}: 한 판 안 중복`);
      for (const id of g) {
        const prev = last.get(id);
        if (prev !== undefined && i - prev < 4) bad.push(`${label} ${id}: 판 ${prev} → ${i} (차 ${i - prev} < 4)`);
        last.set(id, i);
      }
    });
    expect(bad, label).toEqual([]);
  }

  it('③ 간격: 혼자 노는 더미 60판과 학년군을 무작위로 바꾸는 80판 — 같은 id 사이 판 차 ≥ 4, 한 판 안 중복 0', () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      for (const name of BAG_NAMES) expectGap(soloGames(name, seed), `${name} seed ${seed}`);
      const rng = mulberry32(seed + 1000);
      const pick = mulberry32(seed + 5000);
      const st: States = {};
      const games: string[][] = [];
      for (let g = 0; g < 80; g++) {
        const band = (['3-4', '5-6', 'all'] as BandChoice[])[Math.floor(pick() * 3)]!;
        const names = v8BagsFor(band);
        const ids = play(st, names, rng);
        expect(ids.length).toBe(10);
        games.push(ids);
      }
      expectGap(games, `mixed seed ${seed}`);
    }
  }, SLOW_TIMEOUT_MS);

  it('④ "모두" 공유: 3-4로 5판 뒤 all 1판 — 3-4 used에 있던 id 0개, 뽑힌 문항은 제 학년군 더미 used에 더해짐', () => {
    const band34 = new Set(P['3-4'].map((q) => q.id));
    const band56 = new Set(P['5-6'].map((q) => q.id));
    for (let seed = 1; seed <= SEEDS; seed++) {
      const rng = mulberry32(seed);
      const st: States = {};
      for (let g = 0; g < 5; g++) play(st, ['3-4'], rng);
      const used34 = st['3-4']!.used.slice();
      expect(used34.length).toBe(50);
      const g6 = play(st, drawSpecFor('all', 'easy').base, rng);
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
    const p34 = bagPool('3-4', { main: main2, veryhard: vh, advanced });
    const p56 = bagPool('5-6', { main: main2, veryhard: vh, advanced });
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

  it('v9 ② drawSpecFor 표(5.6.1 ①-2): Easy 3조합 · Normal 3 · Hard 3 · Very Hard(학년 무시)', () => {
    const base: Record<BandChoice, BagName[]> = { '3-4': ['3-4'], '5-6': ['5-6'], all: ['3-4', '5-6'] };
    const up: Record<BandChoice, BagName[]> = { '3-4': ['5-6'], '5-6': ['vh-mid'], all: ['vh-mid'] };
    for (const band of ['3-4', '5-6', 'all'] as BandChoice[]) {
      expect(drawSpecFor(band, 'easy')).toEqual({ base: base[band], up: [], upCount: 0, upFrom: null });
      expect(drawSpecFor(band, 'normal')).toEqual({ base: base[band], up: up[band], upCount: 2, upFrom: 7 });
      expect(drawSpecFor(band, 'hard')).toEqual({ base: base[band], up: up[band], upCount: 4, upFrom: 4 });
      expect(drawSpecFor(band, 'veryhard')).toEqual({ base: ['vh-mid'], up: ['vh-adv'], upCount: 4, upFrom: 4 });
    }
    expect(specBagNames(drawSpecFor('all', 'hard'))).toEqual(['3-4', '5-6', 'vh-mid']);
    expect(specBagNames(drawSpecFor('3-4', 'normal'))).toEqual(['3-4', '5-6']);
    expect(specBagNames(drawSpecFor('5-6', 'easy'))).toEqual(['5-6']);
  });

  /** 한 판 뽑기(빈 더미 또는 states에서) */
  function game(states: States, spec: DrawSpec, rng: Rng) {
    const r = drawGame(spec, (name) => ({ name, pool: P[name], state: states[name] ?? emptyBag() }), rng);
    for (const n of specBagNames(spec)) states[n] = r.states[n]!;
    return r;
  }
  const COMBOS: [BandChoice, Difficulty][] = [
    ['3-4', 'normal'], ['5-6', 'normal'], ['all', 'normal'],
    ['3-4', 'hard'], ['5-6', 'hard'], ['all', 'hard'],
    ['all', 'veryhard'],
  ];

  it('v9 ③ 한 판: up 문항 수 = upCount, 자리가 모두 ≥ upFrom, up 문항은 up 더미에서·base는 base 더미에서, 중복 0, 같은 씨앗 = 같은 결과', () => {
    const want: Record<Difficulty, [number, number]> = { easy: [0, 0], normal: [2, 7], hard: [4, 4], veryhard: [4, 4] };
    for (const [band, d] of [...COMBOS, ['3-4', 'easy'], ['5-6', 'easy'], ['all', 'easy']] as [BandChoice, Difficulty][]) {
      const spec = drawSpecFor(band, d);
      const [upCount, upFrom] = want[d];
      const upIds = new Set(spec.up.flatMap((n) => P[n].map((q) => q.id)));
      const baseIds = new Set(spec.base.flatMap((n) => P[n].map((q) => q.id)));
      const seen = new Set<number>();
      for (let seed = 1; seed <= SEEDS; seed++) {
        const r = game({}, spec, mulberry32(seed));
        expect(r.answers.length).toBe(10);
        expect(r.levels.length).toBe(10);
        expect(new Set(r.answers.map((q) => q.id)).size).toBe(10);
        const ups = r.levels.map((l, i) => (l === 'up' ? i + 1 : 0)).filter((x) => x > 0);
        expect(ups.length).toBe(upCount);
        for (const no of ups) {
          expect(no).toBeGreaterThanOrEqual(upFrom);
          seen.add(no);
        }
        r.answers.forEach((q, i) => expect(r.levels[i] === 'up' ? upIds.has(q.id) : baseIds.has(q.id), `${band} ${d} ${i}`).toBe(true));
        // 같은 씨앗 = 같은 결과
        const again = game({}, spec, mulberry32(seed));
        expect(again.answers.map((q) => q.id)).toEqual(r.answers.map((q) => q.id));
        expect(again.levels).toEqual(r.levels);
      }
      // 자리는 rng로 무작위 — upFrom~10번 모두 한 번은 나온다
      if (upCount > 0) expect([...seen].sort((a, b) => a - b)).toEqual(Array.from({ length: 11 - upFrom }, (_, i) => upFrom + i));
    }
  });

  it('v9 ④ 조합을 판마다 무작위로 바꾸는 80판 · 조합마다 하나만 60판 — 같은 단어 사이 판 차 ≥ 4(사이에 3판 이상), 한 판 안 중복 0', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const rng = mulberry32(seed);
      const pick = mulberry32(seed + 7000);
      const st: States = {};
      const games: string[][] = [];
      for (let g = 0; g < 80; g++) {
        const [band, d] = COMBOS[Math.floor(pick() * COMBOS.length)]!;
        const r = game(st, drawSpecFor(band, d), rng);
        expect(r.answers.length).toBe(10);
        games.push(r.answers.map((q) => q.id));
      }
      expectGap(games, `mixed v9 seed ${seed}`);
    }
    for (const [band, d] of COMBOS) {
      for (let seed = 1; seed <= 40; seed++) {
        const rng = mulberry32(seed);
        const st: States = {};
        const games: string[][] = [];
        for (let g = 0; g < 60; g++) games.push(game(st, drawSpecFor(band, d), rng).answers.map((q) => q.id));
        expectGap(games, `${band} ${d} seed ${seed}`);
      }
    }
  }, SLOW_TIMEOUT_MS);

  it('v9 ⑤ Easy는 v8과 같은 결과: 같은 씨앗·같은 더미 상태에서 v8 bagsFor + drawAnswers + buildPlans와 정답·상태·카드·rng 뒤 값까지 같다', () => {
    for (const band of ['3-4', '5-6', 'all'] as BandChoice[]) {
      for (let seed = 1; seed <= 20; seed++) {
        const st8: States = {};
        const st9: States = {};
        const rng8 = mulberry32(seed);
        const rng9 = mulberry32(seed);
        // 같은 더미 상태로 이어지는 16판(3-4는 15판째, 5-6은 9판째에 바퀴 경계)
        for (let g = 0; g < 16; g++) {
          const names = v8BagsFor(band);
          const d8 = drawAnswers(names.map((name) => ({ name, pool: P[name], state: st8[name] ?? emptyBag() })), 10, rng8);
          for (const n of names) st8[n] = d8.states[n]!;
          const plans8 = buildPlans(main, band, 'easy', rng8, d8.answers);

          const d9 = game(st9, drawSpecFor(band, 'easy'), rng9);
          const plans9 = buildGamePlans(POOLS, band, 'easy', rng9, d9.answers, d9.levels);

          expect(d9.answers.map((q) => q.id)).toEqual(d8.answers.map((q) => q.id));
          expect(d9.levels.every((l) => l === 'base')).toBe(true);
          expect(st9).toEqual(st8);
          expect(plans9.map((p) => [p.options.map((q) => q.word), p.delaysMs, p.fallMs, p.stage.cards])).toEqual(
            plans8.map((p) => [p.options.map((q) => q.word), p.delaysMs, p.fallMs, p.stage.cards]),
          );
        }
        expect(rng9()).toBe(rng8());
      }
    }
    // 시간 제한: 로컬 약 5.6초, 배포 러너 실측 24.5초(run 45878021468 attempt 1)·14.5초(attempt 2) — 옛 60초는 2.4배뿐이라
    // 러너 최악 추정(로컬 × 5.6 ≈ 31초)의 3배 이상인 120초로 올림. 씨앗 20개 × 학년군 3 × 16판은 그대로(바퀴 경계 두 곳을 씨앗마다 지남).
  }, 120_000);
});
