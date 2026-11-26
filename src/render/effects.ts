// 입자·흔들림(spec 5.2). 입자는 동시에 120개 이하(spec 10).
// v6(spec 17.5-8): 입자 색은 팔레트(노랑·빨강·코발트·초록·종이) + 네모마다 검은 1.5px 테두리. 개수 상한·수명·물리는 그대로.
import { PERF } from '../config.ts';

/**
 * 움직임 줄이기(prefers-reduced-motion: reduce, spec 17.7). 처음 한 번 읽고, 설정이 바뀌면 다시 읽는다.
 * matchMedia가 없는 곳(단위 테스트의 node 등)에서는 false.
 */
let reducedMotionCache: boolean | null = null;
export function reducedMotion(): boolean {
  if (reducedMotionCache !== null) return reducedMotionCache;
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  reducedMotionCache = mq.matches;
  mq.addEventListener?.('change', (e) => {
    reducedMotionCache = e.matches;
  });
  return reducedMotionCache;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
}

const COLORS = ['#ffd400', '#ff4a1c', '#2b4bff', '#2fd27a', '#fffdf7'];
const PARTICLE_EDGE = '#141414';

export class Effects {
  private parts: Particle[] = [];

  burst(x: number, y: number, n = 40): void {
    for (let i = 0; i < n; i++) {
      if (this.parts.length >= PERF.PARTICLES_MAX) this.parts.shift();
      const a = Math.random() * Math.PI * 2;
      const sp = 120 + Math.random() * 320;
      this.parts.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 120,
        life: 0,
        max: 500 + Math.random() * 400,
        color: COLORS[i % COLORS.length] as string,
        size: 4 + Math.random() * 6,
      });
    }
  }

  update(dtMs: number): void {
    const dt = dtMs / 1000;
    for (const p of this.parts) {
      p.life += dtMs;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 700 * dt;
    }
    this.parts = this.parts.filter((p) => p.life < p.max);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.parts.length === 0) return;
    ctx.strokeStyle = PARTICLE_EDGE;
    ctx.lineWidth = 1.5;
    for (const p of this.parts) {
      ctx.globalAlpha = Math.max(0, 1 - p.life / p.max);
      ctx.fillStyle = p.color;
      const x = p.x - p.size / 2;
      const y = p.y - p.size / 2;
      ctx.fillRect(x, y, p.size, p.size);
      ctx.strokeRect(x, y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  get count(): number {
    return this.parts.length;
  }

  clear(): void {
    this.parts = [];
  }
}

/** 오답 흔들림: 0.3초 동안 좌우로. 움직임 줄이기면 진폭 0(✕ 동그라미와 빨강으로 알림, spec 17.7) */
export function shakeOffset(ms: number, durMs: number): number {
  if (ms >= durMs || reducedMotion()) return 0;
  const k = 1 - ms / durMs;
  return Math.sin(ms / 18) * 10 * k;
}
