// spec 8.1: 녹화·합성한 HandFrame 배열을 시각에 맞춰 돌려준다(검증용). 4절 판정을 그대로 탄다.
import type { HandFrame, HandSource } from './tracker.ts';

export class ReplaySource implements HandSource {
  readonly kind = 'replay' as const;
  private frames: HandFrame[] = [];
  private i = 0;
  private t0 = 0;
  private startAt: number | null = null;

  async start(): Promise<void> {
    // 파일이 없으니 준비할 것이 없다
  }

  /** 프레임을 넣는다. 첫 프레임은 now에 맞춘다(프레임의 t는 서로의 간격만 쓴다). */
  load(frames: readonly HandFrame[], now: number): void {
    this.frames = frames.slice().sort((a, b) => a.t - b.t);
    this.i = 0;
    this.t0 = this.frames[0]?.t ?? 0;
    this.startAt = now;
  }

  /** 아직 돌려주지 않은 프레임 중 시각이 된 것을 하나 돌려준다(여러 개면 불러 쓰는 쪽이 되풀이해 부른다) */
  poll(now: number): HandFrame | null {
    if (this.startAt === null) return null;
    const f = this.frames[this.i];
    if (!f) return null;
    const at = this.startAt + (f.t - this.t0);
    if (at > now) return null;
    this.i += 1;
    return { t: at, hands: f.hands, videoSize: f.videoSize };
  }

  get remaining(): number {
    return this.frames.length - this.i;
  }

  stop(): void {
    this.frames = [];
    this.i = 0;
    this.startAt = null;
  }
}
