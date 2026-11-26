// spec 5.6: 한 판의 정답 고르기, 문제마다 오답 카드 고르기. 순수.
import { GAME } from '../config.ts';
import { clueMentions } from '../data/words.ts';
import { fallMsFor, stageFor, type Difficulty } from './difficulty.ts';
import { shuffle, type Rng } from './rng.ts';
import type { BandChoice, Question, QuestionPlan } from './types.ts';

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

/** 정답 n개: 최근 단어는 풀이 충분하면 피한다 */
export function pickAnswers(pool: readonly Question[], n: number, rng: Rng, recent: readonly string[]): Question[] {
  const recentSet = new Set(recent);
  const fresh = shuffle(
    rng,
    pool.filter((q) => !recentSet.has(q.word)),
  );
  if (fresh.length >= n) return fresh.slice(0, n);
  const old = shuffle(
    rng,
    pool.filter((q) => recentSet.has(q.word)),
  );
  return fresh.concat(old).slice(0, n);
}

/** 한 판의 계획(정답 n개 + 문제마다 카드·지연·떨어지는 시간). 난이도가 단계(카드 수·같은 주제 수·시간)를 정한다(spec 5.3) */
export function buildPlans(
  all: readonly Question[],
  band: BandChoice,
  difficulty: Difficulty,
  rng: Rng,
  recent: readonly string[] = [],
  n: number = GAME.QUESTIONS_PER_GAME,
): QuestionPlan[] {
  const avoid = avoidIndex(all);
  const answers = pickAnswers(answerPool(all, band), n, rng, recent);
  const dPool = distractorPool(all, band);
  return answers.map((answer, i) => {
    const stage = stageFor(i + 1, difficulty);
    const distractors = pickDistractors(answer, dPool, stage.cards - 1, stage.sameTopicDistractors, rng, avoid);
    if (!distractors) throw new Error(`not enough distractors for ${answer.word}`);
    const options = shuffle(rng, [answer, ...distractors]);
    const delaysMs = shuffle(rng, GAME.START_DELAYS_MS.slice(0, stage.cards));
    return { answer, options, stage, delaysMs, fallMs: fallMsFor(answer, stage) };
  });
}

/** 이번 판 정답을 최근 목록 앞에 붙인다(최대 RECENT_MAX) */
export function updateRecent(recent: readonly string[], played: readonly string[]): string[] {
  const out: string[] = [];
  for (const w of [...played, ...recent]) {
    if (!out.includes(w)) out.push(w);
    if (out.length >= GAME.RECENT_MAX) break;
  }
  return out;
}
