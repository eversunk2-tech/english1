// localStorage를 try/catch로 감싼다(사생활 모드 등에서 막혀 있으면 저장만 건너뜀, spec 5.5).
import { DIFFICULTY_NAMES, STORAGE_KEYS, type Difficulty } from '../config.ts';
import type { BandChoice } from '../game/types.ts';
import { parseDifficulty } from '../game/difficulty.ts';

function get(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function set(key: string, value: string): void {
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

/** 최근 정답 목록. Very Hard는 따로(catchword.recent.veryhard, spec 5.5·5.6 v4) */
function recentKey(d?: Difficulty): string {
  return d === 'veryhard' ? STORAGE_KEYS.recentVeryHard : STORAGE_KEYS.recent;
}

export function loadRecent(d?: Difficulty): string[] {
  try {
    const v = JSON.parse(get(recentKey(d)) ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function saveRecent(words: readonly string[], d?: Difficulty): void {
  set(recentKey(d), JSON.stringify(words));
}

export function loadSound(): boolean {
  return get(STORAGE_KEYS.sound) !== 'off';
}

export function saveSound(on: boolean): void {
  set(STORAGE_KEYS.sound, on ? 'on' : 'off');
}
