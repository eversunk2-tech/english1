import { describe, expect, it } from 'vitest';
import { belowBand, cardAt, grabTarget, hitMargin, type HitCard } from '../../src/game/hitTest.ts';

const card = (id: number, x: number, y: number, w = 200, h = 100, grabbable = true): HitCard => ({
  id,
  rect: { x, y, w, h },
  grabbable,
});

describe('hitTest (spec 4.5)', () => {
  it('여유 m = max(24, 0.035·min(W,H)), 터치는 8', () => {
    expect(hitMargin({ W: 1024, H: 600 }, false)).toBe(24);
    expect(hitMargin({ W: 1280, H: 800 }, false)).toBeCloseTo(28, 9);
    expect(hitMargin({ W: 1280, H: 800 }, true)).toBe(8);
  });

  it('여유 경계 안/밖', () => {
    const cs = [card(1, 100, 300)];
    expect(cardAt(cs, { x: 100 - 24, y: 350 }, 24)).toBe(1);
    expect(cardAt(cs, { x: 100 - 24.5, y: 350 }, 24)).toBe(null);
    expect(cardAt(cs, { x: 200, y: 400 + 24 }, 24)).toBe(1);
    expect(cardAt(cs, { x: 200, y: 400 + 25 }, 24)).toBe(null);
    expect(cardAt(cs, { x: 300 + 8, y: 350 }, 8)).toBe(1);
    expect(cardAt(cs, { x: 300 + 9, y: 350 }, 8)).toBe(null);
  });

  it('두 카드 판정 영역이 겹치면 중심이 가까운 쪽', () => {
    const cs = [card(1, 100, 300), card(2, 320, 300)];
    expect(cardAt(cs, { x: 305, y: 350 }, 24)).toBe(1);
    expect(cardAt(cs, { x: 315, y: 350 }, 24)).toBe(2);
  });

  it('띠 뒤 카드·사라지는 카드는 제외', () => {
    expect(belowBand({ x: 0, y: 20, w: 100, h: 100 }, 80)).toBe(false);
    expect(belowBand({ x: 0, y: 30, w: 100, h: 100 }, 80)).toBe(true);
    const cs = [card(1, 100, 300, 200, 100, false)];
    expect(cardAt(cs, { x: 200, y: 350 }, 24)).toBe(null);
  });

  it('① 잡은 위치에 없으면 ② 이전 OPEN 위치 사용', () => {
    const cs = [card(1, 100, 300), card(2, 500, 300)];
    expect(grabTarget(cs, { x: 200, y: 460 }, { x: 200, y: 350 }, 24)).toBe(1);
    expect(grabTarget(cs, { x: 600, y: 350 }, { x: 200, y: 350 }, 24)).toBe(2);
    expect(grabTarget(cs, { x: 200, y: 460 }, null, 24)).toBe(null);
  });
});
