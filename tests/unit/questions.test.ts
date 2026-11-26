import { describe, expect, it } from 'vitest';
import questionsJson from '../../src/data/questions.json';
import veryhardJson from '../../src/data/veryhard.json';
import { clueMentions } from '../../src/data/words.ts';
import { avoidIndex, buildGamePlans, buildPlans, pickAnswers, stageFor, updateRecent } from '../../src/game/questions.ts';
import { mulberry32 } from '../../src/game/rng.ts';
import type { BandChoice, QuestionsFile } from '../../src/game/types.ts';
import type { Difficulty } from '../../src/config.ts';

const all = (questionsJson as QuestionsFile).questions;
const avoid = avoidIndex(all);

/** spec 5.3.2 표를 테스트 안에 따로 적는다: 문제 번호 1~10 → [카드 수, 단계 값 ms, 같은 주제 오답 수] */
const TABLE: Record<Difficulty, [number, number, number][]> = {
  easy: [[3, 8500, 0], [3, 8500, 0], [3, 8500, 0], [4, 7000, 1], [4, 7000, 1], [4, 7000, 1], [4, 6000, 2], [4, 6000, 2], [4, 6000, 2], [4, 6000, 2]],
  normal: [[3, 7000, 1], [3, 7000, 1], [3, 7000, 1], [4, 6000, 1], [4, 6000, 1], [4, 6000, 1], [4, 5000, 2], [4, 5000, 2], [4, 5000, 2], [4, 5000, 2]],
  hard: [[4, 5500, 1], [4, 5500, 1], [4, 5500, 1], [4, 4500, 2], [4, 4500, 2], [4, 4500, 2], [4, 4000, 2], [4, 4000, 2], [4, 4000, 2], [4, 4000, 2]],
  veryhard: [[4, 5000, 2], [4, 5000, 2], [4, 5000, 2], [4, 4000, 3], [4, 4000, 3], [4, 4000, 3], [4, 3500, 3], [4, 3500, 3], [4, 3500, 3], [4, 3500, 3]],
};
const DIFFS: Difficulty[] = ['easy', 'normal', 'hard'];
const vh = (veryhardJson as QuestionsFile).questions;
const vhAvoid = avoidIndex(vh);

describe('questions (spec 5.6)', () => {
  it('난이도별 문제 번호마다 단계(spec 5.3.2 표, v4)', () => {
    for (const d of [...DIFFS, 'veryhard'] as Difficulty[]) {
      for (let n = 1; n <= 10; n++) {
        const st = stageFor(n, d);
        expect([st.cards, st.fallMs, st.sameTopicDistractors], `${d} ${n}`).toEqual(TABLE[d][n - 1]);
      }
    }
  });

  for (const d of DIFFS)
  for (const band of ['3-4', '5-6', 'all'] as BandChoice[]) {
    it(`${d} · 학년군 ${band}: 씨앗 150개 — 카드 수·같은 주제 오답 수가 5.3.2대로, 10문제 중복 없음, 학년군 필터, avoid(양방향)·설명 속 단어 없음`, () => {
      for (let seed = 1; seed <= 150; seed++) {
        const plans = buildPlans(all, band, d, mulberry32(seed));
        expect(plans.length).toBe(10);
        const answers = plans.map((p) => p.answer.word);
        expect(new Set(answers).size).toBe(10);
        plans.forEach((p, i) => {
          const [cards, , sameTopic] = TABLE[d][i]!;
          expect(p.options.length).toBe(cards);
          expect(p.delaysMs.slice().sort((a, b) => a - b)).toEqual([0, 600, 1200, 1800].slice(0, cards));
          if (band !== 'all') expect(p.answer.band).toBe(band);
          const words = p.options.map((o) => o.word);
          expect(new Set(words).size).toBe(words.length);
          expect(words.filter((w) => w === p.answer.word).length).toBe(1);
          const ds = p.options.filter((o) => o.word !== p.answer.word);
          for (const d of ds) {
            if (band === '3-4') expect(d.band).toBe('3-4');
            expect(avoid.get(p.answer.word)?.has(d.word) ?? false).toBe(false);
            expect(p.answer.avoid.includes(d.word)).toBe(false);
            expect(d.avoid.includes(p.answer.word)).toBe(false);
            expect(clueMentions(p.answer.clue, d.word)).toBe(false);
          }
          // 같은 주제 오답 수: 후보가 충분하면 정확히 stage 값
          const sameAvail = all.filter(
            (q) =>
              q.topic === p.answer.topic &&
              q.word !== p.answer.word &&
              (band !== '3-4' || q.band === '3-4') &&
              !(avoid.get(p.answer.word)?.has(q.word) ?? false) &&
              !clueMentions(p.answer.clue, q.word),
          ).length;
          const same = ds.filter((d) => d.topic === p.answer.topic).length;
          expect(same).toBe(Math.min(sameTopic, sameAvail));
        });
      }
    });
  }

  it('Very Hard: 학년 선택과 상관없이 Very Hard 풀에서만 정답·오답, 카드 4장, 같은 주제 오답 2/3/3(후보가 모자라면 다른 주제로), avoid·설명 속 단어 없음', () => {
    const vhWords = new Set(vh.map((q) => q.word));
    for (const band of ['3-4', '5-6', 'all'] as BandChoice[]) {
      for (let seed = 1; seed <= 150; seed++) {
        const plans = buildGamePlans({ main: all, veryhard: vh }, band, 'veryhard', mulberry32(seed));
        expect(plans.length).toBe(10);
        expect(new Set(plans.map((p) => p.answer.word)).size).toBe(10);
        plans.forEach((p, i) => {
          const [cards, , sameTopic] = TABLE.veryhard[i]!;
          expect(p.options.length).toBe(cards);
          for (const o of p.options) {
            expect(vhWords.has(o.word), o.word).toBe(true);
            expect(o.band).toBe('vh');
          }
          const ds = p.options.filter((o) => o.word !== p.answer.word);
          for (const d of ds) {
            expect(vhAvoid.get(p.answer.word)?.has(d.word) ?? false).toBe(false);
            expect(clueMentions(p.answer.clue, d.word)).toBe(false);
          }
          const sameAvail = vh.filter(
            (q) =>
              q.topic === p.answer.topic &&
              q.word !== p.answer.word &&
              !(vhAvoid.get(p.answer.word)?.has(q.word) ?? false) &&
              !clueMentions(p.answer.clue, q.word),
          ).length;
          expect(ds.filter((d) => d.topic === p.answer.topic).length).toBe(Math.min(sameTopic, sameAvail));
        });
      }
    }
    // 학년 선택은 Very Hard 판 구성에 영향이 없다
    const a = buildGamePlans({ main: all, veryhard: vh }, '3-4', 'veryhard', mulberry32(5)).map((p) => p.options.map((o) => o.word).join());
    const b = buildGamePlans({ main: all, veryhard: vh }, '5-6', 'veryhard', mulberry32(5)).map((p) => p.options.map((o) => o.word).join());
    expect(a).toEqual(b);
    // 다른 난이도는 부록 A 풀만
    const hp = buildGamePlans({ main: all, veryhard: vh }, '5-6', 'hard', mulberry32(5));
    for (const p of hp) for (const o of p.options) expect(vhWords.has(o.word)).toBe(false);
  });

  it('Very Hard 최근 단어 피하기', () => {
    const recent = vh.slice(0, 20).map((q) => q.word);
    for (let s = 0; s < 30; s++) {
      const plans = buildGamePlans({ main: all, veryhard: vh }, 'all', 'veryhard', mulberry32(s), recent);
      expect(plans.some((p) => recent.includes(p.answer.word))).toBe(false);
    }
  });

  it('오답의 주제는 가능한 한 서로 다르다(같은 주제 0개 단계)', () => {
    const plans = buildPlans(all, 'all', 'easy', mulberry32(5));
    for (const p of plans.slice(0, 3)) {
      const topics = p.options.filter((o) => o !== p.answer).map((o) => o.topic);
      expect(new Set(topics).size).toBe(topics.length);
    }
  });

  it('같은 씨앗 = 같은 판', () => {
    const a = buildPlans(all, 'all', 'hard', mulberry32(99)).map((p) => p.options.map((o) => o.word).join(','));
    const b = buildPlans(all, 'all', 'hard', mulberry32(99)).map((p) => p.options.map((o) => o.word).join(','));
    expect(a).toEqual(b);
  });

  it('최근 단어 피하기(풀이 충분할 때), 모자라면 채운다', () => {
    const pool = all.filter((q) => q.band === '3-4');
    const recent = pool.slice(0, 20).map((q) => q.word);
    for (let s = 0; s < 50; s++) {
      const ans = pickAnswers(pool, 10, mulberry32(s), recent);
      expect(ans.some((q) => recent.includes(q.word))).toBe(false);
    }
    const small = pool.slice(0, 12);
    const ans = pickAnswers(small, 10, mulberry32(1), small.slice(0, 5).map((q) => q.word));
    expect(ans.length).toBe(10);
    expect(new Set(ans.map((q) => q.word)).size).toBe(10);
  });

  it('최근 목록은 이번 판을 앞에, 최대 20개', () => {
    const r = updateRecent(['a', 'b'], ['c', 'd', 'a']);
    expect(r).toEqual(['c', 'd', 'a', 'b']);
    const many = updateRecent(Array.from({ length: 20 }, (_, i) => `x${i}`), Array.from({ length: 10 }, (_, i) => `y${i}`));
    expect(many.length).toBe(20);
    expect(many[0]).toBe('y0');
  });
});
