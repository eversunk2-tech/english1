// 카드·커서·겨냥 빛·입자 그리기(spec 4.5, 5.2). 카드는 stage 캔버스(설명 띠 아래 층),
// 커서는 맨 위 cursor 캔버스(pointer-events 없음)에 그린다.
import { GAME, PERF } from '../config.ts';
import type { Rect, Viewport } from '../game/types.ts';
import { cardFontSize } from '../game/layout.ts';
import type { Point2 } from '../hand/tracker.ts';
import { shakeOffset } from './effects.ts';

export const FONT_STACK = 'system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';

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

const TRACK_COLORS = ['#facc15', '#38bdf8'];

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

/** 카드 글자 폭 재기(캔버스) */
export function makeMeasure(ctx: CanvasRenderingContext2D): (text: string, px: number) => number {
  return (text, px) => {
    ctx.font = `800 ${px}px ${FONT_STACK}`;
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

export function drawCards(ctx: CanvasRenderingContext2D, cards: readonly DrawCard[]): void {
  for (const c of cards) {
    if (c.status === 'gone') continue;
    let alpha = 1;
    let dx = 0;
    let border = '#1e3a8a';
    let bg = '#ffffff';
    let fg = '#0f1f4d';
    let lw = 5;
    if (c.status === 'fading') alpha = Math.max(0, 1 - c.statusMs / GAME.FADE_MS);
    if (c.status === 'wrong') {
      dx = shakeOffset(c.statusMs, GAME.WRONG_SHAKE_MS);
      border = '#dc2626';
      bg = '#fee2e2';
      fg = '#991b1b';
    }
    if (c.status === 'caught') {
      border = '#16a34a';
      bg = '#dcfce7';
      fg = '#14532d';
      lw = 7;
    }
    const r: Rect = { x: c.rect.x + dx, y: c.rect.y, w: c.rect.w, h: c.rect.h };
    ctx.globalAlpha = alpha;
    if (c.aimed && c.status === 'falling') {
      // 겨냥 빛: 바깥 테두리(그림자 블러 대신 두꺼운 선)
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.9)';
      ctx.lineWidth = 10;
      roundRect(ctx, { x: r.x - 6, y: r.y - 6, w: r.w + 12, h: r.h + 12 }, 20);
      ctx.stroke();
    }
    ctx.fillStyle = bg;
    roundRect(ctx, r, 16);
    ctx.fill();
    ctx.strokeStyle = border;
    ctx.lineWidth = lw;
    ctx.stroke();
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const px = cachedCardFontSize(ctx, c.word, r.w, r.h);
    if (c.status === 'caught') {
      ctx.font = `800 ${Math.round(px * 0.85)}px ${FONT_STACK}`;
      ctx.fillText(c.word, r.x + r.w / 2, r.y + r.h * 0.36);
      ctx.font = `700 ${Math.max(16, Math.round(px * 0.6))}px ${FONT_STACK}`;
      ctx.fillText(c.ko, r.x + r.w / 2, r.y + r.h * 0.74, r.w - 16);
    } else {
      ctx.font = `800 ${px}px ${FONT_STACK}`;
      ctx.fillText(c.word, r.x + r.w / 2, r.y + r.h / 2);
    }
  }
  ctx.globalAlpha = 1;
}

function drawOpenHand(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.beginPath();
  ctx.arc(x, y + s * 0.15, s * 0.32, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 4; i++) {
    const fx = x - s * 0.27 + i * s * 0.18;
    ctx.fillRect(fx - s * 0.06, y - s * 0.55, s * 0.12, s * 0.5);
  }
  ctx.save();
  ctx.translate(x + s * 0.3, y + s * 0.05);
  ctx.rotate(-0.7);
  ctx.fillRect(-s * 0.06, -s * 0.3, s * 0.12, s * 0.32);
  ctx.restore();
}

function drawFist(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  roundRect(ctx, { x: x - s * 0.36, y: y - s * 0.3, w: s * 0.72, h: s * 0.6 }, s * 0.18);
  ctx.fill();
}

export function drawCursors(ctx: CanvasRenderingContext2D, cursors: readonly DrawCursor[]): void {
  for (const c of cursors) {
    const color = TRACK_COLORS[(c.id - 1) % TRACK_COLORS.length] ?? '#facc15';
    const R = 30;
    ctx.globalAlpha = c.offscreen ? 0.35 : 1;
    // 바탕 고리
    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.55)';
    ctx.beginPath();
    ctx.arc(c.pos.x, c.pos.y, R, 0, Math.PI * 2);
    ctx.stroke();
    // C만큼 차오르는 고리
    if (c.C > 0.01) {
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.arc(c.pos.x, c.pos.y, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, c.C));
      ctx.stroke();
    }
    ctx.fillStyle = color;
    if (c.closed) drawFist(ctx, c.pos.x, c.pos.y, 34);
    else drawOpenHand(ctx, c.pos.x, c.pos.y, 34);
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(c.pos.x, c.pos.y, R + 5, 0, Math.PI * 2);
    ctx.stroke();
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
  return TRACK_COLORS[(id - 1) % TRACK_COLORS.length] ?? '#facc15';
}
