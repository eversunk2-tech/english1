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
 * 정답 한 번의 점수(spec 5.5): round(배율 × (기본 + 빠르기 + 콤보)).
 * @param firstTry 이 문제에서 오답을 잡지 않았는가
 * @param p 정답 카드 진행도(0→1)
 * @param comboCount 이 정답을 포함한 연속 정답 수
 * @param multiplier 난이도 배율(Easy 1.0 / Normal 1.2 / Hard 1.5)
 */
export function correctScore(firstTry: boolean, p: number, comboCount: number, multiplier: number): CorrectScore {
  const base = firstTry ? GAME.SCORE_FIRST_TRY : GAME.SCORE_RETRY;
  const speed = speedBonus(p);
  const combo = comboCount >= GAME.COMBO_FROM ? GAME.COMBO_BONUS : 0;
  return { base, speed, combo, total: Math.round(multiplier * (base + speed + combo)) };
}

/** 오답 감점(spec 5.5 v2): 점수는 0 아래로 내려가지 않는다. deducted = 실제로 깎인 양 */
export function applyPenalty(score: number, penalty: number): { score: number; deducted: number } {
  const deducted = Math.max(0, Math.min(score, penalty));
  return { score: score - deducted, deducted };
}
