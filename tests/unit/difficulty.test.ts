import { describe, expect, it } from 'vitest';
import questionsJson from '../../src/data/questions.json';
import veryhardJson from '../../src/data/veryhard.json';
import { GAME, type Difficulty } from '../../src/config.ts';
import { fallMsFor, floorMs, parseDifficulty, stageFor, timeNeededMs } from '../../src/game/difficulty.ts';
import { cardMetrics, cardRect } from '../../src/game/layout.ts';
import { applyPenalty, correctScore } from '../../src/game/scoring.ts';
import type { Band, QuestionsFile } from '../../src/game/types.ts';

const qs = (questionsJson as QuestionsFile).questions;
const vhq = (veryhardJson as QuestionsFile).questions;
const DIFFS: Difficulty[] = ['easy', 'normal', 'hard', 'veryhard'];
/** 난이도마다 쓰는 풀(spec 5.3.1 v4: Very Hard는 Very Hard 풀만) */
const poolOf = (d: Difficulty) => (d === 'veryhard' ? vhq : qs);
const STAGE_START = [1, 4, 7];

/** spec 7.4 토큰 규칙을 테스트 안에서 따로: 소문자 → [a-z]+('[a-z]+)? → 끝 's 떼기 */
function wordCount(clue: string): number {
  return (clue.toLowerCase().match(/[a-z]+('[a-z]+)?/g) ?? []).length;
}

/** spec 5.3.3 식을 테스트 안에서 따로 계산(v4 읽기 계수: 3~4 0.35, 5~6 0.30, Very Hard 0.25초) */
function needMs(n: number, band: Band): number {
  return 300 + n * (band === '3-4' ? 350 : band === '5-6' ? 300 : 250) + 1000 + 400;
}
function expectedFloor(n: number, band: Band): number {
  return Math.ceil((needMs(n, band) * 100) / 85 / 10) * 10;
}

describe('difficulty (spec 5.3·5.5 v2·v4)', () => {
  it('① 네 난이도의 단계 값·카드 수·같은 주제 수·배율·오답 감점이 5.3.2 표(v4)와 같다', () => {
    const table: Record<Difficulty, { stages: [number, number, number][]; mult: number; pen: number }> = {
      easy: { stages: [[3, 8500, 0], [4, 7000, 1], [4, 6000, 2]], mult: 1.0, pen: 10 },
      normal: { stages: [[3, 7000, 1], [4, 6000, 1], [4, 5000, 2]], mult: 1.2, pen: 20 },
      hard: { stages: [[4, 5500, 1], [4, 4500, 2], [4, 4000, 2]], mult: 1.5, pen: 30 },
      veryhard: { stages: [[4, 5000, 2], [4, 4000, 3], [4, 3500, 3]], mult: 2.0, pen: 40 },
    };
    for (const d of DIFFS) {
      const cfg = GAME.DIFFICULTIES[d];
      expect(cfg.scoreMultiplier).toBe(table[d].mult);
      expect(cfg.wrongPenalty).toBe(table[d].pen);
      expect(cfg.stages.map((s) => [s.fromQuestion, s.cards, s.fallMs, s.sameTopicDistractors])).toEqual(
        table[d].stages.map((s, i) => [STAGE_START[i], ...s]),
      );
    }
    expect(GAME.DEFAULT_DIFFICULTY).toBe('normal');
  });

  it('② 바닥 식: 낱말 3~10 × 문항 band 3종이 5.3.3 표 값(v4)과 같다', () => {
    const spec34 = [3.24, 3.65, 4.06, 4.48, 4.89, 5.3, 5.71, 6.12];
    const spec56 = [3.06, 3.42, 3.77, 4.12, 4.48, 4.83, 5.18, 5.53];
    const specVh = [2.89, 3.18, 3.48, 3.77, 4.06, 4.36, 4.65, 4.95];
    for (let n = 3; n <= 10; n++) {
      for (const [band, row] of [['3-4', spec34], ['5-6', spec56], ['vh', specVh]] as [Band, number[]][]) {
        expect(floorMs(n, band)).toBe(expectedFloor(n, band));
        expect(floorMs(n, band), `${band} ${n}`).toBe(Math.round(row[n - 3]! * 1000));
        expect(timeNeededMs(n, band)).toBe(needMs(n, band));
      }
    }
  });

  it('③ 보장: 부록 A 230문항 × E/N/H, Very Hard 94문항 × 3단계 — fall ≥ 단계 값, ≥ 바닥, 0.85·fall ≥ T_need, Hard 최소 ≥ 4000ms, Very Hard ≥ 3500ms', () => {
    let hardMin = Infinity;
    let vhMin = Infinity;
    for (const d of DIFFS) {
      for (const from of STAGE_START) {
        const st = stageFor(from, d);
        for (const q of poolOf(d)) {
          const n = wordCount(q.clue);
          const f = fallMsFor(q, st);
          expect(f).toBeGreaterThanOrEqual(st.fallMs);
          expect(f).toBeGreaterThanOrEqual(expectedFloor(n, q.band));
          expect(f).toBe(Math.max(st.fallMs, expectedFloor(n, q.band)));
          expect(0.85 * f).toBeGreaterThanOrEqual(needMs(n, q.band));
          if (d === 'hard') hardMin = Math.min(hardMin, f);
          if (d === 'veryhard') vhMin = Math.min(vhMin, f);
        }
      }
    }
    expect(hardMin).toBeGreaterThanOrEqual(4000);
    expect(vhMin).toBeGreaterThanOrEqual(3500);
    expect(vhq.every((q) => q.band === 'vh')).toBe(true);
  });

  it('④ Easy는 230문항 모두 fallMsFor = 단계 값(바닥에 걸리는 문항 0)', () => {
    for (const from of STAGE_START) {
      const st = stageFor(from, 'easy');
      for (const q of qs) expect(fallMsFor(q, st)).toBe(st.fallMs);
    }
  });

  it('바닥 때문에 늘어나는 문항 수가 5.3.3의 Plan 계산과 같다', () => {
    const count = (d: Difficulty, from: number, band: Band): number =>
      poolOf(d).filter((q) => q.band === band && fallMsFor(q, stageFor(from, d)) > stageFor(from, d).fallMs).length;
    // v4 Plan 계산(spec 5.3.3): Normal 7~10번 47/143·28/87, Hard 0/91/138(3~4)·13/46/76(5~6), Very Hard 0/81/90(94)
    for (const from of [1, 4, 7]) expect(count('easy', from, '3-4') + count('easy', from, '5-6')).toBe(0);
    expect([1, 4, 7].map((f) => count('normal', f, '3-4'))).toEqual([0, 0, 47]);
    expect([1, 4, 7].map((f) => count('normal', f, '5-6'))).toEqual([0, 0, 28]);
    expect([1, 4, 7].map((f) => count('hard', f, '3-4'))).toEqual([0, 91, 138]);
    expect([1, 4, 7].map((f) => count('hard', f, '5-6'))).toEqual([13, 46, 76]);
    expect([1, 4, 7].map((f) => count('veryhard', f, 'vh'))).toEqual([0, 81, 90]);
    const avg = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
    const hard710 = (band: Band) => qs.filter((q) => q.band === band).map((q) => fallMsFor(q, stageFor(7, 'hard')));
    expect(Math.max(...hard710('3-4'), ...hard710('5-6'))).toBe(5530);
    expect(Number((avg(hard710('3-4')) / 1000).toFixed(2))).toBe(4.81);
    expect(Number((avg(hard710('5-6')) / 1000).toFixed(2))).toBe(4.72);
    const vh710 = vhq.map((q) => fallMsFor(q, stageFor(7, 'veryhard')));
    expect(Math.max(...vh710)).toBe(4950);
    // spec 5.3.3·16.2(v4b 뒤): Very Hard 7~10번 평균 4.38초, 4~6번 4.42초, 1~3번 5.00초
    expect(Number((avg(vh710) / 1000).toFixed(2))).toBe(4.38);
    expect(Number((avg(vhq.map((q) => fallMsFor(q, stageFor(4, 'veryhard')))) / 1000).toFixed(2))).toBe(4.42);
    expect(Number((avg(vhq.map((q) => fallMsFor(q, stageFor(1, 'veryhard')))) / 1000).toFixed(2))).toBe(5.0);
  });

  it('⑤ 화면 5종에서 p = 0.85일 때 카드 중심이 화면 안이고 H의 88~93%', () => {
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

  it('⑥ 이상한 난이도 이름 → normal', () => {
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
