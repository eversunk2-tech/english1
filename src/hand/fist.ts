// spec 4.1·4.2: 네 손가락 굽힘 → 쥠 점수 C, 한 프레임 모양 분류. 순수 함수.
import { HAND } from '../config.ts';
import type { Point3 } from './tracker.ts';

/** (MCP, TIP): 검지, 중지, 약지, 새끼 */
export const FINGERS: readonly (readonly [number, number])[] = [
  [5, 8],
  [9, 12],
  [13, 16],
  [17, 20],
];

export type Shape = 'FIST' | 'OPEN' | 'MIDDLE';

export interface FistAnalysis {
  /** 손가락별 굽힘 0(폄)~1(굽힘): 검지, 중지, 약지, 새끼 */
  curls: [number, number, number, number];
  C: number;
  minCurl: number;
  shape: Shape;
}

function dist(a: Point3, b: Point3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/** 판정 불가면 null(spec 4.1: MCP 거리 < 1e-4 또는 NaN) */
export function analyzeFist(world: readonly Point3[]): FistAnalysis | null {
  const w = world[0];
  if (!w) return null;
  const curls: number[] = [];
  for (const [mcpI, tipI] of FINGERS) {
    const mcp = world[mcpI];
    const tip = world[tipI];
    if (!mcp || !tip) return null;
    const base = dist(mcp, w);
    const reach = dist(tip, w);
    if (!Number.isFinite(base) || !Number.isFinite(reach) || base < 1e-4) return null;
    const R = reach / base;
    const c = Math.min(1, Math.max(0, (HAND.R_OPEN - R) / (HAND.R_OPEN - HAND.R_FIST)));
    if (!Number.isFinite(c)) return null;
    curls.push(c);
  }
  const C = curls.reduce((a, b) => a + b, 0) / curls.length;
  const minCurl = Math.min(...curls);
  return {
    curls: curls as [number, number, number, number],
    C,
    minCurl,
    shape: classifyShape(C, minCurl),
  };
}

/** spec 4.2 */
export function classifyShape(C: number, minCurl: number): Shape {
  if (C >= HAND.FIST_ENTER && minCurl >= HAND.FIST_MIN_FINGER) return 'FIST';
  if (C <= HAND.OPEN_EXIT) return 'OPEN';
  return 'MIDDLE';
}
