// ?debug=1: 21점 뼈대(캔버스), 손가락별 c_f·C·상태, fps(그리기·인식), 검사 ms, 영상 크기, delegate.
import type { Track } from '../hand/handTracks.ts';
import type { MediapipeStats } from '../hand/mediapipeSource.ts';
import { drawSkeleton, trackColor } from '../render/canvasRenderer.ts';
import { VOICE_QUALITY_HINT } from '../ui/strings.ts';
import type { BagName } from '../game/bag.ts';

/** v8 디버그 더미 줄(spec 5.6.1 ⑨): `문제 더미: 5-6 57/87 남음`, "모두"는 ` · `로 이어 붙임, seed 모드면 ` · 저장 안 함` */
export function bagDebugLine(info: {
  names: readonly BagName[];
  remaining: Readonly<Record<BagName, number>>;
  sizes: Readonly<Record<BagName, number>>;
  persist: boolean;
}): string {
  const parts = info.names.map((n) => `${n} ${info.remaining[n]}/${info.sizes[n]}`).join(' · ');
  return `문제 더미: ${parts} 남음${info.persist ? '' : ' · 저장 안 함'}`;
}

export class DebugOverlay {
  private readonly panel: HTMLElement;
  private frameTimes: number[] = [];

  constructor(parent: HTMLElement) {
    this.panel = document.createElement('pre');
    this.panel.className = 'debug-panel';
    this.panel.id = 'debug-panel';
    this.panel.setAttribute('data-ui', '');
    parent.append(this.panel);
  }

  /** 그리기 fps(최근 1초 프레임 수) */
  tickFrame(now: number): number {
    this.frameTimes.push(now);
    while (this.frameTimes.length > 0 && (this.frameTimes[0] ?? 0) < now - 1000) this.frameTimes.shift();
    return this.frameTimes.length;
  }

  drawTracks(ctx: CanvasRenderingContext2D, tracks: readonly Track[]): void {
    for (const t of tracks) drawSkeleton(ctx, t.screenLandmarks, trackColor(t.id));
  }

  update(info: {
    renderFps: number;
    mp: MediapipeStats | null;
    tracks: readonly Track[];
    mode: string;
    screen: string;
    blocked: number;
    /** v5: 고른 영어 목소리(spec 5.9.1) — v7: 등급 A/N/G/B/C/D, wait/skip, ` · 인터넷 목소리 끔` */
    voice: string;
    /** v7(5.9.1 디버그·5.9.3): 애플 기기 안 보통 목소리면 고품질 목소리 안내 한 줄 */
    voiceHint?: boolean;
    /** v8: 섞은 카드 더미 요약(spec 5.6.1 ⑨) */
    bag?: Parameters<typeof bagDebugLine>[0];
  }): void {
    const lines: string[] = [];
    lines.push(`screen ${info.screen}  input ${info.mode}  draw ${info.renderFps} fps`);
    if (info.mp) {
      const m = info.mp;
      lines.push(
        `detect ${m.detectHz} Hz  ${m.avgDetectMs.toFixed(1)} ms  n=${m.detectCount}  ${m.delegate}${m.skipping ? ' (1/2)' : ''}`,
      );
      lines.push(`video ${m.videoW}×${m.videoH}${m.lastError ? `  err ${m.lastError.slice(0, 60)}` : ''}`);
    }
    lines.push(`blocked external requests ${info.blocked}`);
    lines.push(`voice ${info.voice}`);
    if (info.voiceHint) lines.push(VOICE_QUALITY_HINT);
    if (info.bag) lines.push(bagDebugLine(info.bag));
    for (const t of info.tracks) {
      const f = t.fist;
      const cs = f ? f.curls.map((c) => c.toFixed(2)).join(' ') : '-';
      lines.push(
        `#${t.id} ${t.gesture.confirmed.padEnd(6)} C=${f ? f.C.toFixed(2) : '-'} [${cs}] palm=${t.palm.toFixed(3)}${t.offscreen ? ' OFF' : ''}`,
      );
    }
    this.panel.textContent = lines.join('\n');
  }
}
