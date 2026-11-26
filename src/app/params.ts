// spec 11: URL 매개변수.
import type { BandChoice } from '../game/types.ts';
import type { Difficulty } from '../config.ts';

export type InputParam = 'camera' | 'pointer' | 'replay';

export interface Params {
  input: InputParam;
  band: BandChoice | null;
  seed: number | null;
  debug: boolean;
  record: boolean;
  test: boolean;
  delegate: 'auto' | 'GPU' | 'CPU';
  manualClock: boolean;
  /** ?difficulty=easy|normal|hard|veryhard — 있으면 기억한 값보다 우선(spec 6.2 v2·v4) */
  difficulty: Difficulty | null;
}

export function parseParams(search: string): Params {
  const q = new URLSearchParams(search);
  const input = q.get('input');
  const band = q.get('band');
  const seedStr = q.get('seed');
  const seed = seedStr !== null && /^\d+$/.test(seedStr) ? Number(seedStr) >>> 0 : null;
  const delegate = (q.get('delegate') ?? '').toUpperCase();
  const diff = (q.get('difficulty') ?? '').toLowerCase();
  return {
    input: input === 'pointer' || input === 'replay' ? input : 'camera',
    band: band === '3-4' || band === '5-6' || band === 'all' ? band : null,
    seed,
    debug: q.get('debug') === '1',
    record: q.get('record') === '1',
    test: q.get('test') === '1',
    delegate: delegate === 'CPU' ? 'CPU' : delegate === 'GPU' ? 'GPU' : 'auto',
    // ?clock=manual은 ?test=1이 함께 있을 때만(spec 11·12.2, review R1)
    manualClock: q.get('test') === '1' && q.get('clock') === 'manual',
    difficulty: diff === 'easy' || diff === 'normal' || diff === 'hard' || diff === 'veryhard' ? diff : null,
  };
}
