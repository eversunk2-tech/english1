// spec 5.6: 문제마다 오답 카드 고르기와 한 판의 계획. 순수. 정답은 섞은 카드 더미(game/bag.ts, spec 5.6.1 v8·v9)가 뽑아 넘겨준다.
// v9: 오답 풀은 정답 문항의 수준으로 정한다(5.6 표) — 한 단계 위 문제의 오답은 정답과 같은 수준의 풀에서.
import { GAME } from '../config.ts';
import { clueMentions } from '../data/words.ts';
import { fallMsFor, stageFor, type Difficulty } from './difficulty.ts';
import { shuffle, type Rng } from './rng.ts';
import type { BandChoice, Question, QuestionLevel, QuestionPlan } from './types.ts';

export { stageFor };

/** 정답 풀: 학년군에 맞는 문항 */
export function answerPool(all: readonly Question[], band: BandChoice): Question[] {
  return band === 'all' ? all.slice() : all.filter((q) => q.band === band);
}

/** 오답 풀: 3~4 선택이면 3~4 단어만, 5~6·all이면 둘 다 */
export function distractorPool(all: readonly Question[], band: BandChoice): Question[] {
  return band === '3-4' ? all.filter((q) => q.band === '3-4') : all.slice();
}

/** avoid를 양방향으로 본 표: 단어 → 함께 내지 않을 단어들 */
export function avoidIndex(all: readonly Question[]): Map<string, Set<string>> {
  const m = new Map<string, Set<string>>();
  const add = (a: string, b: string): void => {
    let s = m.get(a);
    if (!s) m.set(a, (s = new Set()));
    s.add(b);
  };
  for (const q of all) {
    for (const w of q.avoid) {
      add(q.word, w);
      add(w, q.word);
    }
  }
  return m;
}

/** 정답 answer일 때 오답으로 쓸 수 없는가(정답 자신, avoid 양방향, 설명에 나온 단어) */
export function isExcluded(answer: Question, cand: Question, avoid: Map<string, Set<string>>): boolean {
  if (cand.word === answer.word) return true;
  if (avoid.get(answer.word)?.has(cand.word)) return true;
  if (clueMentions(answer.clue, cand.word)) return true;
  return false;
}

/**
 * 오답 count개 고르기. 같은 주제 sameTopic개(모자라면 다른 주제로 채움), 나머지는 다른 주제에서 가능한 한 서로 다른 주제로.
 * 후보가 count개보다 적으면 null.
 */
export function pickDistractors(
  answer: Question,
  pool: readonly Question[],
  count: number,
  sameTopic: number,
  rng: Rng,
  avoid: Map<string, Set<string>>,
): Question[] | null {
  const cands = pool.filter((q) => !isExcluded(answer, q, avoid));
  // 같은 단어가 두 번 들어가지 않게
  const seen = new Set<string>();
  const unique = cands.filter((q) => (seen.has(q.word) ? false : (seen.add(q.word), true)));
  if (unique.length < count) return null;

  const chosen: Question[] = [];
  const same = shuffle(
    rng,
    unique.filter((q) => q.topic === answer.topic),
  );
  for (const q of same) {
    if (chosen.length >= Math.min(sameTopic, count)) break;
    chosen.push(q);
  }

  // 다른 주제: 주제별로 묶어 한 바퀴씩 돌며 하나씩(서로 다른 주제 우선)
  const others = shuffle(
    rng,
    unique.filter((q) => q.topic !== answer.topic),
  );
  const byTopic = new Map<string, Question[]>();
  for (const q of others) {
    const list = byTopic.get(q.topic) ?? [];
    list.push(q);
    byTopic.set(q.topic, list);
  }
  const topicOrder = shuffle(rng, [...byTopic.keys()]);
  const usedTopics = new Set<string>(chosen.map((q) => q.topic));
  usedTopics.add(answer.topic);
  // 1차: 아직 쓰지 않은 주제에서 하나씩
  for (const t of topicOrder) {
    if (chosen.length >= count) break;
    if (usedTopics.has(t)) continue;
    const q = byTopic.get(t)?.shift();
    if (q) {
      chosen.push(q);
      usedTopics.add(t);
    }
  }
  // 2차: 다른 주제에서 남은 것
  for (const q of others) {
    if (chosen.length >= count) break;
    if (!chosen.includes(q)) chosen.push(q);
  }
  // 3차: 그래도 모자라면 같은 주제에서
  for (const q of same) {
    if (chosen.length >= count) break;
    if (!chosen.includes(q)) chosen.push(q);
  }
  return chosen.length >= count ? chosen.slice(0, count) : null;
}

/** 한 판의 계획(넘겨받은 정답 + 문제마다 카드·지연·떨어지는 시간) — 오답은 한 풀(all, 학년군)에서. 난이도가 단계를 정한다(spec 5.3) */
export function buildPlans(
  all: readonly Question[],
  band: BandChoice,
  difficulty: Difficulty,
  rng: Rng,
  answers: readonly Question[],
): QuestionPlan[] {
  const avoid = avoidIndex(all);
  const dPool = distractorPool(all, band);
  return answers.map((answer, i) => planOne(answer, i, difficulty, rng, dPool, avoid, 'base'));
}

function planOne(
  answer: Question,
  i: number,
  difficulty: Difficulty,
  rng: Rng,
  dPool: readonly Question[],
  avoid: Map<string, Set<string>>,
  level: QuestionLevel,
): QuestionPlan {
  const stage = stageFor(i + 1, difficulty);
  const distractors = pickDistractors(answer, dPool, stage.cards - 1, stage.sameTopicDistractors, rng, avoid);
  if (!distractors) throw new Error(`not enough distractors for ${answer.word}`);
  const options = shuffle(rng, [answer, ...distractors]);
  const delaysMs = shuffle(rng, GAME.START_DELAYS_MS.slice(0, stage.cards));
  return { answer, options, stage, delaysMs, fallMs: fallMsFor(answer, stage, difficulty), level };
}

/**
 * 정답 문항의 오답 풀(spec 5.6 표, v9):
 * - vh 문항(Normal·Hard의 한 단계 위 중학, Very Hard 전부) → Very Hard 풀 전체
 * - 5~6 문항인데 학년군 3-4(한 단계 위) → 5~6 문항만
 * - 그 밖(3~4 문항, 학년군 5-6·all의 5~6 문항) → 지금 그대로(distractorPool: 3-4면 3~4만, 5-6·all이면 부록 A 전부)
 */
export function distractorPoolFor(
  answer: Question,
  band: BandChoice,
  pools: { main: readonly Question[]; veryhard: readonly Question[] },
): readonly Question[] {
  if (answer.band === 'vh') return pools.veryhard;
  if (answer.band === '5-6' && band === '3-4') return pools.main.filter((q) => q.band === '5-6');
  return distractorPool(pools.main, band);
}

/**
 * 한 판의 계획(spec 5.3.1·5.6, v9). 정답 문항마다 오답 풀을 수준으로 고른다(distractorPoolFor).
 * Very Hard는 학년군을 무시하고(정답이 모두 vh 문항) Very Hard 풀에서만. avoid 표는 그 오답 풀 안에서 만든다.
 * levels: 문제마다 'base' | 'up'(없으면 모두 'base'). 오답 고르기·카드·지연은 문제 차례대로 같은 rng로 이어서 쓴다
 * (Easy는 v8의 buildPlans(main, band, …)와 rng 사용까지 같다).
 */
export function buildGamePlans(
  pools: { main: readonly Question[]; veryhard: readonly Question[] },
  band: BandChoice,
  difficulty: Difficulty,
  rng: Rng,
  answers: readonly Question[],
  levels?: readonly QuestionLevel[],
): QuestionPlan[] {
  const avoidMain = avoidIndex(pools.main);
  const avoidVh = avoidIndex(pools.veryhard);
  const cache = new Map<string, readonly Question[]>();
  return answers.map((answer, i) => {
    const key = answer.band === 'vh' ? 'vh' : answer.band === '5-6' && band === '3-4' ? 'up56' : `main:${band}`;
    let dPool = cache.get(key);
    if (!dPool) cache.set(key, (dPool = distractorPoolFor(answer, band, pools)));
    return planOne(answer, i, difficulty, rng, dPool, answer.band === 'vh' ? avoidVh : avoidMain, levels?.[i] ?? 'base');
  });
}
