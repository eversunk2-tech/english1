// localStorage를 try/catch로 감싼다(사생활 모드 등에서 막혀 있으면 저장만 건너뜀, spec 5.5).
import { STORAGE_KEYS } from '../config.ts';
import type { BandChoice } from '../game/types.ts';

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

export function loadBest(band: BandChoice): number {
  const v = Number(get(STORAGE_KEYS.bestPrefix + band));
  return Number.isFinite(v) && v > 0 ? v : 0;
}

export function saveBest(band: BandChoice, score: number): void {
  set(STORAGE_KEYS.bestPrefix + band, String(Math.round(score)));
}

export function loadRecent(): string[] {
  try {
    const v = JSON.parse(get(STORAGE_KEYS.recent) ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function saveRecent(words: readonly string[]): void {
  set(STORAGE_KEYS.recent, JSON.stringify(words));
}

export function loadSound(): boolean {
  return get(STORAGE_KEYS.sound) !== 'off';
}

export function saveSound(on: boolean): void {
  set(STORAGE_KEYS.sound, on ? 'on' : 'off');
}
