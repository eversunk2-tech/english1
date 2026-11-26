import { describe, expect, it } from 'vitest';
import { ASSETS, GAME, HAND, LAYOUT, PERF, SPEECH, STORAGE_KEYS } from '../../src/config.ts';

describe('config는 실행 중 바꿀 수 없다 (spec 12.2, review M2)', () => {
  it('모든 상수 객체가 깊게 얼어 있다', () => {
    for (const o of [HAND, GAME, LAYOUT, PERF, ASSETS, STORAGE_KEYS, SPEECH]) expect(Object.isFrozen(o)).toBe(true);
    expect(Object.isFrozen(GAME.DIFFICULTIES)).toBe(true);
    for (const d of ['easy', 'normal', 'hard', 'veryhard'] as const) {
      expect(Object.isFrozen(GAME.DIFFICULTIES[d])).toBe(true);
      expect(Object.isFrozen(GAME.DIFFICULTIES[d].stages)).toBe(true);
      for (const st of GAME.DIFFICULTIES[d].stages) expect(Object.isFrozen(st)).toBe(true);
    }
    expect(Object.isFrozen(GAME.FALL_FLOOR)).toBe(true);
    expect(Object.isFrozen(GAME.FALL_FLOOR.WORD_MS)).toBe(true);
    expect(Object.isFrozen(GAME.START_DELAYS_MS)).toBe(true);
  });

  it('값을 바꾸려 하면 오류가 나고 값은 그대로다', () => {
    expect(() => {
      (GAME as unknown as { SCORE_FIRST_TRY: number }).SCORE_FIRST_TRY = 999;
    }).toThrow(TypeError);
    expect(GAME.SCORE_FIRST_TRY).toBe(100);
    expect(() => {
      (GAME.DIFFICULTIES.hard.stages[2] as unknown as { fallMs: number }).fallMs = 1;
    }).toThrow(TypeError);
    expect(GAME.DIFFICULTIES.hard.stages[2]!.fallMs).toBe(4000);
    expect(() => {
      (GAME.DIFFICULTIES.veryhard as unknown as { wrongPenalty: number }).wrongPenalty = 0;
    }).toThrow(TypeError);
    expect(() => {
      (GAME.FALL_FLOOR.WORD_MS as unknown as { vh: number }).vh = 1;
    }).toThrow(TypeError);
    expect(() => {
      (GAME.DIFFICULTIES.normal as unknown as { wrongPenalty: number }).wrongPenalty = 0;
    }).toThrow(TypeError);
    expect(() => {
      (GAME.DIFFICULTIES.hard as unknown as { scoreMultiplier: number }).scoreMultiplier = 9;
    }).toThrow(TypeError);
    expect(() => {
      (GAME.FALL_FLOOR as unknown as { MOVE_MS: number }).MOVE_MS = 0;
    }).toThrow(TypeError);
    expect(() => {
      (GAME as unknown as { DEFAULT_DIFFICULTY: string }).DEFAULT_DIFFICULTY = 'easy';
    }).toThrow(TypeError);
    expect(() => {
      (HAND as unknown as { FIST_ENTER: number }).FIST_ENTER = 0;
    }).toThrow(TypeError);
  });
});
