import { describe, expect, it } from 'vitest';
import { analyzeFist, classifyShape } from '../../src/hand/fist.ts';
import { mulberry32 } from '../../src/game/rng.ts';
import { randomRotation, synthWorld, transform, type Bend } from '../helpers/handSynth.ts';

// spec 4.7 표
const TABLE: { name: string; bend: Bend; C: number; min: number; shape: string }[] = [
  { name: '쭉 편 손', bend: 0, C: 0.013, min: 0, shape: 'OPEN' },
  { name: '살짝 편 손', bend: 0.15, C: 0.028, min: 0, shape: 'OPEN' },
  { name: '3할 굽힘', bend: 0.3, C: 0.149, min: 0.083, shape: 'OPEN' },
  { name: '반쯤 굽힘', bend: 0.5, C: 0.491, min: 0.445, shape: 'MIDDLE' },
  { name: '7할 굽힘', bend: 0.7, C: 0.886, min: 0.869, shape: 'FIST' },
  { name: '주먹', bend: 1, C: 1.0, min: 1.0, shape: 'FIST' },
  { name: '가리키기', bend: [0, 1, 1, 1], C: 0.75, min: 0, shape: 'MIDDLE' },
];

describe('fist (spec 4.1·4.2·4.7)', () => {
  for (const row of TABLE) {
    it(`${row.name}: C=${row.C}, min=${row.min}, ${row.shape}`, () => {
      const a = analyzeFist(synthWorld(row.bend));
      expect(a).not.toBeNull();
      expect(Number(a!.C.toFixed(3))).toBe(row.C);
      expect(Number(a!.minCurl.toFixed(3))).toBe(row.min);
      expect(a!.shape).toBe(row.shape);
    });
  }

  it('임의 3D 회전 200개·크기 0.5배/2배에서 C가 같다(차이 < 1e-9)', () => {
    const rnd = mulberry32(42);
    for (const bend of [0, 0.3, 0.5, 0.7, 1, [0, 1, 1, 1] as const, [0.2, 0.9, 0.4, 0.6] as const]) {
      const base = analyzeFist(synthWorld(bend))!;
      for (let i = 0; i < 200; i++) {
        const R = randomRotation(rnd);
        for (const s of [0.5, 1, 2]) {
          const pts = transform(synthWorld(bend), R, s, { x: rnd(), y: rnd(), z: rnd() });
          // 손목 기준 거리 비이므로 평행 이동도 영향 없음
          const a = analyzeFist(pts)!;
          expect(Math.abs(a.C - base.C)).toBeLessThan(1e-9);
        }
      }
    }
  });

  it('NaN·0 길이는 판정 불가(null)', () => {
    const pts = synthWorld(0);
    const nan = pts.map((p, i) => (i === 8 ? { x: NaN, y: p.y, z: p.z } : p));
    expect(analyzeFist(nan)).toBeNull();
    const zero = pts.map((p, i) => (i === 5 ? { x: 0, y: 0, z: 0 } : p));
    expect(analyzeFist(zero)).toBeNull();
    expect(analyzeFist([])).toBeNull();
    expect(analyzeFist(pts.slice(0, 10))).toBeNull();
  });

  it('분류 경계값', () => {
    expect(classifyShape(0.7, 0.45)).toBe('FIST');
    expect(classifyShape(0.69, 0.9)).toBe('MIDDLE');
    expect(classifyShape(0.9, 0.44)).toBe('MIDDLE');
    expect(classifyShape(0.35, 0)).toBe('OPEN');
    expect(classifyShape(0.36, 0)).toBe('MIDDLE');
  });
});
