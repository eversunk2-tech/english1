// spec 3.3·3.4·3.5: 영상 정규화 좌표 → 화면 좌표(거울 + cover), 손바닥 중심, 손 크기, 커서 평활. 순수 함수.
import { HAND } from '../config.ts';
import type { Point2, Point3 } from './tracker.ts';

export interface ScreenPoint extends Point2 {
  /** cover로 잘려 화면 밖인 점이면 true(좌표는 화면 안으로 자름) */
  offscreen: boolean;
}

export interface MapOptions {
  mirror?: boolean;
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** spec 3.3 변환식 */
export function mapToScreen(
  u: number,
  v: number,
  vw: number,
  vh: number,
  W: number,
  H: number,
  opts: MapOptions = {},
): ScreenPoint {
  const mirror = opts.mirror ?? true;
  const s = Math.max(W / vw, H / vh);
  const dw = vw * s;
  const dh = vh * s;
  const ox = (W - dw) / 2;
  const oy = (H - dh) / 2;
  const x = ox + (mirror ? 1 - u : u) * dw;
  const y = oy + v * dh;
  const offscreen = x < 0 || x > W || y < 0 || y > H;
  return { x: clamp(x, 0, W), y: clamp(y, 0, H), offscreen };
}

const PALM_IDX = [0, 5, 9, 13, 17] as const;

/** spec 3.4: 손바닥 중심 = 평균(0, 5, 9, 13, 17) — 정규화 좌표 */
export function palmCenter(landmarks: readonly Point3[]): Point2 {
  let x = 0;
  let y = 0;
  for (const i of PALM_IDX) {
    const p = landmarks[i];
    if (!p) return { x: NaN, y: NaN };
    x += p.x;
    y += p.y;
  }
  return { x: x / PALM_IDX.length, y: y / PALM_IDX.length };
}

/** spec 3.5: |0 − 9|를 영상 픽셀로 잰 뒤 vh로 나눈 값 */
export function palmSize(landmarks: readonly Point3[], vw: number, vh: number): number {
  const a = landmarks[0];
  const b = landmarks[9];
  if (!a || !b || vh <= 0) return 0;
  const dx = (a.x - b.x) * vw;
  const dy = (a.y - b.y) * vh;
  return Math.hypot(dx, dy) / vh;
}

export type DistanceHint = 'far' | 'close' | null;

/** spec 3.5 거리 안내 */
export function distanceHint(palm: number): DistanceHint {
  if (palm < HAND.PALM_TOO_FAR) return 'far';
  if (palm > HAND.PALM_TOO_CLOSE) return 'close';
  return null;
}

/** spec 3.4: 적응형 지수 이동 평균 α */
export function smoothingAlpha(d: number, diag: number): number {
  if (!(diag > 0)) return HAND.SMOOTH_ALPHA_MAX;
  return clamp(
    HAND.SMOOTH_ALPHA_MIN + d / (HAND.SMOOTH_DIST_RATIO * diag),
    HAND.SMOOTH_ALPHA_MIN,
    HAND.SMOOTH_ALPHA_MAX,
  );
}

/** spec 3.4: q' = q + α (p − q). 첫 프레임(prev 없음)은 p 그대로 */
export function smoothPoint(prev: Point2 | null, p: Point2, diag: number): Point2 {
  if (!prev) return { x: p.x, y: p.y };
  const d = Math.hypot(p.x - prev.x, p.y - prev.y);
  const a = smoothingAlpha(d, diag);
  return { x: prev.x + a * (p.x - prev.x), y: prev.y + a * (p.y - prev.y) };
}
