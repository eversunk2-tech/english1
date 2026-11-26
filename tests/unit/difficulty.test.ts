import { describe, expect, it } from 'vitest';
import questionsJson from '../../src/data/questions.json';
import { GAME, type Difficulty } from '../../src/config.ts';
import { fallMsFor, floorMs, parseDifficulty, stageFor, timeNeededMs } from '../../src/game/difficulty.ts';
import { cardMetrics, cardRect } from '../../src/game/layout.ts';
import { applyPenalty, correctScore } from '../../src/game/scoring.ts';
import type { Band, QuestionsFile } from '../../src/game/types.ts';

const qs = (questionsJson as QuestionsFile).questions;
const DIFFS: Difficulty[] = ['easy', 'normal', 'hard'];
const STAGE_START = [1, 4, 7];

/** spec 7.4 토큰 규칙을 테스트 안에서 따로: 소문자 → [a-z]+('[a-z]+)? → 끝 's 떼기 */
function wordCount(clue: string): number {
  return (clue.toLowerCase().match(/[a-z]+('[a-z]+)?/g) ?? []).length;
}

/** spec 5.3.3 식을 테스트 안에서 따로 계산 */
function needMs(n: number, band: Band): number {
  return 300 + n * (band === '3-4' ? 400 : 350) + 1000 + 400;
}
function expectedFloor(n: number, band: Band): number {
  return Math.ceil((needMs(n, band) * 100) / 85 / 10) * 10;
}

describe('difficulty (spec 5.3·5.5 v2)', () => {
  it('① 세 난이도의 단계 값·카드 수·같은 주제 수·배율·오답 감점이 5.3.2 표와 같다', () => {
    const table: Record<Difficulty, { stages: [number, number, number][]; mult: number; pen: number }> = {
      easy: { stages: [[3, 9000, 0], [4, 7500, 1], [4, 6500, 2]], mult: 1.0, pen: 10 },
      normal: { stages: [[3, 7500, 1], [4, 6500, 1], [4, 5500, 2]], mult: 1.2, pen: 20 },
      hard: { stages: [[4, 6000, 1], [4, 5000, 2], [4, 4500, 2]], mult: 1.5, pen: 30 },
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

  it('② 바닥 식: 낱말 3~10 × 학년군 2종이 5.3.3 표 값과 같다', () => {
    const spec34 = [3.42, 3.89, 4.36, 4.83, 5.3, 5.77, 6.24, 6.71];
    const spec56 = [3.24, 3.65, 4.06, 4.48, 4.89, 5.3, 5.71, 6.12];
    for (let n = 3; n <= 10; n++) {
      expect(floorMs(n, '3-4')).toBe(expectedFloor(n, '3-4'));
      expect(floorMs(n, '5-6')).toBe(expectedFloor(n, '5-6'));
      expect(floorMs(n, '3-4')).toBe(Math.round(spec34[n - 3]! * 1000));
      expect(floorMs(n, '5-6')).toBe(Math.round(spec56[n - 3]! * 1000));
      expect(timeNeededMs(n, '3-4')).toBe(needMs(n, '3-4'));
    }
  });

  it('③ Hard 보장: 230문항 × 3난이도 × 3단계 — fall ≥ 단계 값, ≥ 바닥, 0.85·fall ≥ T_need, Hard 최소 ≥ 4500ms', () => {
    let hardMin = Infinity;
    for (const d of DIFFS) {
      for (const from of STAGE_START) {
        const st = stageFor(from, d);
        for (const q of qs) {
          const n = wordCount(q.clue);
          const f = fallMsFor(q, st);
          expect(f).toBeGreaterThanOrEqual(st.fallMs);
          expect(f).toBeGreaterThanOrEqual(expectedFloor(n, q.band));
          expect(f).toBe(Math.max(st.fallMs, expectedFloor(n, q.band)));
          expect(0.85 * f).toBeGreaterThanOrEqual(needMs(n, q.band));
          if (d === 'hard') hardMin = Math.min(hardMin, f);
        }
      }
    }
    expect(hardMin).toBeGreaterThanOrEqual(4500);
  });

  it('④ Easy는 230문항 모두 fallMsFor = 단계 값(v1과 같음)', () => {
    for (const from of STAGE_START) {
      const st = stageFor(from, 'easy');
      for (const q of qs) expect(fallMsFor(q, st)).toBe(st.fallMs);
    }
  });

  it('바닥 때문에 늘어나는 문항 수가 5.3.3의 Plan 계산과 같다', () => {
    const count = (d: Difficulty, from: number, band: Band): number =>
      qs.filter((q) => q.band === band && fallMsFor(q, stageFor(from, d)) > stageFor(from, d).fallMs).length;
    // v3 부록 A 230문항 기준 Plan 계산(spec 5.3.3): Normal 7~10번 47/143·28/87, Hard 0/91/121(3~4)·12/46/65(5~6)
    expect([1, 4, 7].map((f) => count('normal', f, '3-4'))).toEqual([0, 0, 47]);
    expect([1, 4, 7].map((f) => count('normal', f, '5-6'))).toEqual([0, 0, 28]);
    expect([1, 4, 7].map((f) => count('hard', f, '3-4'))).toEqual([0, 91, 121]);
    expect([1, 4, 7].map((f) => count('hard', f, '5-6'))).toEqual([12, 46, 65]);
    const hard710 = qs.map((q) => fallMsFor(q, stageFor(7, 'hard')));
    expect(Math.max(...hard710)).toBe(6120);
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
    for (const v of ['HARD', 'extreme', '', null, undefined, 3, {}]) expect(parseDifficulty(v)).toBe('normal');
  });

  it('점수 배율: round(배율 × (기본 + 빠르기 + 콤보)) (spec 5.5)', () => {
    // 테스트 안에서 따로: 기본 100/50, 빠르기 round(50(1−p)), 콤보 3개째부터 +20
    const calc = (first: boolean, p: number, combo: number, m: number): number =>
      Math.round(m * ((first ? 100 : 50) + Math.round(50 * (1 - p)) + (combo >= 3 ? 20 : 0)));
    for (const m of [1.0, 1.2, 1.5]) {
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
  });
});
