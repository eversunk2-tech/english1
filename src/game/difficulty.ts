// spec 5.3.2~5.3.3 (v2): 난이도 이름 검사, 단계 고르기, 공정성 바닥, 문제마다 떨어지는 시간. 순수.
import { DIFFICULTY_NAMES, GAME, type Difficulty, type DifficultyConfig, type StageConfig } from '../config.ts';
import { tokenize } from '../data/words.ts';
import type { Band, Question } from './types.ts';

export type { Difficulty };

/** 이상한 값이면 기본(normal) */
export function parseDifficulty(v: unknown): Difficulty {
  return typeof v === 'string' && (DIFFICULTY_NAMES as readonly string[]).includes(v)
    ? (v as Difficulty)
    : GAME.DEFAULT_DIFFICULTY;
}

export function difficultyConfig(d: Difficulty): DifficultyConfig {
  return GAME.DIFFICULTIES[d];
}

/** 문제 번호(1부터)의 단계 */
export function stageFor(questionNo: number, d: Difficulty): StageConfig {
  const stages = GAME.DIFFICULTIES[d].stages;
  let found: StageConfig | undefined;
  for (const s of stages) if (questionNo >= s.fromQuestion) found = s;
  return found ?? (stages[0] as StageConfig);
}

/** 낱말당 읽기 시간(ms) — 난이도 × 문항 자신의 band (spec 5.3.3 v9) */
export function wordMs(band: Band, d: Difficulty): number {
  return GAME.FALL_FLOOR.WORD_MS[d][band];
}

/** 잘하는 학생이 한 번에 잡는 데 필요한 시간 T_need(ms) — n: 설명 낱말 수, band: 문항 자신의 학년군, d: 난이도(v9) */
export function timeNeededMs(n: number, band: Band, d: Difficulty): number {
  const f = GAME.FALL_FLOOR;
  return f.BASE_MS + n * wordMs(band, d) + f.MOVE_MS + f.GRAB_MS;
}

/** 공정성 바닥(ms) = ceil(T_need × 100 / 85 / 10) × 10 — 정수 ms, 10ms 단위로 올림 */
export function floorMs(n: number, band: Band, d: Difficulty): number {
  const t = timeNeededMs(n, band, d);
  return Math.ceil((t * 100) / Math.round(GAME.FALL_FLOOR.COMFORT_P * 100) / 10) * 10;
}

/** 이 문제의 실제 떨어지는 시간 = max(단계 값, 바닥). 바닥은 정답 문항의 설명·band와 난이도로 계산(v9) */
export function fallMsFor(answer: Pick<Question, 'clue' | 'band'>, stage: Pick<StageConfig, 'fallMs'>, d: Difficulty): number {
  return Math.max(stage.fallMs, floorMs(tokenize(answer.clue).length, answer.band, d));
}
