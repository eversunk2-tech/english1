import { describe, expect, it } from 'vitest';
import { bandHeight, cardMetrics, cardRect, placeCards } from '../../src/game/layout.ts';
import { mulberry32 } from '../../src/game/rng.ts';
import type { Rect, Viewport } from '../../src/game/types.ts';

const SCREENS: Viewport[] = [
  { W: 1024, H: 768 },
  { W: 1180, H: 820 },
  { W: 1280, H: 800 },
  { W: 768, H: 1024 },
  { W: 820, H: 1180 },
];

function overlapX(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w - 1e-9 && b.x < a.x + a.w - 1e-9;
}

function checkRects(rects: Rect[], vp: Viewport): void {
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i]!;
    expect(r.x).toBeGreaterThanOrEqual(0.06 * vp.W - 1e-9);
    expect(r.x + r.w).toBeLessThanOrEqual(0.94 * vp.W + 1e-9);
    for (let j = i + 1; j < rects.length; j++) expect(overlapX(r, rects[j]!)).toBe(false);
  }
}

describe('layout (spec 5.4)', () => {
  it('설명 띠 높이 clamp(0.16·H, 88, 150)', () => {
    expect(bandHeight(400)).toBe(88);
    expect(bandHeight(768)).toBeCloseTo(122.88, 6);
    expect(bandHeight(1180)).toBe(150);
  });

  it('카드 크기', () => {
    const m = cardMetrics({ W: 1280, H: 800 }, 3);
    expect(m.cardW).toBeCloseTo(Math.min((0.88 * 1280) / 3 - 16, 0.24 * 1280, 300), 9);
    expect(m.cardH).toBe(96);
    expect(cardMetrics({ W: 1024, H: 400 }, 4).cardH).toBe(64);
    expect(cardMetrics({ W: 1024, H: 2000 }, 4).cardH).toBe(110);
  });

  it('씨앗 1000개 × 화면 5종 × 카드 3·4장: 겹치지 않음, [0.06W, 0.94W] 안, 같은 씨앗 = 같은 결과, 화면 바뀌어도 xFrac·p 유지', () => {
    for (const vp of SCREENS) {
      for (const n of [3, 4]) {
        for (let seed = 1; seed <= 1000; seed++) {
          const pl = placeCards(n, vp, mulberry32(seed));
          expect(pl.length).toBe(n);
          expect(new Set(pl.map((p) => p.lane)).size).toBe(n);
          checkRects(pl.map((p) => cardRect(p, 0.5, vp, n)), vp);
          if (seed <= 50) {
            expect(placeCards(n, vp, mulberry32(seed))).toEqual(pl);
            // 화면을 바꿔 다시 계산해도 겹치지 않고 범위 안(저장값 xFrac·p는 그대로)
            const before = JSON.stringify(pl);
            for (const other of SCREENS) checkRects(pl.map((p) => cardRect(p, 0.3, other, n)), other);
            expect(JSON.stringify(pl)).toBe(before);
          }
        }
      }
    }
  });

  it('세로 위치: p=0이면 띠 뒤에 숨고, p=1이면 화면 아래로 완전히 빠진다', () => {
    const vp = { W: 1180, H: 820 };
    const pl = placeCards(3, vp, mulberry32(1))[0]!;
    const m = cardMetrics(vp, 3);
    expect(cardRect(pl, 0, vp, 3).y + m.cardH).toBeCloseTo(m.bandH, 9);
    expect(cardRect(pl, 1, vp, 3).y).toBeCloseTo(vp.H, 9);
  });

  it('흔들림은 ±0.6·(laneW−cardW)/2 안', () => {
    const vp = { W: 1280, H: 800 };
    const m = cardMetrics(vp, 4);
    for (let s = 0; s < 200; s++) {
      for (const p of placeCards(4, vp, mulberry32(s))) {
        const laneC = m.left + (p.lane + 0.5) * m.laneW;
        expect(Math.abs(p.xFrac * vp.W - laneC)).toBeLessThanOrEqual(0.6 * ((m.laneW - m.cardW) / 2) + 1e-9);
      }
    }
  });
});
