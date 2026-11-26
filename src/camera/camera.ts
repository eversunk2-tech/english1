// spec 3.1: 카메라 열기·닫기. 오류는 이름이 붙은 채로 던진다(errors.ts가 분류).
import { PERF } from '../config.ts';
import { namedError } from './errors.ts';

export function cameraAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext === true &&
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  );
}

export class Camera {
  private stream: MediaStream | null = null;
  /** 우리가 끄지 않았는데 영상 트랙이 끝나면(다른 앱이 카메라를 가져감, 장치 분리 등) 부른다(spec 3.1, review R3) */
  onEnded: (() => void) | null = null;
  private readonly handleEnded = (): void => {
    if (!this.stream) return; // 우리가 close()한 뒤면 무시
    this.onEnded?.();
  };
  readonly video: HTMLVideoElement;
  constructor(video: HTMLVideoElement) {
    this.video = video;
  }

  get active(): boolean {
    return this.stream !== null && this.stream.getVideoTracks().some((t) => t.readyState === 'live');
  }

  async open(): Promise<void> {
    if (this.active) return;
    if (!cameraAvailable()) throw namedError('InsecureContext', 'no secure context or mediaDevices');
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: 'user',
        width: { ideal: PERF.CAMERA_WIDTH },
        height: { ideal: PERF.CAMERA_HEIGHT },
        frameRate: { ideal: PERF.CAMERA_FPS, max: PERF.CAMERA_FPS },
      },
    });
    this.stream = stream;
    for (const t of stream.getVideoTracks()) t.addEventListener('ended', this.handleEnded);
    const v = this.video;
    v.muted = true;
    v.playsInline = true;
    v.setAttribute('playsinline', '');
    v.setAttribute('muted', '');
    v.autoplay = true;
    v.srcObject = stream;
    try {
      await v.play();
    } catch (e) {
      // 자동 재생이 막혀도 loadeddata 뒤 다시 시도한다
      if (v.readyState < 2) {
        await new Promise<void>((resolve) => v.addEventListener('loadeddata', () => resolve(), { once: true }));
      }
      try {
        await v.play();
      } catch {
        this.close();
        throw e;
      }
    }
    if (v.readyState < 2) {
      await new Promise<void>((resolve) => v.addEventListener('loadeddata', () => resolve(), { once: true }));
    }
  }

  close(): void {
    const s = this.stream;
    // 먼저 비워 두어 stop()이 낸 ended는 무시되게 한다
    this.stream = null;
    if (s) {
      for (const t of s.getTracks()) {
        t.removeEventListener('ended', this.handleEnded);
        t.stop();
      }
    }
    this.video.srcObject = null;
  }
}
