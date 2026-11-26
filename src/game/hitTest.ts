// spec 4.5: 잡은 위치로 카드 찾기. 순수.
import { HAND } from '../config.ts';
import type { Point2 } from '../hand/tracker.ts';
import type { Rect, Viewport } from './types.ts';

export interface HitCard {
  id: number;
  rect: Rect;
  /** 살아 있고(오답 처리·사라지는 중 아님) 카드 중심이 설명 띠 아래에 있을 때 true */
  grabbable: boolean;
}

/** 판정 여유 m: 카메라는 max(24, 0.035·min(W,H)), 터치는 8px */
export function hitMargin(vp: Viewport, touch: boolean): number {
  if (touch) return HAND.TOUCH_HIT_MARGIN_PX;
  return Math.max(HAND.HIT_MARGIN_MIN_PX, HAND.HIT_MARGIN_RATIO * Math.min(vp.W, vp.H));
}

/** 카드 중심 y가 띠 아래 경계보다 위면(띠 뒤에 숨어 있으면) 잡을 수 없다 */
export function belowBand(rect: Rect, bandH: number): boolean {
  return rect.y + rect.h / 2 >= bandH;
}

/** 점이 여유 m만큼 넓힌 사각형 안인 카드 중 중심이 가장 가까운 것 */
export function cardAt(cards: readonly HitCard[], pt: Point2, margin: number): number | null {
  let best: number | null = null;
  let bestD = Infinity;
  for (const c of cards) {
    if (!c.grabbable) continue;
    const r = c.rect;
    if (pt.x < r.x - margin || pt.x > r.x + r.w + margin || pt.y < r.y - margin || pt.y > r.y + r.h + margin) continue;
    const d = Math.hypot(pt.x - (r.x + r.w / 2), pt.y - (r.y + r.h / 2));
    if (d < bestD) {
      bestD = d;
      best = c.id;
    }
  }
  return best;
}

/** ① 잡은 순간 위치에 걸린 카드, 없으면 ② 마지막 OPEN 위치 */
export function grabTarget(
  cards: readonly HitCard[],
  pos: Point2,
  prevOpenPos: Point2 | null,
  margin: number,
): number | null {
  const a = cardAt(cards, pos, margin);
  if (a !== null) return a;
  if (prevOpenPos) return cardAt(cards, prevOpenPos, margin);
  return null;
}
