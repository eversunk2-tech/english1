import { describe, expect, it } from 'vitest';
import { ASSETS, GAME, HAND, LAYOUT, PERF, STORAGE_KEYS } from '../../src/config.ts';

describe('config는 실행 중 바꿀 수 없다 (spec 12.2, review M2)', () => {
  it('모든 상수 객체가 깊게 얼어 있다', () => {
    for (const o of [HAND, GAME, LAYOUT, PERF, ASSETS, STORAGE_KEYS]) expect(Object.isFrozen(o)).toBe(true);
    expect(Object.isFrozen(GAME.STAGES)).toBe(true);
    for (const st of GAME.STAGES) expect(Object.isFrozen(st)).toBe(true);
    expect(Object.isFrozen(GAME.START_DELAYS_MS)).toBe(true);
  });

  it('값을 바꾸려 하면 오류가 나고 값은 그대로다', () => {
    expect(() => {
      (GAME as unknown as { SCORE_FIRST_TRY: number }).SCORE_FIRST_TRY = 999;
    }).toThrow(TypeError);
    expect(GAME.SCORE_FIRST_TRY).toBe(100);
    expect(() => {
      (GAME.STAGES[0] as unknown as { fallMs: number }).fallMs = 1;
    }).toThrow(TypeError);
    expect(GAME.STAGES[0]!.fallMs).toBe(9000);
    expect(() => {
      (HAND as unknown as { FIST_ENTER: number }).FIST_ENTER = 0;
    }).toThrow(TypeError);
  });
});
