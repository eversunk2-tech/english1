import { describe, expect, it } from 'vitest';
import { distanceHint, mapToScreen, palmCenter, palmSize, smoothPoint, smoothingAlpha } from '../../src/hand/mapping.ts';
import { synthHand } from '../helpers/handSynth.ts';

const VW = 640;
const VH = 480; // 4:3
const SCREENS: [string, number, number][] = [
  ['16:10', 1280, 800],
  ['4:3', 1024, 768],
  ['3:4', 768, 1024],
];

describe('mapping (spec 3.3)', () => {
  for (const [name, W, H] of SCREENS) {
    it(`${name}: (0.5,0.5) → 화면 중심, (0,v) → 오른쪽 끝(거울)`, () => {
      const c = mapToScreen(0.5, 0.5, VW, VH, W, H);
      expect(c.x).toBeCloseTo(W / 2, 9);
      expect(c.y).toBeCloseTo(H / 2, 9);
      expect(c.offscreen).toBe(false);
      const r = mapToScreen(0, 0.5, VW, VH, W, H);
      expect(r.x).toBeCloseTo(W, 9);
      const l = mapToScreen(1, 0.5, VW, VH, W, H);
      expect(l.x).toBeCloseTo(0, 9);
      // 거울: u가 작을수록 오른쪽
      expect(mapToScreen(0.2, 0.5, VW, VH, W, H).x).toBeGreaterThan(W / 2);
    });
  }

  it('16:10: 위아래 잘린 곳은 offscreen(좌표는 화면 안으로 자름)', () => {
    const W = 1280;
    const H = 800; // s=2, dh=960, oy=-80
    const top = mapToScreen(0.5, 0.02, VW, VH, W, H);
    expect(top.offscreen).toBe(true);
    expect(top.y).toBe(0);
    const bottom = mapToScreen(0.5, 0.98, VW, VH, W, H);
    expect(bottom.offscreen).toBe(true);
    expect(bottom.y).toBe(H);
    const inside = mapToScreen(0.5, 0.1, VW, VH, W, H);
    expect(inside.offscreen).toBe(false);
    expect(inside.y).toBeCloseTo(-80 + 0.1 * 960, 9);
  });

  it('3:4: 좌우 잘린 곳은 offscreen', () => {
    const W = 768;
    const H = 1024;
    expect(mapToScreen(0.05, 0.5, VW, VH, W, H).offscreen).toBe(true);
    expect(mapToScreen(0.95, 0.5, VW, VH, W, H).offscreen).toBe(true);
    expect(mapToScreen(0.4, 0.5, VW, VH, W, H).offscreen).toBe(false);
  });

  it('거울을 끄면(터치) 뒤집지 않는다', () => {
    expect(mapToScreen(0.2, 0.5, VW, VH, 1024, 768, { mirror: false }).x).toBeCloseTo(0.2 * 1024, 9);
  });

  it('손바닥 중심 = 평균(0,5,9,13,17), 손 크기 = |0−9|/vh', () => {
    const hand = synthHand({ bend: 0, u: 0.3, v: 0.6, palm: 0.1 });
    const c = palmCenter(hand.landmarks);
    expect(c.x).toBeCloseTo(0.3, 9);
    expect(c.y).toBeCloseTo(0.6, 9);
    expect(palmSize(hand.landmarks, VW, VH)).toBeCloseTo(0.1, 9);
    expect(Number.isNaN(palmCenter([]).x)).toBe(true);
  });

  it('거리 안내(spec 3.5)', () => {
    expect(distanceHint(0.03)).toBe('far');
    expect(distanceHint(0.08)).toBe(null);
    expect(distanceHint(0.21)).toBe('close');
  });

  it('평활 α 범위(spec 3.4)', () => {
    const D = Math.hypot(1280, 800);
    expect(smoothingAlpha(0, D)).toBeCloseTo(0.25, 9);
    expect(smoothingAlpha(10000, D)).toBeCloseTo(0.85, 9);
    let prev = 0;
    for (let d = 0; d < 300; d += 5) {
      const a = smoothingAlpha(d, D);
      expect(a).toBeGreaterThanOrEqual(0.25);
      expect(a).toBeLessThanOrEqual(0.85);
      expect(a).toBeGreaterThanOrEqual(prev);
      prev = a;
    }
    expect(smoothPoint(null, { x: 5, y: 7 }, D)).toEqual({ x: 5, y: 7 });
    const q = smoothPoint({ x: 0, y: 0 }, { x: 4, y: 0 }, D);
    expect(q.x).toBeGreaterThan(0);
    expect(q.x).toBeLessThan(4);
  });
});
