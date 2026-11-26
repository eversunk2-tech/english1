import { describe, expect, it } from 'vitest';
import questionsJson from '../../src/data/questions.json';
import veryhardJson from '../../src/data/veryhard.json';
import { clueMentions } from '../../src/data/words.ts';
import { avoidIndex, buildGamePlans, buildPlans, stageFor } from '../../src/game/questions.ts';
import { bagPool, bagsFor, drawAnswers, emptyBag } from '../../src/game/bag.ts';
import { mulberry32, type Rng } from '../../src/game/rng.ts';
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

/** v8: 정답은 빈 더미에서 뽑아 넘긴다(spec 5.6.1 — 게임과 같은 순서로 같은 rng를 이어서 씀) */
function answersFor(band: BandChoice, d: Difficulty, rng: Rng) {
  const pools = { main: all, veryhard: vh };
  return drawAnswers(bagsFor(band, d).map((name) => ({ name, pool: bagPool(name, pools), state: emptyBag() })), 10, rng).answers;
}
function plansOf(band: BandChoice, d: Difficulty, seed: number) {
  const rng = mulberry32(seed);
  return buildPlans(all, band, d, rng, answersFor(band, d, rng));
}
function gamePlansOf(band: BandChoice, d: Difficulty, seed: number) {
  const rng = mulberry32(seed);
  return buildGamePlans({ main: all, veryhard: vh }, band, d, rng, answersFor(band, d, rng));
}

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
        const plans = plansOf(band, d, seed);
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
        const plans = gamePlansOf(band, 'veryhard', seed);
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
    const a = gamePlansOf('3-4', 'veryhard', 5).map((p) => p.options.map((o) => o.word).join());
    const b = gamePlansOf('5-6', 'veryhard', 5).map((p) => p.options.map((o) => o.word).join());
    expect(a).toEqual(b);
    // 다른 난이도는 부록 A 풀만
    const hp = gamePlansOf('5-6', 'hard', 5);
    for (const p of hp) for (const o of p.options) expect(vhWords.has(o.word)).toBe(false);
  });

  it('오답의 주제는 가능한 한 서로 다르다(같은 주제 0개 단계)', () => {
    const plans = plansOf('all', 'easy', 5);
    for (const p of plans.slice(0, 3)) {
      const topics = p.options.filter((o) => o !== p.answer).map((o) => o.topic);
      expect(new Set(topics).size).toBe(topics.length);
    }
  });

  it('같은 씨앗 = 같은 판', () => {
    const a = plansOf('all', 'hard', 99).map((p) => p.options.map((o) => o.word).join(','));
    const b = plansOf('all', 'hard', 99).map((p) => p.options.map((o) => o.word).join(','));
    expect(a).toEqual(b);
  });

  it('넘겨받은 정답 순서대로 문제를 만든다(v8 — 정답 고르기는 bag.test.ts)', () => {
    const pick = all.filter((q) => q.band === '5-6').slice(0, 10);
    const plans = buildPlans(all, '5-6', 'normal', mulberry32(3), pick);
    expect(plans.map((p) => p.answer.id)).toEqual(pick.map((q) => q.id));
  });
});
