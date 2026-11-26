// localStorage를 try/catch로 감싼다(사생활 모드 등에서 막혀 있으면 저장만 건너뜀, spec 5.5).
import { DIFFICULTY_NAMES, GAME, STORAGE_KEYS, type Difficulty } from '../config.ts';
import type { BandChoice } from '../game/types.ts';
import { bagPool, sanitizeBag, serializeBag, type BagName, type BagPools, type BagState } from '../game/bag.ts';
import { parseDifficulty } from '../game/difficulty.ts';

export function get(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function set(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // 저장만 건너뜀
  }
}

/**
 * 최고 점수 키(spec 5.5): Easy는 catchword.best.<band>.easy 그대로(v2).
 * v9: 규칙이 바뀐 Normal·Hard는 새 칸 catchword.best.v9.<band>.<normal|hard>, Very Hard는 catchword.best.v9.veryhard(학년과 상관없이 한 칸).
 * 옛 Normal·Hard·Very Hard 키는 지우지 않고 읽지도 옮기지도 않는다.
 */
export function bestKey(band: BandChoice, d: Difficulty): string {
  if (d === 'easy') return `${STORAGE_KEYS.bestPrefix}${band}.easy`;
  if (d === 'veryhard') return `${STORAGE_KEYS.bestV9Prefix}veryhard`;
  return `${STORAGE_KEYS.bestV9Prefix}${band}.${d}`;
}

/**
 * v1 키 catchword.best.<band>가 있고 새 ….easy 키가 없으면 그 값을 ….easy로 한 번 옮긴다(옛 키는 지우지 않음).
 * v1 기록은 Easy와 같은 규칙으로 낸 것이다.
 */
export function migrateBest(): void {
  for (const band of ['3-4', '5-6', 'all'] as BandChoice[]) {
    const old = get(STORAGE_KEYS.bestPrefix + band);
    if (old === null) continue;
    if (get(bestKey(band, 'easy')) !== null) continue;
    const v = Number(old);
    if (Number.isFinite(v) && v > 0) set(bestKey(band, 'easy'), String(Math.round(v)));
  }
}

export function loadBest(band: BandChoice, d: Difficulty): number {
  const v = Number(get(bestKey(band, d)));
  return Number.isFinite(v) && v > 0 ? v : 0;
}

export function saveBest(band: BandChoice, d: Difficulty, score: number): void {
  set(bestKey(band, d), String(Math.round(score)));
}

/** 마지막으로 고른 난이도(없거나 이상한 값이면 normal) */
export function loadDifficulty(): Difficulty {
  return parseDifficulty(get(STORAGE_KEYS.difficulty));
}

export function saveDifficulty(d: Difficulty): void {
  if ((DIFFICULTY_NAMES as readonly string[]).includes(d)) set(STORAGE_KEYS.difficulty, d);
}

/** 키 지우기(try/catch, spec 5.6.1 ⑦ v8) */
export function remove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // 막혀 있으면 건너뜀
  }
}

/** 옛 v4 최근 정답 목록(단어 배열). 깨졌으면 [] */
function readLegacyWords(raw: string): string[] {
  try {
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * v4의 catchword.recent·catchword.recent.veryhard를 섞은 카드 더미로 한 번 옮기고 지운다(spec 5.6.1 ⑦ v8).
 * 단어를 id로 바꿔 아직 키가 없는 더미에만 {v:1, used, recent}로 저장(모르는 단어는 버림). 이미 있는 catchword.bag.*는 그대로.
 * v9: v8의 veryhard 더미가 vh-mid·vh-adv로 나뉘었으므로 catchword.recent.veryhard의 단어도 제 더미(중학/심화)로 나눠 옮긴다.
 */
export function migrateRecentToBags(pools: BagPools): void {
  const jobs: { key: string; names: BagName[] }[] = [
    { key: STORAGE_KEYS.legacyRecent, names: ['3-4', '5-6'] },
    { key: STORAGE_KEYS.legacyRecentVeryHard, names: ['vh-mid', 'vh-adv'] },
  ];
  for (const job of jobs) {
    const raw = get(job.key);
    if (raw === null) continue;
    const words = readLegacyWords(raw); // 새것이 앞
    for (const name of job.names) {
      const bagKey = STORAGE_KEYS.bagPrefix + name;
      if (get(bagKey) !== null) continue;
      const byWord = new Map(bagPool(name, pools).map((q) => [q.word, q.id]));
      const recent: string[] = [];
      for (const w of words) {
        const id = byWord.get(w);
        if (id !== undefined && !recent.includes(id)) recent.push(id);
      }
      if (recent.length === 0) continue;
      // used는 낸 순서(오래된 것이 앞), recent는 새것이 앞
      set(bagKey, serializeBag({ used: recent.slice().reverse(), recent: recent.slice(0, GAME.BAG_COOLDOWN) }));
    }
    remove(job.key);
  }
}

/**
 * v8의 catchword.bag.veryhard를 vh-mid·vh-adv 두 더미로 나눠 옮기고 지운다(spec 5.6.1 ⑦-2, v9). 앱을 열 때 한 번, persist 모드에서만.
 * - 옛 키가 있고 새 키가 둘 다 없으면: sanitizeBag 규칙(JSON·v·배열 검사, Very Hard 풀에 없는 id 버림)으로 읽어
 *   used·recent의 id를 제 더미로 나눠(순서 유지, recent는 BAG_COOLDOWN개까지) 각각 저장한 뒤 옛 키를 지운다.
 * - 새 키가 하나라도 있거나 옛 값이 망가졌으면 옮기지 않고 옛 키만 지운다.
 */
export function migrateVeryHardBag(pools: BagPools): void {
  const raw = get(STORAGE_KEYS.legacyBagVeryHard);
  if (raw === null) return;
  const midKey = STORAGE_KEYS.bagPrefix + 'vh-mid';
  const advKey = STORAGE_KEYS.bagPrefix + 'vh-adv';
  if (get(midKey) === null && get(advKey) === null && isValidBagJson(raw)) {
    const old = sanitizeBag(raw, pools.veryhard.map((q) => q.id));
    const split = (name: BagName): BagState => {
      const ids = new Set(bagPool(name, pools).map((q) => q.id));
      return {
        used: old.used.filter((id) => ids.has(id)),
        recent: old.recent.filter((id) => ids.has(id)).slice(0, GAME.BAG_COOLDOWN),
      };
    };
    set(midKey, serializeBag(split('vh-mid')));
    set(advKey, serializeBag(split('vh-adv')));
  }
  remove(STORAGE_KEYS.legacyBagVeryHard);
}

/** sanitizeBag이 빈 더미로 바꾸는 "망가진 값"이 아닌가(JSON 객체, v === 1, used·recent가 문자열 배열) */
function isValidBagJson(raw: string): boolean {
  try {
    const v: unknown = JSON.parse(raw);
    if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
    const o = v as { v?: unknown; used?: unknown; recent?: unknown };
    const strArr = (x: unknown): boolean => Array.isArray(x) && x.every((y) => typeof y === 'string');
    return o.v === 1 && strArr(o.used) && strArr(o.recent);
  } catch {
    return false;
  }
}

export function loadSound(): boolean {
  return get(STORAGE_KEYS.sound) !== 'off';
}

export function saveSound(on: boolean): void {
  set(STORAGE_KEYS.sound, on ? 'on' : 'off');
}
