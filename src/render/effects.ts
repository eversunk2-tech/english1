// 입자·흔들림(spec 5.2). 입자는 동시에 120개 이하(spec 10).
import { PERF } from '../config.ts';

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

const COLORS = ['#facc15', '#34d399', '#60a5fa', '#f472b6', '#fb923c'];

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
    for (const p of this.parts) {
      ctx.globalAlpha = Math.max(0, 1 - p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
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

/** 오답 흔들림: 0.3초 동안 좌우로 */
export function shakeOffset(ms: number, durMs: number): number {
  if (ms >= durMs) return 0;
  const k = 1 - ms / durMs;
  return Math.sin(ms / 18) * 10 * k;
}
