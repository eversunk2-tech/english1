// localStorage를 try/catch로 감싼다(사생활 모드 등에서 막혀 있으면 저장만 건너뜀, spec 5.5).
import { DIFFICULTY_NAMES, GAME, STORAGE_KEYS, type Difficulty } from '../config.ts';
import type { BandChoice, Question } from '../game/types.ts';
import { bagPool, serializeBag, type BagName } from '../game/bag.ts';
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

/** 최고 점수 키: catchword.best.<band>.<difficulty> (spec 5.5 v2) */
export function bestKey(band: BandChoice, d: Difficulty): string {
  // Very Hard는 학년과 상관없이 한 칸(spec 5.5 v4)
  if (d === 'veryhard') return STORAGE_KEYS.bestVeryHard;
  return `${STORAGE_KEYS.bestPrefix}${band}.${d}`;
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
 */
export function migrateRecentToBags(pools: { main: readonly Question[]; veryhard: readonly Question[] }): void {
  const jobs: { key: string; names: BagName[] }[] = [
    { key: STORAGE_KEYS.legacyRecent, names: ['3-4', '5-6'] },
    { key: STORAGE_KEYS.legacyRecentVeryHard, names: ['veryhard'] },
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

export function loadSound(): boolean {
  return get(STORAGE_KEYS.sound) !== 'off';
}

export function saveSound(on: boolean): void {
  set(STORAGE_KEYS.sound, on ? 'on' : 'off');
}
