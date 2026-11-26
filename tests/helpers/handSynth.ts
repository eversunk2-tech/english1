// spec 4.7: 합성 손(테스트용). 21점 worldLandmarks와, 같은 3D 점을 정사영한 화면용 landmarks를 만든다.
import type { HandFrame, Point3, RawHand } from '../../src/hand/tracker.ts';

export type Bend = number | readonly [number, number, number, number];

const DEG = Math.PI / 180;

/** 손가락 (MCP 위치 x,y), 마디 길이(MCP→PIP, PIP→DIP, DIP→TIP) — 검지, 중지, 약지, 새끼 */
const FINGERS: readonly { mcp: [number, number]; len: [number, number, number] }[] = [
  { mcp: [-0.32, 0.95], len: [0.42, 0.25, 0.2] },
  { mcp: [-0.1, 1.0], len: [0.45, 0.28, 0.21] },
  { mcp: [0.12, 0.95], len: [0.42, 0.27, 0.2] },
  { mcp: [0.32, 0.85], len: [0.33, 0.2, 0.18] },
];

/** 손목 원점, 손바닥 평면 = x(가로)·y(위), 손바닥 쪽 = +z. 단위는 비율만 중요. */
export function synthWorld(bend: Bend): Point3[] {
  const ks = typeof bend === 'number' ? [bend, bend, bend, bend] : bend;
  const pts: Point3[] = new Array(21);
  pts[0] = { x: 0, y: 0, z: 0 };
  // 엄지: 손바닥 옆에 대충
  pts[1] = { x: -0.28, y: 0.25, z: 0.08 };
  pts[2] = { x: -0.48, y: 0.42, z: 0.14 };
  pts[3] = { x: -0.6, y: 0.6, z: 0.2 };
  pts[4] = { x: -0.68, y: 0.76, z: 0.24 };
  FINGERS.forEach((f, i) => {
    const k = ks[i] ?? 0;
    const base = 5 + i * 4;
    const angles = [90 * k, 100 * k, 60 * k];
    let p: Point3 = { x: f.mcp[0], y: f.mcp[1], z: 0 };
    pts[base] = p;
    let theta = 0;
    for (let j = 0; j < 3; j++) {
      theta += (angles[j] ?? 0) * DEG;
      const L = f.len[j] ?? 0;
      p = { x: p.x, y: p.y + L * Math.cos(theta), z: p.z + L * Math.sin(theta) };
      pts[base + j + 1] = p;
    }
  });
  return pts;
}

export type Mat3 = [number, number, number, number, number, number, number, number, number];

/** 무작위 회전 행렬(단위 사원수) */
export function randomRotation(rnd: () => number): Mat3 {
  let x = 0;
  let y = 0;
  let z = 0;
  let w = 0;
  let n = 0;
  do {
    x = rnd() * 2 - 1;
    y = rnd() * 2 - 1;
    z = rnd() * 2 - 1;
    w = rnd() * 2 - 1;
    n = Math.hypot(x, y, z, w);
  } while (n < 1e-3 || n > 1);
  x /= n;
  y /= n;
  z /= n;
  w /= n;
  return [
    1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w),
    2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w),
    2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y),
  ];
}

export function transform(pts: readonly Point3[], R: Mat3 | null, scale = 1, offset: Point3 = { x: 0, y: 0, z: 0 }): Point3[] {
  return pts.map((p) => {
    const q = R
      ? {
          x: R[0] * p.x + R[1] * p.y + R[2] * p.z,
          y: R[3] * p.x + R[4] * p.y + R[5] * p.z,
          z: R[6] * p.x + R[7] * p.y + R[8] * p.z,
        }
      : p;
    return { x: q.x * scale + offset.x, y: q.y * scale + offset.y, z: q.z * scale + offset.z };
  });
}

export interface SynthHandOptions {
  bend: Bend;
  /** 손바닥 중심(0,5,9,13,17 평균)의 정규화 영상 좌표 */
  u: number;
  v: number;
  /** 손 크기: |0−9|(영상 px) / vh (spec 3.5의 palm 값) */
  palm?: number;
  videoW?: number;
  videoH?: number;
}

const PALM_IDX = [0, 5, 9, 13, 17];

/** 화면용 landmarks(정사영) + worldLandmarks(미터 비슷한 크기) */
export function synthHand(o: SynthHandOptions): RawHand {
  const vw = o.videoW ?? 640;
  const vh = o.videoH ?? 480;
  const palm = o.palm ?? 0.08;
  const world = synthWorld(o.bend);
  const d09 = Math.hypot(world[9]!.x - world[0]!.x, world[9]!.y - world[0]!.y);
  const s = palm / d09; // 손 단위 → vh 정규화
  const pcx = PALM_IDX.reduce((a, i) => a + world[i]!.x, 0) / PALM_IDX.length;
  const pcy = PALM_IDX.reduce((a, i) => a + world[i]!.y, 0) / PALM_IDX.length;
  const landmarks = world.map((p) => ({
    x: o.u + ((p.x - pcx) * s * vh) / vw,
    y: o.v - (p.y - pcy) * s,
    z: -p.z * s,
  }));
  const worldLandmarks = transform(world, null, 0.08);
  return { landmarks, worldLandmarks };
}

/** 한 손짜리(또는 손 없는) 프레임 */
export function frame(t: number, hands: RawHand[], videoW = 640, videoH = 480): HandFrame {
  return { t, hands, videoSize: { w: videoW, h: videoH } };
}
