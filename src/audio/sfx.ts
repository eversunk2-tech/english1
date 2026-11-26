// spec 5.9: Web Audio로 짧게 합성한 효과음(파일 없음).

type Ctx = AudioContext;

export class Sfx {
  private ctx: Ctx | null = null;
  enabled = true;

  /** 첫 터치 때 부른다(AudioContext.resume) */
  prime(): void {
    try {
      if (!this.ctx) {
        const AC =
          window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => undefined);
    } catch {
      this.ctx = null;
    }
  }

  private tone(freq: number, startOffset: number, dur: number, type: OscillatorType, gain: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.enabled) return;
    try {
      const t0 = ctx.currentTime + startOffset;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch {
      // 소리 실패는 무시
    }
  }

  grab(): void {
    this.tone(1400, 0, 0.05, 'square', 0.08);
  }

  correct(): void {
    this.tone(660, 0, 0.14, 'triangle', 0.25);
    this.tone(990, 0.12, 0.22, 'triangle', 0.25);
  }

  wrong(): void {
    this.tone(180, 0, 0.25, 'sawtooth', 0.12);
  }

  countdown(last: boolean): void {
    this.tone(last ? 880 : 520, 0, 0.12, 'sine', 0.2);
  }
}
