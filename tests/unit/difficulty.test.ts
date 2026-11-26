import { describe, expect, it } from 'vitest';
import questionsJson from '../../src/data/questions.json';
import veryhardJson from '../../src/data/veryhard.json';
import extraJson from '../../src/data/vocab/clue-extra.json';
import { GAME, type Difficulty } from '../../src/config.ts';
import { fallMsFor, floorMs, parseDifficulty, stageFor, timeNeededMs } from '../../src/game/difficulty.ts';
import { cardMetrics, cardRect } from '../../src/game/layout.ts';
import { applyPenalty, correctScore } from '../../src/game/scoring.ts';
import type { Band, Question, QuestionsFile } from '../../src/game/types.ts';

const qs = (questionsJson as QuestionsFile).questions;
const vhq = (veryhardJson as QuestionsFile).questions;
const advanced = new Set((extraJson as { veryhardAdvanced: string[] }).veryhardAdvanced);
const vhMid = vhq.filter((q) => !advanced.has(q.word));
const DIFFS: Difficulty[] = ['easy', 'normal', 'hard', 'veryhard'];
const STAGE_START = [1, 4, 7];

/** spec 7.4 토큰 규칙을 테스트 안에서 따로: 소문자 → [a-z]+('[a-z]+)? → 끝 's 떼기 */
function wordCount(clue: string): number {
  return (clue.toLowerCase().match(/[a-z]+('[a-z]+)?/g) ?? []).length;
}

/** spec 5.3.3 읽기 계수 표(v9, ms/낱말)를 테스트 안에 따로 적는다 */
const WORD: Record<Difficulty, Record<Band, number>> = {
  easy: { '3-4': 350, '5-6': 300, vh: 250 },
  normal: { '3-4': 350, '5-6': 300, vh: 250 },
  hard: { '3-4': 300, '5-6': 250, vh: 200 },
  veryhard: { '3-4': 300, '5-6': 250, vh: 200 },
};
/** spec 5.3.3: T_need = BASE 300 + n × WORD[d][band] + MOVE 1000 + GRAB 400 */
function needMs(n: number, band: Band, d: Difficulty): number {
  return 300 + n * WORD[d][band] + 1000 + 400;
}
/** 바닥 = ceil(T_need × 100 / 85 / 10) × 10 */
function expectedFloor(n: number, band: Band, d: Difficulty): number {
  return Math.ceil((needMs(n, band, d) * 100) / 85 / 10) * 10;
}
/** 5.3.2 단계 값(v9)을 테스트 안에 따로: 문제 1~3 / 4~6 / 7~10 */
const STAGE_MS: Record<Difficulty, [number, number, number]> = {
  easy: [8500, 7000, 6000],
  normal: [6500, 5500, 4500],
  hard: [5000, 4000, 3500],
  veryhard: [4500, 3500, 3000],
};
function expectedFall(q: Question, d: Difficulty, stageIdx: number): number {
  return Math.max(STAGE_MS[d][stageIdx]!, expectedFloor(wordCount(q.clue), q.band, d));
}
/** 문항이 나올 수 있는 난이도(spec 12.1 v9 ④): 3~4·5~6 문항 E/N/H, vh 문항 N/H/VH */
const diffsFor = (q: Question): Difficulty[] => (q.band === 'vh' ? ['normal', 'hard', 'veryhard'] : ['easy', 'normal', 'hard']);
const ALL_Q: Question[] = [...qs, ...vhq];

describe('difficulty (spec 5.3·5.5 v2·v4·v9)', () => {
  it('① 네 난이도의 단계 값·카드 수·같은 주제 수·upCount·upFrom·배율·오답 감점이 5.3.2 표(v9)와 같다', () => {
    const table: Record<Difficulty, { stages: [number, number, number][]; mult: number; pen: number; upCount: number; upFrom: number | null }> = {
      easy: { stages: [[3, 8500, 0], [4, 7000, 1], [4, 6000, 2]], mult: 1.0, pen: 10, upCount: 0, upFrom: null },
      normal: { stages: [[3, 6500, 1], [4, 5500, 2], [4, 4500, 2]], mult: 1.2, pen: 20, upCount: 2, upFrom: 7 },
      hard: { stages: [[4, 5000, 2], [4, 4000, 2], [4, 3500, 3]], mult: 1.5, pen: 30, upCount: 4, upFrom: 4 },
      veryhard: { stages: [[4, 4500, 3], [4, 3500, 3], [4, 3000, 3]], mult: 2.0, pen: 40, upCount: 4, upFrom: 4 },
    };
    for (const d of DIFFS) {
      const cfg = GAME.DIFFICULTIES[d];
      expect(cfg.scoreMultiplier).toBe(table[d].mult);
      expect(cfg.wrongPenalty).toBe(table[d].pen);
      expect(cfg.upCount).toBe(table[d].upCount);
      expect(cfg.upFrom).toBe(table[d].upFrom);
      expect(cfg.stages.map((s) => [s.fromQuestion, s.cards, s.fallMs, s.sameTopicDistractors])).toEqual(
        table[d].stages.map((s, i) => [STAGE_START[i], ...s]),
      );
    }
    expect(GAME.DEFAULT_DIFFICULTY).toBe('normal');
    // 몸·기계 몫은 그대로(spec 5.3.3), 물리적 하한 상수(spec 5.3.4)
    const f = GAME.FALL_FLOOR;
    expect([f.BASE_MS, f.MOVE_MS, f.GRAB_MS, f.COMFORT_P, f.PHYS_MIN_MS, f.P_VISIBLE]).toEqual([300, 1000, 400, 0.85, 1850, 0.06]);
  });

  it('② WORD_MS[난이도][band]가 5.3.3 표와 같고, 바닥이 낱말 3~10 × 모든 (난이도, band) 칸에서 식·표 값과 같다', () => {
    for (const d of DIFFS) for (const band of ['3-4', '5-6', 'vh'] as Band[]) expect(GAME.FALL_FLOOR.WORD_MS[d][band]).toBe(WORD[d][band]);
    // spec 5.3.3 바닥 표(초) — 읽기 계수 행
    const rows: Record<number, number[]> = {
      350: [3.24, 3.65, 4.06, 4.48, 4.89, 5.3, 5.71, 6.12],
      300: [3.06, 3.42, 3.77, 4.12, 4.48, 4.83, 5.18, 5.53],
      250: [2.89, 3.18, 3.48, 3.77, 4.06, 4.36, 4.65, 4.95],
      200: [2.71, 2.95, 3.18, 3.42, 3.65, 3.89, 4.12, 4.36],
    };
    for (const d of DIFFS) {
      for (const band of ['3-4', '5-6', 'vh'] as Band[]) {
        const row = rows[WORD[d][band]]!;
        for (let n = 3; n <= 10; n++) {
          expect(timeNeededMs(n, band, d)).toBe(needMs(n, band, d));
          expect(floorMs(n, band, d), `${d} ${band} ${n}`).toBe(expectedFloor(n, band, d));
          expect(floorMs(n, band, d), `${d} ${band} ${n} 표`).toBe(Math.round(row[n - 3]! * 1000));
        }
      }
    }
  });

  it('③ Easy 그대로: questions.json 230문항 × 3단계 fallMsFor(…, easy) = 8500/7000/6000', () => {
    expect(qs.length).toBe(230);
    STAGE_START.forEach((from, i) => {
      const st = stageFor(from, 'easy');
      for (const q of qs) expect(fallMsFor(q, st, 'easy')).toBe([8500, 7000, 6000][i]);
    });
    // spec 18.9 ⑥: 난이도 인자가 없으면 타입 오류(모든 호출처가 난이도를 넘긴다) — 실행해도 쓸 수 있는 값이 나오지 않는다
    // @ts-expect-error — v9: fallMsFor(answer, stage, difficulty)
    expect(() => fallMsFor(qs[0]!, stageFor(1, 'easy'))).toThrow();
  });

  it('④ 보장: 부록 A 230 · Very Hard 119 문항 × 나올 수 있는 난이도 × 3단계 — fall ≥ 단계 값, ≥ 바닥, 0.85·fall ≥ T_need(d)', () => {
    expect(vhq.length).toBe(119);
    expect(vhq.every((q) => q.band === 'vh')).toBe(true);
    let checked = 0;
    for (const q of ALL_Q) {
      const n = wordCount(q.clue);
      for (const d of diffsFor(q)) {
        STAGE_START.forEach((from, i) => {
          const st = stageFor(from, d);
          const f = fallMsFor(q, st, d);
          expect(f).toBe(expectedFall(q, d, i));
          expect(f).toBeGreaterThanOrEqual(STAGE_MS[d][i]!);
          expect(f).toBeGreaterThanOrEqual(expectedFloor(n, q.band, d));
          expect(0.85 * f).toBeGreaterThanOrEqual(needMs(n, q.band, d));
          checked += 1;
        });
      }
    }
    expect(checked).toBe((230 + 119) * 3 * 3);
  });

  it('⑤ 물리적 하한: 같은 범위에서 (0.85 − 0.06) × fall ≥ 1850ms, 난이도별 최솟값 Easy 6000·Normal 4500·Hard 3500·Very Hard 3000ms', () => {
    const minOf: Record<Difficulty, number> = { easy: Infinity, normal: Infinity, hard: Infinity, veryhard: Infinity };
    for (const q of ALL_Q) {
      for (const d of diffsFor(q)) {
        for (const from of STAGE_START) {
          const f = fallMsFor(q, stageFor(from, d), d);
          expect((0.85 - 0.06) * f, `${q.id} ${d} ${from}`).toBeGreaterThanOrEqual(1850);
          minOf[d] = Math.min(minOf[d], f);
        }
      }
    }
    expect(minOf).toEqual({ easy: 6000, normal: 4500, hard: 3500, veryhard: 3000 });
    // 가장 짧은 단계 값에서 그 창(spec 5.3.4): Normal 3.56초, Hard 2.77초, Very Hard 2.37초
    expect([4500, 3500, 3000].map((f) => Number((((0.85 - 0.06) * f) / 1000).toFixed(2)))).toEqual([3.56, 2.77, 2.37]);
  });

  it('⑥ 바닥 때문에 늘어나는 문항 수 / 평균 / 가장 김이 5.3.3의 v9 표와 같다', () => {
    const pools: Record<string, Question[]> = {
      '3-4': qs.filter((q) => q.band === '3-4'),
      '5-6': qs.filter((q) => q.band === '5-6'),
      mid: vhMid,
      vh: vhq,
    };
    expect([pools['3-4']!.length, pools['5-6']!.length, vhMid.length, vhq.length]).toEqual([143, 87, 71, 119]);
    /** [늘어난 수, 평균(초, 소수 둘째 자리), 가장 김(초)] — 테스트 식(expectedFall)으로 따로 셈 */
    const stat = (d: Difficulty, pool: string, stageIdx: number): [number, number, number] => {
      const f = pools[pool]!.map((q) => expectedFall(q, d, stageIdx));
      const ext = f.filter((x) => x > STAGE_MS[d][stageIdx]!).length;
      const avg = f.reduce((a, b) => a + b, 0) / f.length;
      return [ext, Number((avg / 1000).toFixed(2)), Math.max(...f) / 1000];
    };
    const count = (d: Difficulty, pool: string, i: number): number => stat(d, pool, i)[0];
    // Easy: 모든 문항 0
    for (const i of [0, 1, 2]) for (const p of ['3-4', '5-6']) expect(count('easy', p, i)).toBe(0);
    // Normal
    expect([0, 1].map((i) => count('normal', '3-4', i))).toEqual([0, 0]);
    expect(stat('normal', '3-4', 2)).toEqual([91, 4.88, 5.3]);
    expect(count('normal', '5-6', 0)).toBe(0);
    expect(stat('normal', '5-6', 1)).toEqual([13, 5.5, 5.53]);
    expect(stat('normal', '5-6', 2)).toEqual([46, 4.84, 5.53]);
    expect(stat('normal', 'mid', 2)).toEqual([29, 4.61, 4.95]);
    // Hard
    expect(count('hard', '3-4', 0)).toBe(0);
    expect(stat('hard', '3-4', 1)).toEqual([121, 4.45, 4.83]);
    expect(stat('hard', '3-4', 2)).toEqual([138, 4.4, 4.83]);
    expect(count('hard', '5-6', 0)).toBe(0);
    expect(stat('hard', '5-6', 1)).toEqual([65, 4.34, 4.95]);
    expect(stat('hard', '5-6', 2)).toEqual([76, 4.25, 4.95]);
    expect(stat('hard', 'mid', 1)).toEqual([29, 4.09, 4.36]);
    expect(stat('hard', 'mid', 2)).toEqual([60, 3.92, 4.36]);
    // Very Hard
    expect(count('veryhard', 'vh', 0)).toBe(0);
    expect(stat('veryhard', 'vh', 1)).toEqual([104, 3.95, 4.36]);
    expect(stat('veryhard', 'vh', 2)).toEqual([118, 3.93, 4.36]);
  });

  it('화면 5종에서 p = 0.85일 때 카드 중심이 화면 안이고 H의 88~93%', () => {
    for (const [W, H] of [[1024, 768], [1180, 820], [1280, 800], [768, 1024], [820, 1180]] as const) {
      for (const n of [3, 4]) {
        const r = cardRect({ lane: 0, xFrac: 0.2 }, 0.85, { W, H }, n);
        const cy = r.y + r.h / 2;
        expect(cy).toBeLessThanOrEqual(H);
        expect(cy / H).toBeGreaterThanOrEqual(0.88);
        expect(cy / H).toBeLessThanOrEqual(0.93);
        // 카드가 잡히기 시작하는 진행도(중심이 띠 아래) ≈ 0.05~0.06
        const m = cardMetrics({ W, H }, n);
        const pStart = (m.cardH / 2) / (m.playH + m.cardH);
        expect(pStart).toBeGreaterThan(0.04);
        expect(pStart).toBeLessThan(0.07);
      }
    }
  });

  it('이상한 난이도 이름 → normal', () => {
    expect(parseDifficulty('hard')).toBe('hard');
    expect(parseDifficulty('easy')).toBe('easy');
    expect(parseDifficulty('veryhard')).toBe('veryhard');
    for (const v of ['HARD', 'extreme', '', null, undefined, 3, {}]) expect(parseDifficulty(v)).toBe('normal');
  });

  it('점수 배율: round(배율 × (기본 + 빠르기 + 콤보)) (spec 5.5)', () => {
    // 테스트 안에서 따로: 기본 100/50, 빠르기 round(50(1−p)), 콤보 3개째부터 +20
    const calc = (first: boolean, p: number, combo: number, m: number): number =>
      Math.round(m * ((first ? 100 : 50) + Math.round(50 * (1 - p)) + (combo >= 3 ? 20 : 0)));
    for (const m of [1.0, 1.2, 1.5, 2.0]) {
      for (const p of [0, 0.07, 0.3, 0.33, 0.5, 0.77, 0.99, 1]) {
        for (const combo of [1, 2, 3, 7]) {
          for (const first of [true, false]) {
            expect(correctScore(first, p, combo, m).total).toBe(calc(first, p, combo, m));
          }
        }
      }
    }
    expect(correctScore(true, 0.28, 3, 1.2).total).toBe(Math.round(1.2 * (100 + 36 + 20)));
    expect(correctScore(true, 0, 1, 1.5).total).toBe(225);
  });

  it('오답 감점: 0 아래로 내려가지 않고, 실제로 깎인 양을 돌려준다', () => {
    expect(applyPenalty(0, 20)).toEqual({ score: 0, deducted: 0 });
    expect(applyPenalty(15, 20)).toEqual({ score: 0, deducted: 15 });
    expect(applyPenalty(100, 30)).toEqual({ score: 70, deducted: 30 });
    expect(applyPenalty(10, 10)).toEqual({ score: 0, deducted: 10 });
    expect(applyPenalty(25, 40)).toEqual({ score: 0, deducted: 25 });
    expect(applyPenalty(300, 40)).toEqual({ score: 260, deducted: 40 });
  });
});
