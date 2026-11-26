// spec 5.4: 설명 띠·놀이 영역·카드 칸(lane)·카드 크기·세로 위치. 순수.
import { LAYOUT } from '../config.ts';
import { shuffle, type Rng } from './rng.ts';
import type { Rect, Viewport } from './types.ts';

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** 설명 띠 높이 bandH = clamp(0.16·H, 88, 150) */
export function bandHeight(H: number): number {
  return clamp(LAYOUT.BAND_RATIO * H, LAYOUT.BAND_MIN, LAYOUT.BAND_MAX);
}

export interface CardMetrics {
  bandH: number;
  playH: number;
  left: number;
  right: number;
  laneW: number;
  cardW: number;
  cardH: number;
}

export function cardMetrics(vp: Viewport, n: number): CardMetrics {
  const { W, H } = vp;
  const bandH = bandHeight(H);
  const left = LAYOUT.LANE_LEFT * W;
  const right = LAYOUT.LANE_RIGHT * W;
  const laneW = (right - left) / Math.max(1, n);
  const cardW = Math.min(laneW - LAYOUT.LANE_GAP_PX, LAYOUT.CARD_MAX_W_RATIO * W, LAYOUT.CARD_MAX_W_PX);
  const cardH = Math.max(LAYOUT.CARD_H_MIN, Math.min(LAYOUT.CARD_H_RATIO * H, LAYOUT.CARD_H_MAX));
  return { bandH, playH: H - bandH, left, right, laneW, cardW, cardH };
}

export interface CardPlacement {
  lane: number;
  /** 중심 x / W — 화면 크기가 바뀌어도 유지 */
  xFrac: number;
}

/** 카드 n장을 칸에 무작위로 짝짓고 칸 안에서 ±0.6·(laneW−cardW)/2 흔든다 */
export function placeCards(n: number, vp: Viewport, rng: Rng): CardPlacement[] {
  const m = cardMetrics(vp, n);
  const lanes = shuffle(
    rng,
    Array.from({ length: n }, (_, i) => i),
  );
  return lanes.map((lane) => {
    const j = rng() * 2 - 1;
    const cx = m.left + (lane + 0.5) * m.laneW + j * LAYOUT.JITTER * ((m.laneW - m.cardW) / 2);
    return { lane, xFrac: cx / vp.W };
  });
}

/**
 * 카드 사각형. 세로: top = bandH − cardH + p·(playH + cardH).
 * 가로: 중심 = xFrac·W를 그 칸 안으로 자른다(화면이 바뀌어도 카드끼리 겹치지 않게).
 */
export function cardRect(pl: CardPlacement, p: number, vp: Viewport, n: number): Rect {
  const m = cardMetrics(vp, n);
  const laneL = m.left + pl.lane * m.laneW;
  const laneR = laneL + m.laneW;
  const cx = clamp(pl.xFrac * vp.W, laneL + m.cardW / 2, laneR - m.cardW / 2);
  const top = m.bandH - m.cardH + p * (m.playH + m.cardH);
  return { x: cx - m.cardW / 2, y: top, w: m.cardW, h: m.cardH };
}

/**
 * 카드 글자 크기: 0.48·cardH에서 시작해 (카드 너비 − 24px)에 들어갈 때까지 줄인다(최소 18px).
 * measure(text, px)는 그 크기에서의 글자 폭을 돌려준다(캔버스 measureText 등).
 */
export function cardFontSize(
  text: string,
  cardW: number,
  cardH: number,
  measure: (text: string, px: number) => number,
): number {
  const maxW = cardW - LAYOUT.TEXT_PAD_PX;
  let px = Math.floor(LAYOUT.FONT_RATIO * cardH);
  while (px > LAYOUT.FONT_MIN_PX && measure(text, px) > maxW) px -= 1;
  return Math.max(LAYOUT.FONT_MIN_PX, px);
}

