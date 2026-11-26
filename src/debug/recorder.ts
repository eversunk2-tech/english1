// ?debug=1&record=1: 손 좌표만 JSON으로 기기에 내려받는다(영상 아님, spec 9·12.3). 사용자가 버튼을 눌러야만 만든다.
import type { HandFrame } from '../hand/tracker.ts';
import { S } from '../ui/strings.ts';

export class Recorder {
  private frames: HandFrame[] = [];
  private recording = false;
  private readonly btn: HTMLButtonElement;

  constructor(parent: HTMLElement) {
    this.btn = document.createElement('button');
    this.btn.type = 'button';
    this.btn.className = 'btn btn-ghost debug-record';
    this.btn.id = 'debug-record';
    this.btn.setAttribute('data-ui', '');
    this.btn.textContent = S.debugRecord;
    this.btn.addEventListener('click', () => this.toggle());
    parent.append(this.btn);
  }

  add(f: HandFrame): void {
    if (!this.recording) return;
    this.frames.push({
      t: f.t,
      videoSize: f.videoSize,
      hands: f.hands.map((h) => ({
        landmarks: h.landmarks.map((p) => ({ x: p.x, y: p.y, z: p.z })),
        worldLandmarks: h.worldLandmarks.map((p) => ({ x: p.x, y: p.y, z: p.z })),
      })),
    });
  }

  private toggle(): void {
    if (!this.recording) {
      this.frames = [];
      this.recording = true;
      this.btn.textContent = S.debugStop;
      return;
    }
    this.recording = false;
    this.btn.textContent = S.debugRecord;
    const blob = new Blob([JSON.stringify(this.frames)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hand-replay-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.append(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}
