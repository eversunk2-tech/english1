import { describe, expect, it } from 'vitest';
import questionsJson from '../../src/data/questions.json';
import veryhardJson from '../../src/data/veryhard.json';
import extraJson from '../../src/data/vocab/clue-extra.json';
import { clueMentions } from '../../src/data/words.ts';
import { avoidIndex, buildGamePlans, buildPlans, pickDistractors, stageFor } from '../../src/game/questions.ts';
import { bagPool, drawGame, drawSpecFor, emptyBag } from '../../src/game/bag.ts';
import { mulberry32 } from '../../src/game/rng.ts';
import type { BandChoice, Question, QuestionsFile } from '../../src/game/types.ts';
import type { Difficulty } from '../../src/config.ts';

const all = (questionsJson as QuestionsFile).questions;
const avoid = avoidIndex(all);

/** spec 5.3.2 표(v9)를 테스트 안에 따로 적는다: 문제 번호 1~10 → [카드 수, 단계 값 ms, 같은 주제 오답 수] */
const row = (a: [number, number, number], b: [number, number, number], c: [number, number, number]): [number, number, number][] => [a, a, a, b, b, b, c, c, c, c];
const TABLE: Record<Difficulty, [number, number, number][]> = {
  easy: row([3, 8500, 0], [4, 7000, 1], [4, 6000, 2]),
  normal: row([3, 6500, 1], [4, 5500, 2], [4, 4500, 2]),
  hard: row([4, 5000, 2], [4, 4000, 2], [4, 3500, 3]),
  veryhard: row([4, 4500, 3], [4, 3500, 3], [4, 3000, 3]),
};
/** 한 단계 위 문제 수·첫 번호(spec 5.3.2) */
const UP: Record<Difficulty, [number, number]> = { easy: [0, 11], normal: [2, 7], hard: [4, 4], veryhard: [4, 4] };
const DIFFS: Difficulty[] = ['easy', 'normal', 'hard'];
const vh = (veryhardJson as QuestionsFile).questions;
const vhAvoid = avoidIndex(vh);
const advanced = (extraJson as { veryhardAdvanced: string[] }).veryhardAdvanced;
const advSet = new Set(advanced);
const POOLS = { main: all, veryhard: vh, advanced };

/** v9: 빈 더미에서 게임과 같은 순서로 뽑아(drawSpecFor → drawGame) 같은 rng로 계획을 만든다(spec 5.6.1 ①-2) */
function freshGamePlansOf(band: BandChoice, d: Difficulty, seed: number) {
  const rng = mulberry32(seed);
  const spec = drawSpecFor(band, d);
  const { answers, levels } = drawGame(spec, (name) => ({ name, pool: bagPool(name, POOLS), state: emptyBag() }), rng);
  return buildGamePlans(POOLS, band, d, rng, answers, levels);
}

/**
 * 같은 (학년군, 난이도, 씨앗)의 판은 이 파일 안에서 한 번만 만든다. 빈 더미 + 같은 씨앗이면 판이 같으므로(아래 "같은 씨앗 = 같은 판"이
 * 캐시 없이 따로 확인) 검사 대상은 그대로이고, 같은 판을 여러 테스트가 되풀이해 만들던 시간만 줄인다(배포 러너 5초 제한 대응).
 * 돌려받은 판은 어느 테스트도 바꾸지 않는다.
 */
const planCache = new Map<string, ReturnType<typeof freshGamePlansOf>>();
function gamePlansOf(band: BandChoice, d: Difficulty, seed: number) {
  const key = `${band}|${d}|${seed}`;
  let plans = planCache.get(key);
  if (!plans) {
    plans = freshGamePlansOf(band, d, seed);
    planCache.set(key, plans);
  }
  return plans;
}

/** spec 5.6 표(v9)를 테스트 안에서 따로: 정답 문항 → 오답 풀 */
const POOL_56 = all.filter((q) => q.band === '5-6');
const POOL_34 = all.filter((q) => q.band === '3-4');
function expectedDistractorPool(answer: Question, band: BandChoice): Question[] {
  if (answer.band === 'vh') return vh;
  if (answer.band === '5-6' && band === '3-4') return POOL_56;
  if (band === '3-4') return POOL_34;
  return all;
}

/**
 * 무거운 테스트의 시간 제한(vitest 기본 5초 대신). 근거: 배포 러너(run 45878021468 attempt 1)에서 같은 테스트가 로컬(맥)보다
 * 최대 약 5.6배 느렸다(예: bag ③ 1.6초 → 7.3초, questions easy·5-6 0.69초 → 3.5초). 이 값을 쓰는 테스트는 로컬 최대 약 1.1초
 * (러너 추정 6~7초)라 30초면 러너 추정의 3배 이상 여유가 있다.
 */
const SLOW_TIMEOUT_MS = 30_000;

describe('questions (spec 5.6)', () => {
  it('난이도별 문제 번호마다 단계(spec 5.3.2 표, v9)', () => {
    for (const d of [...DIFFS, 'veryhard'] as Difficulty[]) {
      for (let n = 1; n <= 10; n++) {
        const st = stageFor(n, d);
        expect([st.cards, st.fallMs, st.sameTopicDistractors], `${d} ${n}`).toEqual(TABLE[d][n - 1]);
      }
    }
  });

  /**
   * 같은 주제 오답 후보 수 — 정답 문항과 오답 풀(학년군으로 정해짐)만의 함수라 (학년군, 정답 id)마다 한 번만 센다.
   * 세는 규칙은 그대로(같은 주제·다른 낱말·avoid 아님·설명에 안 나옴).
   */
  const sameAvailCache = new Map<string, number>();
  function sameAvailOf(answer: Question, band: BandChoice, pool: Question[], av: Map<string, Set<string>>): number {
    const key = `${band}|${answer.id}`;
    let n = sameAvailCache.get(key);
    if (n === undefined) {
      n = pool.filter(
        (q) => q.topic === answer.topic && q.word !== answer.word && !(av.get(answer.word)?.has(q.word) ?? false) && !clueMentions(answer.clue, q.word),
      ).length;
      sameAvailCache.set(key, n);
    }
    return n;
  }

  /** 한 판 검사(spec 5.3.2·5.6·5.6.1 ①-2 v9) */
  function checkPlans(band: BandChoice, d: Difficulty, seed: number): void {
    const plans = gamePlansOf(band, d, seed);
    expect(plans.length).toBe(10);
    expect(new Set(plans.map((p) => p.answer.id)).size).toBe(10);
    const [upCount, upFrom] = UP[d];
    const ups = plans.map((p, i) => (p.level === 'up' ? i + 1 : 0)).filter((x) => x > 0);
    expect(ups.length).toBe(upCount);
    for (const no of ups) expect(no).toBeGreaterThanOrEqual(upFrom);
    plans.forEach((p, i) => {
      const [cards, , sameTopic] = TABLE[d][i]!;
      expect(p.options.length).toBe(cards);
      expect(p.delaysMs.slice().sort((a, b) => a - b)).toEqual([0, 600, 1200, 1800].slice(0, cards));
      // 정답의 수준: Very Hard는 base 중학·up 심화, 그 밖에는 base = 학년군, up = 3-4 → 5-6, 5-6·all → 중학(vh, 심화 아님)
      if (d === 'veryhard') {
        expect(p.answer.band).toBe('vh');
        expect(advSet.has(p.answer.word)).toBe(p.level === 'up');
      } else if (p.level === 'base') {
        if (band !== 'all') expect(p.answer.band).toBe(band);
        else expect(p.answer.band).not.toBe('vh');
      } else {
        expect(p.answer.band).toBe(band === '3-4' ? '5-6' : 'vh');
        expect(advSet.has(p.answer.word)).toBe(false);
      }
      const pool = expectedDistractorPool(p.answer, band);
      const poolWords = new Set(pool.map((q) => q.word));
      const av = p.answer.band === 'vh' ? vhAvoid : avoid;
      const words = p.options.map((o) => o.word);
      expect(new Set(words).size).toBe(words.length);
      expect(words.filter((w) => w === p.answer.word).length).toBe(1);
      const ds = p.options.filter((o) => o.word !== p.answer.word);
      for (const o of ds) {
        expect(poolWords.has(o.word), `${band} ${d} ${p.answer.word}: ${o.word}`).toBe(true);
        expect(av.get(p.answer.word)?.has(o.word) ?? false).toBe(false);
        expect(p.answer.avoid.includes(o.word)).toBe(false);
        expect(o.avoid.includes(p.answer.word)).toBe(false);
        expect(clueMentions(p.answer.clue, o.word)).toBe(false);
      }
      // 같은 주제 오답 수: 후보가 충분하면 정확히 stage 값(모자라면 다른 주제로 채움)
      const sameAvail = sameAvailOf(p.answer, band, pool, av);
      expect(ds.filter((o) => o.topic === p.answer.topic).length).toBe(Math.min(sameTopic, sameAvail));
    });
  }

  for (const d of DIFFS)
  for (const band of ['3-4', '5-6', 'all'] as BandChoice[]) {
    it(`${d} · 학년군 ${band}: 씨앗 150개 — 카드 수·같은 주제 오답 수 5.3.2대로, 한 단계 위 문제 수·자리, 10문제 중복 없음, 오답 풀은 정답 수준(5.6 표), avoid(양방향)·설명 속 단어 없음`, () => {
      for (let seed = 1; seed <= 150; seed++) checkPlans(band, d, seed);
    }, SLOW_TIMEOUT_MS);
  }

  it('Very Hard: 학년 선택과 상관없이 Very Hard 풀에서만 정답·오답, 중학 6 + 심화 4(4~10번), 카드 4장, 같은 주제 오답 3/3/3', () => {
    const vhWords = new Set(vh.map((q) => q.word));
    for (const band of ['3-4', '5-6', 'all'] as BandChoice[]) {
      for (let seed = 1; seed <= 150; seed++) {
        checkPlans(band, 'veryhard', seed);
        for (const p of gamePlansOf(band, 'veryhard', seed)) for (const o of p.options) expect(vhWords.has(o.word), o.word).toBe(true);
      }
    }
    // 학년 선택은 Very Hard 판 구성에 영향이 없다
    const a = gamePlansOf('3-4', 'veryhard', 5).map((p) => p.options.map((o) => o.word).join());
    const b = gamePlansOf('5-6', 'veryhard', 5).map((p) => p.options.map((o) => o.word).join());
    expect(a).toEqual(b);
  }, SLOW_TIMEOUT_MS);

  it('v9 오답 풀(5.6 표): 3~4 Hard의 5~6 정답이면 오답이 모두 5~6 문항, vh 정답이면 모두 Very Hard 풀, Easy는 부록 A만', () => {
    const vhWords = new Set(vh.map((q) => q.word));
    let up56 = 0;
    let upVh = 0;
    for (let seed = 1; seed <= 100; seed++) {
      for (const p of gamePlansOf('3-4', 'hard', seed)) {
        if (p.level !== 'up') continue;
        up56 += 1;
        for (const o of p.options) expect(o.band).toBe('5-6');
      }
      for (const p of gamePlansOf('5-6', 'hard', seed)) {
        for (const o of p.options) expect(o.band === 'vh').toBe(p.level === 'up');
        if (p.level === 'up') upVh += 1;
      }
      for (const band of ['3-4', '5-6', 'all'] as BandChoice[]) {
        for (const p of gamePlansOf(band, 'easy', seed)) for (const o of p.options) expect(vhWords.has(o.word)).toBe(false);
      }
    }
    expect(up56).toBe(400);
    expect(upVh).toBe(400);
  }, SLOW_TIMEOUT_MS);

  it('오답의 주제는 가능한 한 서로 다르다(같은 주제 0개 단계)', () => {
    const plans = gamePlansOf('all', 'easy', 5);
    for (const p of plans.slice(0, 3)) {
      const topics = p.options.filter((o) => o !== p.answer).map((o) => o.topic);
      expect(new Set(topics).size).toBe(topics.length);
    }
  });

  it('같은 씨앗 = 같은 판', () => {
    // 캐시 없이 두 번 따로 만든다
    const a = freshGamePlansOf('all', 'hard', 99).map((p) => [p.level, ...p.options.map((o) => o.word)].join(','));
    const b = freshGamePlansOf('all', 'hard', 99).map((p) => [p.level, ...p.options.map((o) => o.word)].join(','));
    expect(a).toEqual(b);
  });

  it('넘겨받은 정답 순서대로 문제를 만든다(v8 — 정답 고르기는 bag.test.ts)', () => {
    const pick = all.filter((q) => q.band === '5-6').slice(0, 10);
    const plans = buildPlans(all, '5-6', 'normal', mulberry32(3), pick);
    expect(plans.map((p) => p.answer.id)).toEqual(pick.map((q) => q.id));
    expect(plans.every((p) => p.level === 'base')).toBe(true);
    // buildGamePlans도 넘겨받은 순서·수준 그대로
    const levels = pick.map((_, i): 'base' | 'up' => (i >= 6 ? 'up' : 'base'));
    const gp = buildGamePlans(POOLS, '5-6', 'normal', mulberry32(3), pick, levels);
    expect(gp.map((p) => p.level)).toEqual(levels);
  });

  it('Very Hard: chin과 beard는 서로의 오답 카드로 나오지 않는다(avoid 양방향, v10 S1)', () => {
    const byWord = (w: string) => vh.find((q) => q.word === w)!;
    const chin = byWord('chin');
    const beard = byWord('beard');
    expect(chin.avoid).toContain('beard');
    expect(beard.avoid).toContain('chin');
    for (let seed = 1; seed <= 200; seed++) {
      for (const [ans, other] of [[chin, 'beard'], [beard, 'chin']] as const) {
        const d = pickDistractors(ans, vh, 3, 3, mulberry32(seed), vhAvoid);
        expect(d).not.toBeNull();
        expect(d!.map((q) => q.word)).not.toContain(other);
      }
    }
  });
});
