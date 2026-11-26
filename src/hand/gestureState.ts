// spec 4.3: 손 트랙 하나의 펴기/쥐기 상태 기계. 순수 — 시각 t(ms)를 인자로 받는다.
import { HAND } from '../config.ts';
import type { Shape } from './fist.ts';

export type Confirmed = 'NONE' | 'OPEN' | 'CLOSED';

export interface GestureState {
  confirmed: Confirmed;
  /** 지금 확정 상태가 된 시각 */
  confirmedAt: number;
  /** 연속으로 나온 한 프레임 모양(판정 불가 프레임은 건너뜀) */
  cand: Shape | null;
  candCount: number;
  candStart: number;
}

export interface GestureStep {
  state: GestureState;
  /** 펼침 → 쥠 전환 순간에만 true(spec 4.3) */
  grab: boolean;
  /** 확정 상태가 바뀌었는지 */
  changed: boolean;
}

export function initialGesture(t: number): GestureState {
  return { confirmed: 'NONE', confirmedAt: t, cand: null, candCount: 0, candStart: t };
}

/**
 * 한 프레임 진행.
 * @param shape 이 프레임의 모양. null이면 판정 불가(상태 유지).
 * @param offscreen 손이 화면 밖(cover로 잘린 곳)이면 true — 이때의 잡기는 버린다(상태는 바꿈).
 */
export function stepGesture(s: GestureState, shape: Shape | null, t: number, offscreen = false): GestureStep {
  if (shape === null) return { state: s, grab: false, changed: false };
  let { cand, candCount, candStart } = s;
  if (shape === cand) candCount += 1;
  else {
    cand = shape;
    candCount = 1;
    candStart = t;
  }
  const next: GestureState = { ...s, cand, candCount, candStart };
  if (shape === 'MIDDLE') return { state: next, grab: false, changed: false };
  const target: Confirmed = shape === 'FIST' ? 'CLOSED' : 'OPEN';
  if (target === s.confirmed) return { state: next, grab: false, changed: false };
  if (candCount >= HAND.CONFIRM_FRAMES && t - candStart >= HAND.CONFIRM_MS) {
    const grab =
      s.confirmed === 'OPEN' && target === 'CLOSED' && t - s.confirmedAt >= HAND.ARM_OPEN_MS && !offscreen;
    next.confirmed = target;
    next.confirmedAt = t;
    return { state: next, grab, changed: true };
  }
  return { state: next, grab: false, changed: false };
}
