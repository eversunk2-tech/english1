// spec 5.5: 점수. 순수.
import { GAME } from '../config.ts';

/** 빠르기 보너스 round(50 × (1 − p)) */
export function speedBonus(p: number): number {
  const q = p < 0 ? 0 : p > 1 ? 1 : p;
  return Math.round(GAME.SPEED_BONUS_MAX * (1 - q));
}

export interface CorrectScore {
  base: number;
  speed: number;
  combo: number;
  total: number;
}

/**
 * 정답 한 번의 점수.
 * @param firstTry 이 문제에서 오답을 잡지 않았는가
 * @param p 정답 카드 진행도(0→1)
 * @param comboCount 이 정답을 포함한 연속 정답 수
 */
export function correctScore(firstTry: boolean, p: number, comboCount: number): CorrectScore {
  const base = firstTry ? GAME.SCORE_FIRST_TRY : GAME.SCORE_RETRY;
  const speed = speedBonus(p);
  const combo = comboCount >= GAME.COMBO_FROM ? GAME.COMBO_BONUS : 0;
  return { base, speed, combo, total: base + speed + combo };
}
