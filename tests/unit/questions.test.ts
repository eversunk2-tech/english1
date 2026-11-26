import { describe, expect, it } from 'vitest';
import questionsJson from '../../src/data/questions.json';
import { clueMentions } from '../../src/data/words.ts';
import { avoidIndex, buildPlans, pickAnswers, stageFor, updateRecent } from '../../src/game/questions.ts';
import { mulberry32 } from '../../src/game/rng.ts';
import type { BandChoice, QuestionsFile } from '../../src/game/types.ts';

const all = (questionsJson as QuestionsFile).questions;
const avoid = avoidIndex(all);

describe('questions (spec 5.6)', () => {
  it('단계(spec 5.3)', () => {
    expect([1, 2, 3].map((n) => stageFor(n).cards)).toEqual([3, 3, 3]);
    expect([4, 5, 6].map((n) => stageFor(n).cards)).toEqual([4, 4, 4]);
    expect([7, 8, 9, 10].map((n) => stageFor(n).cards)).toEqual([4, 4, 4, 4]);
    expect(stageFor(1).fallMs).toBe(9000);
    expect(stageFor(4).fallMs).toBe(7500);
    expect(stageFor(10).fallMs).toBe(6500);
  });

  for (const band of ['3-4', '5-6', 'all'] as BandChoice[]) {
    it(`학년군 ${band}: 씨앗 300개 — 10문제 중복 없음, 학년군 필터, avoid(양방향)·설명 속 단어 없음, 같은 주제 오답 수`, () => {
      for (let seed = 1; seed <= 300; seed++) {
        const plans = buildPlans(all, band, mulberry32(seed));
        expect(plans.length).toBe(10);
        const answers = plans.map((p) => p.answer.word);
        expect(new Set(answers).size).toBe(10);
        plans.forEach((p, i) => {
          const stage = stageFor(i + 1);
          expect(p.options.length).toBe(stage.cards);
          expect(p.delaysMs.slice().sort((a, b) => a - b)).toEqual([0, 600, 1200, 1800].slice(0, stage.cards));
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
          expect(same).toBe(Math.min(stage.sameTopicDistractors, sameAvail));
        });
      }
    });
  }

  it('오답의 주제는 가능한 한 서로 다르다(같은 주제 0개 단계)', () => {
    const plans = buildPlans(all, 'all', mulberry32(5));
    for (const p of plans.slice(0, 3)) {
      const topics = p.options.filter((o) => o !== p.answer).map((o) => o.topic);
      expect(new Set(topics).size).toBe(topics.length);
    }
  });

  it('같은 씨앗 = 같은 판', () => {
    const a = buildPlans(all, 'all', mulberry32(99)).map((p) => p.options.map((o) => o.word).join(','));
    const b = buildPlans(all, 'all', mulberry32(99)).map((p) => p.options.map((o) => o.word).join(','));
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
