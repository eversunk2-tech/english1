// spec 3.5 손 걸러내기, 4.4 여러 손 이어 붙이기, 3.4 커서 평활, 4.3 상태 기계 적용. 순수.
import { HAND } from '../config.ts';
import { analyzeFist, type FistAnalysis } from './fist.ts';
import { initialGesture, stepGesture, type GestureState } from './gestureState.ts';
import { distanceHint, mapToScreen, palmCenter, palmSize, smoothPoint, type DistanceHint } from './mapping.ts';
import type { HandFrame, Point2, Point3, RawHand } from './tracker.ts';

export interface Track {
  id: number;
  gesture: GestureState;
  /** 이번 원시 손바닥 중심(화면 px) */
  raw: Point2;
  /** 평활한 커서 위치(화면 px) */
  pos: Point2;
  offscreen: boolean;
  palm: number;
  lastSeen: number;
  fist: FistAnalysis | null;
  /** 마지막으로 모양이 OPEN이었던 프레임의 커서 위치와 시각(spec 4.5 ②) */
  lastOpenPos: Point2 | null;
  lastOpenT: number;
  /** 화면 px로 옮긴 21점(디버그 그리기용) */
  screenLandmarks: Point2[];
}

export interface GrabEvent {
  trackId: number;
  t: number;
  pos: Point2;
  /** 400ms 이내의 마지막 OPEN 위치(없으면 null) */
  prevOpenPos: Point2 | null;
}

export interface TracksState {
  tracks: Track[];
  nextId: number;
}

export interface TracksUpdate {
  state: TracksState;
  grabs: GrabEvent[];
  hint: DistanceHint;
  /** 이 프레임에서 걸러낸 뒤 남은 손 수 */
  handCount: number;
}

export function initialTracks(): TracksState {
  return { tracks: [], nextId: 1 };
}

export interface SizedHand {
  hand: RawHand;
  palm: number;
}

/** spec 3.5: 너무 작은 손 무시, 가장 큰 손의 0.6배 미만 무시, 큰 순서로 최대 2개 */
export function filterHands(hands: readonly RawHand[], vw: number, vh: number): SizedHand[] {
  const sized = hands
    .map((hand) => ({ hand, palm: palmSize(hand.landmarks, vw, vh) }))
    .filter((h) => Number.isFinite(h.palm) && h.palm >= HAND.PALM_IGNORE);
  if (sized.length === 0) return [];
  const maxPalm = Math.max(...sized.map((h) => h.palm));
  return sized
    .filter((h) => h.palm >= HAND.SECOND_HAND_RATIO * maxPalm)
    .sort((a, b) => b.palm - a.palm)
    .slice(0, HAND.MAX_TRACKS);
}

/** 검출이 LOST_MS 넘게 없는 트랙을 지운다(spec 4.3) */
export function expireTracks(state: TracksState, now: number): TracksState {
  const tracks = state.tracks.filter((tr) => now - tr.lastSeen <= HAND.LOST_MS);
  return tracks.length === state.tracks.length ? state : { ...state, tracks };
}

/** 한 프레임 반영. W·H는 화면(CSS px). mirror는 카메라 거울 모드(기본 true). */
export function updateTracks(
  state: TracksState,
  frame: HandFrame,
  W: number,
  H: number,
  mirror = true,
): TracksUpdate {
  const t = frame.t;
  const { w: vw, h: vh } = frame.videoSize;
  const diag = Math.hypot(W, H);
  let tracks = expireTracks(state, t).tracks.slice();
  let nextId = state.nextId;

  // 거리 안내: 찾은 손 중 가장 큰 손 기준(걸러내기 전)
  let hint: DistanceHint = null;
  if (frame.hands.length > 0) {
    const biggest = Math.max(...frame.hands.map((h) => palmSize(h.landmarks, vw, vh)));
    if (Number.isFinite(biggest)) hint = distanceHint(biggest);
  }

  const kept = filterHands(frame.hands, vw, vh).map((h) => {
    const c = palmCenter(h.hand.landmarks);
    const sp = mapToScreen(c.x, c.y, vw, vh, W, H, { mirror });
    return { ...h, screen: sp };
  });

  // 짝짓기: 거리가 가까운 쌍부터, 0.25·대각선 미만만
  const pairs: { ti: number; hi: number; d: number }[] = [];
  tracks.forEach((tr, ti) => {
    kept.forEach((h, hi) => {
      const d = Math.hypot(tr.raw.x - h.screen.x, tr.raw.y - h.screen.y);
      if (d < HAND.TRACK_MATCH_RATIO * diag) pairs.push({ ti, hi, d });
    });
  });
  pairs.sort((a, b) => a.d - b.d);
  const usedT = new Set<number>();
  const usedH = new Set<number>();
  const assign = new Map<number, number>(); // hand index → track index
  for (const p of pairs) {
    if (usedT.has(p.ti) || usedH.has(p.hi)) continue;
    usedT.add(p.ti);
    usedH.add(p.hi);
    assign.set(p.hi, p.ti);
  }
  kept.forEach((_, hi) => {
    if (assign.has(hi)) return;
    if (tracks.length >= HAND.MAX_TRACKS) return;
    tracks.push({
      id: nextId++,
      gesture: initialGesture(t),
      raw: { x: 0, y: 0 },
      pos: { x: 0, y: 0 },
      offscreen: false,
      palm: 0,
      lastSeen: t,
      fist: null,
      lastOpenPos: null,
      lastOpenT: -Infinity,
      screenLandmarks: [],
    });
    assign.set(hi, tracks.length - 1);
    // 새 트랙은 첫 프레임 평활 없이 시작
    const tr = tracks[tracks.length - 1];
    if (tr) tr.lastSeen = Number.NaN;
  });

  const grabs: GrabEvent[] = [];
  tracks = tracks.map((tr, ti) => {
    let hi = -1;
    for (const [h, tIdx] of assign) if (tIdx === ti) hi = h;
    const h = hi >= 0 ? kept[hi] : undefined;
    if (!h) return tr;
    const isNew = Number.isNaN(tr.lastSeen);
    const raw = { x: h.screen.x, y: h.screen.y };
    const pos = smoothPoint(isNew ? null : tr.pos, raw, diag);
    const fist = analyzeFist(h.hand.worldLandmarks);
    const step = stepGesture(tr.gesture, fist ? fist.shape : null, t, h.screen.offscreen);
    let lastOpenPos = tr.lastOpenPos;
    let lastOpenT = tr.lastOpenT;
    if (step.grab) {
      const prevOpenPos = lastOpenPos && t - lastOpenT <= HAND.PREV_OPEN_LOOKBACK_MS ? lastOpenPos : null;
      grabs.push({ trackId: tr.id, t, pos, prevOpenPos });
    }
    if (fist?.shape === 'OPEN') {
      lastOpenPos = pos;
      lastOpenT = t;
    }
    const screenLandmarks = h.hand.landmarks.map((p: Point3) => {
      const s = mapToScreen(p.x, p.y, vw, vh, W, H, { mirror });
      return { x: s.x, y: s.y };
    });
    return {
      ...tr,
      gesture: step.state,
      raw,
      pos,
      offscreen: h.screen.offscreen,
      palm: h.palm,
      lastSeen: t,
      fist,
      lastOpenPos,
      lastOpenT,
      screenLandmarks,
    };
  });

  return { state: { tracks, nextId }, grabs, hint, handCount: kept.length };
}
