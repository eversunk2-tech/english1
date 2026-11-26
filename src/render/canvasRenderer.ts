// 카드·커서·겨냥 빛·입자 그리기(spec 4.5, 5.2). 카드는 stage 캔버스(설명 띠 아래 층),
// 커서는 맨 위 cursor 캔버스(pointer-events 없음)에 그린다.
import { GAME, PERF } from '../config.ts';
import type { Rect, Viewport } from '../game/types.ts';
import { cardFontSize } from '../game/layout.ts';
import type { Point2 } from '../hand/tracker.ts';
import { reducedMotion, shakeOffset } from './effects.ts';

/** 캔버스 글꼴 — styles.css `--font`과 같은 시스템 글꼴 스택(외부 글꼴 없음, spec 17.4) */
export const FONT_STACK = 'system-ui, -apple-system, "Segoe UI", Roboto, "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif';
/** 낱말 카드 글자 굵기 — 글자 폭 재기(makeMeasure)와 그리기가 같은 값을 써야 E6 "글자 폭 ≤ 카드 폭 − 24"가 실제 그림과 맞는다(spec 17.5-5) */
export const CARD_FONT_WEIGHT = 900;

/** v6 색(spec 17.3 — styles.css 토큰과 같은 값) */
const INK = '#141414';
const PAPER2 = '#fffdf7';
const YELLOW = '#ffd400';
const RED = '#ff4a1c';
const GREEN = '#2fd27a';
const CARD_RADIUS = 10;
const CARD_LINE = 4;
/** 정답 카드 팝: 1 → 1.08 → 1 (160ms) */
const CAUGHT_POP_MS = 160;
const CAUGHT_POP_SCALE = 0.08;
/** 오답 카드 기울임(흔들리는 동안) */
const WRONG_TILT_RAD = (-3 * Math.PI) / 180;

export interface DrawCard {
  id: number;
  word: string;
  ko: string;
  rect: Rect;
  status: 'falling' | 'wrong' | 'caught' | 'fading' | 'gone';
  statusMs: number;
  aimed: boolean;
}

export interface DrawCursor {
  id: number;
  pos: Point2;
  /** 쥠 점수 0~1(터치 커서는 0) */
  C: number;
  closed: boolean;
  offscreen: boolean;
}

/** 손 색 1·2(spec 17.5-6) */
const TRACK_COLORS = ['#ffd400', '#7fd4ff'];

function roundRect(ctx: CanvasRenderingContext2D, r: Rect, rad: number): void {
  const rr = Math.min(rad, r.w / 2, r.h / 2);
  ctx.beginPath();
  ctx.moveTo(r.x + rr, r.y);
  ctx.arcTo(r.x + r.w, r.y, r.x + r.w, r.y + r.h, rr);
  ctx.arcTo(r.x + r.w, r.y + r.h, r.x, r.y + r.h, rr);
  ctx.arcTo(r.x, r.y + r.h, r.x, r.y, rr);
  ctx.arcTo(r.x, r.y, r.x + r.w, r.y, rr);
  ctx.closePath();
}

export class CanvasLayer {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  W = 0;
  H = 0;
  dpr = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2d context unavailable');
    this.ctx = ctx;
  }

  resize(vp: Viewport): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, PERF.DPR_MAX);
    this.W = vp.W;
    this.H = vp.H;
    this.canvas.style.width = `${vp.W}px`;
    this.canvas.style.height = `${vp.H}px`;
    this.canvas.width = Math.round(vp.W * this.dpr);
    this.canvas.height = Math.round(vp.H * this.dpr);
  }

  clear(): void {
    const c = this.ctx;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, this.W, this.H);
  }
}

/** 낱말 카드 글꼴 문자열(재기·그리기 공용) */
export function cardFont(px: number, weight: number = CARD_FONT_WEIGHT): string {
  return `${weight} ${px}px ${FONT_STACK}`;
}

/** 카드 글자 폭 재기(캔버스) */
export function makeMeasure(ctx: CanvasRenderingContext2D): (text: string, px: number) => number {
  return (text, px) => {
    ctx.font = cardFont(px);
    return ctx.measureText(text).width;
  };
}

/**
 * 카드 글자 크기를 (단어, 카드 너비, 카드 높이)별로 저장해 다시 쓴다 — 매 프레임 measureText를 되풀이하지 않게(review R7).
 * 화면 크기가 바뀌면 키가 달라져 새로 잰다. 너무 커지면 비운다.
 */
const fontCache = new Map<string, number>();
const FONT_CACHE_MAX = 400;

export function cachedCardFontSize(ctx: CanvasRenderingContext2D, word: string, cardW: number, cardH: number): number {
  const key = `${word}|${cardW.toFixed(2)}|${cardH.toFixed(2)}`;
  const hit = fontCache.get(key);
  if (hit !== undefined) return hit;
  const px = cardFontSize(word, cardW, cardH, makeMeasure(ctx));
  if (fontCache.size >= FONT_CACHE_MAX) fontCache.clear();
  fontCache.set(key, px);
  return px;
}

/** 바깥으로 d만큼 넓힌 사각형 */
function grow(r: Rect, d: number): Rect {
  return { x: r.x - d, y: r.y - d, w: r.w + 2 * d, h: r.h + 2 * d };
}

/** 카드 오른쪽 위 동그라미(정답 ✓ 노랑, 오답 ✕ 종이) — 색만으로 구분하지 않게(spec 17.7) */
function drawBadge(ctx: CanvasRenderingContext2D, cx: number, cy: number, kind: 'check' | 'cross'): void {
  ctx.beginPath();
  ctx.arc(cx, cy, 15.5, 0, Math.PI * 2);
  ctx.fillStyle = kind === 'check' ? YELLOW : PAPER2;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.beginPath();
  if (kind === 'check') {
    ctx.moveTo(cx - 6.5, cy + 0.5);
    ctx.lineTo(cx - 2, cy + 5);
    ctx.lineTo(cx + 7, cy - 5);
  } else {
    ctx.moveTo(cx - 5.5, cy - 5.5);
    ctx.lineTo(cx + 5.5, cy + 5.5);
    ctx.moveTo(cx + 5.5, cy - 5.5);
    ctx.lineTo(cx - 5.5, cy + 5.5);
  }
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
}

/**
 * 낱말 카드(spec 17.5-5, v6): 종이 몸통 → 4px 검은 테두리(카드 사각형 안쪽) → 검은 900 글자.
 * 사용자 결정(2026-11-27, "떨어지는 단어들은 그림자 없이"): 하드 섀도를 그리지 않고, 겨냥돼도 떠오르지 않고 제자리에 그린다
 * — 그린 자리 = 판정 사각형. 크기·위치·글자 크기 식·판정 사각형은 그대로.
 */
export function drawCards(ctx: CanvasRenderingContext2D, cards: readonly DrawCard[]): void {
  const still = reducedMotion();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const c of cards) {
    if (c.status === 'gone') continue;
    let alpha = 1;
    let dx = 0;
    let bg = PAPER2;
    let tilt = 0;
    let scale = 1;
    if (c.status === 'fading') alpha = Math.max(0, 1 - c.statusMs / GAME.FADE_MS);
    if (c.status === 'wrong') {
      bg = RED;
      dx = shakeOffset(c.statusMs, GAME.WRONG_SHAKE_MS);
      if (!still && c.statusMs < GAME.WRONG_SHAKE_MS) tilt = WRONG_TILT_RAD;
    }
    if (c.status === 'caught') {
      bg = GREEN;
      if (!still && c.statusMs < CAUGHT_POP_MS) scale = 1 + CAUGHT_POP_SCALE * Math.sin((Math.PI * c.statusMs) / CAUGHT_POP_MS);
    }
    const r: Rect = { x: c.rect.x + dx, y: c.rect.y, w: c.rect.w, h: c.rect.h };
    const px = cachedCardFontSize(ctx, c.word, c.rect.w, c.rect.h);
    const transformed = tilt !== 0 || scale !== 1;
    if (transformed) {
      // 카드 가운데를 축으로 기울이기·팝(그리기만 — 판정 사각형은 그대로)
      ctx.save();
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;
      ctx.translate(cx, cy);
      if (tilt !== 0) ctx.rotate(tilt);
      if (scale !== 1) ctx.scale(scale, scale);
      ctx.translate(-cx, -cy);
    }
    ctx.globalAlpha = alpha;
    if (c.aimed && c.status === 'falling') {
      // 겨냥: 바깥에 노란 7px 고리 + 그 바깥 검은 3px 선(밝은 배경에서도 보이게). 흐림 없는 선만.
      ctx.lineWidth = 3;
      ctx.strokeStyle = INK;
      roundRect(ctx, grow(r, 8.5), CARD_RADIUS + 8.5);
      ctx.stroke();
      ctx.lineWidth = 7;
      ctx.strokeStyle = YELLOW;
      roundRect(ctx, grow(r, 3.5), CARD_RADIUS + 3.5);
      ctx.stroke();
    }
    // 몸통 → 테두리(선 굵기의 절반만큼 안으로 — 테두리가 카드 사각형 안에 들게)
    ctx.fillStyle = bg;
    roundRect(ctx, r, CARD_RADIUS);
    ctx.fill();
    ctx.lineWidth = CARD_LINE;
    ctx.strokeStyle = INK;
    roundRect(ctx, grow(r, -CARD_LINE / 2), CARD_RADIUS - CARD_LINE / 2);
    ctx.stroke();
    ctx.fillStyle = INK;
    if (c.status === 'caught') {
      // 윗부분 22%에 흰 광택 띠
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      roundRect(ctx, { x: r.x + 8, y: r.y + 5, w: r.w - 16, h: r.h * 0.22 }, 6);
      ctx.fill();
      ctx.fillStyle = INK;
      ctx.font = cardFont(Math.round(px * 0.85));
      ctx.fillText(c.word, r.x + r.w / 2, r.y + r.h * 0.36);
      ctx.font = cardFont(Math.max(16, Math.round(px * 0.6)), 800);
      ctx.fillText(c.ko, r.x + r.w / 2, r.y + r.h * 0.74, r.w - 16);
      drawBadge(ctx, r.x + r.w - 3, r.y + 1, 'check');
    } else {
      ctx.font = cardFont(px);
      ctx.fillText(c.word, r.x + r.w / 2, r.y + r.h / 2);
      if (c.status === 'wrong') drawBadge(ctx, r.x + r.w - 3, r.y + 1, 'cross');
    }
    if (transformed) ctx.restore();
  }
  ctx.globalAlpha = 1;
}

/** 커서 손 모양(spec 17.5-6): 둥근 장갑(편 손) / 둥근 네모 + 마디 선 3개(쥔 손). 좌표는 커서 가운데 기준, 1.25배로 그린다. */
const OPEN_HAND_D =
  'M-11 4 v-12 a3 3 0 0 1 6 0 v6 v-11 a3 3 0 0 1 6 0 v11 v-9 a3 3 0 0 1 6 0 v10 v-6 a3 3 0 0 1 6 0 v10 a12 12 0 0 1 -12 12 h-2 a10 10 0 0 1 -9 -6 l-5 -8 a3 3 0 0 1 5 -3 z';
let openHandPath: Path2D | null = null;
const HAND_SCALE = 1.25;

function drawHand(ctx: CanvasRenderingContext2D, x: number, y: number, closed: boolean, color: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(HAND_SCALE, HAND_SCALE);
  ctx.fillStyle = color;
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'round';
  if (closed) {
    roundRect(ctx, { x: -13, y: -11, w: 26, h: 22 }, 7);
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.beginPath();
    for (const kx of [-5, 1, 7]) {
      ctx.moveTo(kx, -11);
      ctx.lineTo(kx, -3);
    }
    ctx.lineWidth = 2;
    ctx.stroke();
  } else {
    if (!openHandPath) openHandPath = new Path2D(OPEN_HAND_D);
    ctx.translate(-1, -2);
    ctx.fill(openHandPath);
    ctx.lineWidth = 2.5;
    ctx.stroke(openHandPath);
  }
  ctx.restore();
}

/**
 * 손 커서(spec 17.5-6): 반지름 30px. 바깥 검은 12px 고리 → 안쪽 종이 6px 고리 → 쥠 정도(C)만큼 손 색 6px 호(위에서 시계 방향).
 * 검은 고리 + 흰 고리 두 겹이라 어떤 배경에서도 보인다. 화면 밖이면 투명도 0.35.
 */
export function drawCursors(ctx: CanvasRenderingContext2D, cursors: readonly DrawCursor[]): void {
  for (const c of cursors) {
    const color = trackColor(c.id);
    const R = 30;
    ctx.globalAlpha = c.offscreen ? 0.35 : 1;
    ctx.beginPath();
    ctx.arc(c.pos.x, c.pos.y, R, 0, Math.PI * 2);
    ctx.lineWidth = 12;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.lineWidth = 6;
    ctx.strokeStyle = PAPER2;
    ctx.stroke();
    if (c.C > 0.01) {
      ctx.strokeStyle = color;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(c.pos.x, c.pos.y, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, c.C));
      ctx.stroke();
      ctx.lineCap = 'butt';
    }
    drawHand(ctx, c.pos.x, c.pos.y, c.closed, color);
  }
  ctx.globalAlpha = 1;
}

/** 디버그: 21점 뼈대 */
const BONES: readonly (readonly [number, number])[] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
];

export function drawSkeleton(ctx: CanvasRenderingContext2D, pts: readonly Point2[], color: string): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  for (const [a, b] of BONES) {
    const p = pts[a];
    const q = pts[b];
    if (!p || !q) continue;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
    ctx.stroke();
  }
  ctx.fillStyle = '#ffffff';
  for (const p of pts) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function trackColor(id: number): string {
  return TRACK_COLORS[(id - 1) % TRACK_COLORS.length] ?? YELLOW;
}
