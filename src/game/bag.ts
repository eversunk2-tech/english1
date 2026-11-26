// spec 5.6.1 (v8): 섞은 카드 더미(shuffle bag) — 한 판의 정답 고르기. 순수(입력을 바꾸지 않고 새 상태를 돌려줌).
// 같은 풀에서 놀면 모든 문항을 한 번씩 정답으로 낸 뒤에만 같은 문항이 다시 나온다(한 "바퀴").
import { GAME, type Difficulty } from '../config.ts';
import { shuffle, type Rng } from './rng.ts';
import type { BandChoice, Question } from './types.ts';

export type BagName = '3-4' | '5-6' | 'veryhard';
export const BAG_NAMES: readonly BagName[] = ['3-4', '5-6', 'veryhard'];

/** used: 이번 바퀴에 이미 정답으로 낸 id(오래된 것이 앞), recent: 최근에 낸 id(새것이 앞, 최대 BAG_COOLDOWN) */
export interface BagState {
  used: string[];
  recent: string[];
}

export interface BagInput {
  name: BagName;
  pool: readonly Question[];
  state: BagState;
}

export interface DrawResult {
  /** 문제 1~10 순서 */
  answers: Question[];
  /** 입력으로 받은 더미들의 새 상태 */
  states: Partial<Record<BagName, BagState>>;
}

export function emptyBag(): BagState {
  return { used: [], recent: [] };
}

/** 판이 쓰는 더미(spec 5.6.1 ①): Very Hard → veryhard(학년 무시), all → 3-4·5-6 함께 */
export function bagsFor(band: BandChoice, difficulty: Difficulty): BagName[] {
  if (difficulty === 'veryhard') return ['veryhard'];
  if (band === 'all') return ['3-4', '5-6'];
  return [band];
}

/** 더미의 풀(데이터 파일 순서) */
export function bagPool(name: BagName, pools: { main: readonly Question[]; veryhard: readonly Question[] }): Question[] {
  if (name === 'veryhard') return pools.veryhard.slice();
  return pools.main.filter((q) => q.band === name);
}

function isStringArray(x: unknown): x is string[] {
  return Array.isArray(x) && x.every((v) => typeof v === 'string');
}

/** 지금 풀에 없는 id·두 번째 이후 중복을 버리고 recent를 BAG_COOLDOWN개로 자른다 */
function fitBag(state: BagState, poolIds: ReadonlySet<string>): BagState {
  const clean = (list: readonly string[]): string[] => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const id of list) {
      if (!poolIds.has(id) || seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
    return out;
  };
  return { used: clean(state.used), recent: clean(state.recent).slice(0, GAME.BAG_COOLDOWN) };
}

/**
 * 저장된 값 맞추기(spec 5.6.1 ②). raw는 localStorage 글자(JSON) 또는 이미 읽은 값.
 * JSON이 아니거나 객체가 아니거나 v !== 1이거나 used/recent가 문자열 배열이 아니면 빈 더미.
 */
export function sanitizeBag(raw: unknown, poolIds: Iterable<string>): BagState {
  let v: unknown = raw;
  if (typeof raw === 'string') {
    try {
      v = JSON.parse(raw);
    } catch {
      return emptyBag();
    }
  }
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return emptyBag();
  const o = v as { v?: unknown; used?: unknown; recent?: unknown };
  if (o.v !== 1 || !isStringArray(o.used) || !isStringArray(o.recent)) return emptyBag();
  return fitBag({ used: o.used, recent: o.recent }, new Set(poolIds));
}

/** 저장할 JSON 값 */
export function serializeBag(state: BagState): string {
  return JSON.stringify({ v: 1, used: state.used, recent: state.recent });
}

/**
 * 한 판의 정답 n개 뽑기(spec 5.6.1 ③). rng만 쓴다.
 * 남은 문항(used·chosen 제외)에서 뽑되 최근 문항(recent)은 뒤로 미룬다. 남은 것이 없으면 다 낸 더미를 새 바퀴로.
 */
export function drawAnswers(bags: readonly BagInput[], n: number, rng: Rng): DrawResult {
  const work = bags.map((b) => {
    const ids = new Set(b.pool.map((q) => q.id));
    const st = fitBag(b.state, ids);
    return { name: b.name, pool: b.pool, ids, used: st.used.slice(), oldRecent: st.recent, drawn: [] as string[] };
  });
  const isFull = (w: (typeof work)[number]): boolean => w.used.length > 0 && w.used.length >= w.ids.size;
  // 1. 풀을 다 낸 더미는 새 바퀴
  for (const w of work) if (isFull(w)) w.used = [];

  const chosen: Question[] = [];
  const chosenIds = new Set<string>();
  const cool = new Set<string>(work.flatMap((w) => w.oldRecent));
  while (chosen.length < n) {
    const R: { q: Question; w: (typeof work)[number] }[] = [];
    for (const w of work) {
      const used = new Set(w.used);
      for (const q of w.pool) if (!used.has(q.id) && !chosenIds.has(q.id)) R.push({ q, w });
    }
    if (R.length === 0) {
      const full = work.filter(isFull);
      if (full.length === 0) break; // 풀 전체가 n보다 작음
      for (const w of full) w.used = [];
      continue;
    }
    const order = shuffle(
      rng,
      R.filter((r) => !cool.has(r.q.id)),
    ).concat(
      shuffle(
        rng,
        R.filter((r) => cool.has(r.q.id)),
      ),
    );
    for (const r of order.slice(0, n - chosen.length)) {
      chosen.push(r.q);
      chosenIds.add(r.q.id);
      r.w.used.push(r.q.id);
      r.w.drawn.push(r.q.id);
    }
  }

  const states: Partial<Record<BagName, BagState>> = {};
  for (const w of work) {
    const recent: string[] = [];
    for (const id of [...w.drawn.slice().reverse(), ...w.oldRecent]) {
      if (recent.length >= GAME.BAG_COOLDOWN) break;
      if (!recent.includes(id)) recent.push(id);
    }
    states[w.name] = { used: w.used, recent };
  }
  return { answers: chosen, states };
}

/** 화면에 나오지 않은 문제를 더미로 되돌린다(spec 5.6.1 ⑤): 그 id를 used·recent에서 뺀다 */
export function returnUnshown(
  states: Partial<Record<BagName, BagState>>,
  ids: readonly string[],
): Partial<Record<BagName, BagState>> {
  const drop = new Set(ids);
  const out: Partial<Record<BagName, BagState>> = {};
  for (const name of Object.keys(states) as BagName[]) {
    const st = states[name];
    if (!st) continue;
    out[name] = { used: st.used.filter((id) => !drop.has(id)), recent: st.recent.filter((id) => !drop.has(id)) };
  }
  return out;
}

/** 이번 바퀴에 남은 문항 수 */
export function remainingCount(pool: readonly Question[], state: BagState): number {
  const used = new Set(state.used);
  return pool.filter((q) => !used.has(q.id)).length;
}
