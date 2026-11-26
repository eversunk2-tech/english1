// spec 2.4·10: 모델 fetch(진행률) → HandLandmarker 만들기(GPU → CPU) → 새 영상 프레임만 검사.
import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { ASSETS, HAND, PERF } from '../config.ts';
import { namedError } from '../camera/errors.ts';
import type { HandFrame, HandSource, RawHand } from './tracker.ts';

export type DelegateChoice = 'auto' | 'GPU' | 'CPU';

export interface MediapipeStats {
  delegate: 'GPU' | 'CPU' | '-';
  detectCount: number;
  avgDetectMs: number;
  /** 최근 1초 검사 횟수 */
  detectHz: number;
  skipping: boolean;
  videoW: number;
  videoH: number;
  lastError: string | null;
}

export interface MediapipeSourceOptions {
  delegate: DelegateChoice;
  onProgress?: (pct: number) => void;
}

function assetUrl(rel: string): string {
  return new URL(rel, document.baseURI).href;
}

/** 모델을 받으며 진행률을 알린다. 실패·크기 0이면 DownloadError. */
async function fetchModel(onProgress?: (frac: number) => void): Promise<Uint8Array> {
  let res: Response;
  try {
    res = await fetch(assetUrl(ASSETS.MODEL_PATH));
  } catch (e) {
    throw namedError('DownloadError', `model fetch failed: ${String(e)}`);
  }
  if (!res.ok) throw namedError('DownloadError', `model HTTP ${res.status}`);
  const total = Number(res.headers.get('Content-Length')) || ASSETS.MODEL_SIZE;
  if (!res.body) {
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength === 0) throw namedError('DownloadError', 'model size 0');
    onProgress?.(1);
    return buf;
  }
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    let r: ReadableStreamReadResult<Uint8Array>;
    try {
      r = await reader.read();
    } catch (e) {
      throw namedError('DownloadError', `model read failed: ${String(e)}`);
    }
    if (r.done) break;
    chunks.push(r.value);
    received += r.value.byteLength;
    onProgress?.(Math.min(1, received / total));
  }
  if (received === 0) throw namedError('DownloadError', 'model size 0');
  const out = new Uint8Array(received);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.byteLength;
  }
  return out;
}

async function wasmReachable(): Promise<boolean> {
  try {
    const res = await fetch(assetUrl(`${ASSETS.WASM_DIR}/vision_wasm_internal.wasm`), { method: 'HEAD' });
    return res.ok && Number(res.headers.get('Content-Length') ?? '1') !== 0;
  } catch {
    return false;
  }
}

export class MediapipeSource implements HandSource {
  readonly kind = 'camera' as const;
  private landmarker: HandLandmarker | null = null;
  private model: Uint8Array | null = null;
  private fileset: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>> | null = null;
  private delegateNow: 'GPU' | 'CPU' | '-' = '-';
  private recreating: Promise<void> | null = null;
  private lastVideoTime = -1;
  private lastTs = 0;
  private checksOnDelegate = 0;
  private durations: number[] = [];
  private skipping = false;
  private skipToggle = false;
  private detectCount = 0;
  private hzWindow: number[] = [];
  private lastError: string | null = null;
  private gpuCanvas: HTMLCanvasElement | null = null;

  private readonly video: HTMLVideoElement;
  private readonly opts: MediapipeSourceOptions;

  constructor(video: HTMLVideoElement, opts: MediapipeSourceOptions) {
    this.video = video;
    this.opts = opts;
  }

  async start(): Promise<void> {
    if (this.landmarker) return;
    const report = (pct: number): void => this.opts.onProgress?.(Math.round(pct));
    report(0);
    if (!this.model) this.model = await fetchModel((f) => report(f * 90));
    report(92);
    if (!this.fileset) {
      // 끝에 '/'를 붙이지 않는다(spec 2.4)
      this.fileset = await FilesetResolver.forVisionTasks(assetUrl(ASSETS.WASM_DIR));
    }
    const choice = this.opts.delegate;
    try {
      if (choice === 'CPU') await this.create('CPU');
      else {
        try {
          await this.create('GPU');
        } catch (e) {
          if (choice === 'GPU') throw e;
          this.lastError = `GPU: ${String(e)}`;
          await this.create('CPU');
        }
      }
    } catch (e) {
      if (!(await wasmReachable())) throw namedError('DownloadError', `wasm unreachable: ${String(e)}`);
      throw namedError('InitError', `HandLandmarker create failed: ${String(e)}`);
    }
    report(100);
  }

  private async create(delegate: 'GPU' | 'CPU'): Promise<void> {
    if (!this.fileset || !this.model) throw new Error('not ready');
    this.closeLandmarker();
    const baseOptions: { modelAssetBuffer: Uint8Array; delegate: 'GPU' | 'CPU' } = {
      // 같은 버퍼를 다시 쓸 수 있게 복사본을 넘긴다(GPU 실패 뒤 CPU로 다시 만들 때)
      modelAssetBuffer: this.model.slice(),
      delegate,
    };
    const options: Parameters<typeof HandLandmarker.createFromOptions>[1] = {
      baseOptions,
      runningMode: 'VIDEO',
      numHands: HAND.NUM_HANDS,
      minHandDetectionConfidence: HAND.MIN_HAND_DETECTION_CONF,
      minHandPresenceConfidence: HAND.MIN_HAND_PRESENCE_CONF,
      minTrackingConfidence: HAND.MIN_TRACKING_CONF,
    };
    if (delegate === 'GPU') {
      this.gpuCanvas = document.createElement('canvas');
      options.canvas = this.gpuCanvas;
    }
    this.landmarker = await HandLandmarker.createFromOptions(this.fileset, options);
    this.delegateNow = delegate;
    this.checksOnDelegate = 0;
    this.lastVideoTime = -1;
  }

  poll(now: number): HandFrame | null {
    const lm = this.landmarker;
    const v = this.video;
    if (!lm || this.recreating || v.readyState < 2 || v.videoWidth === 0) return null;
    if (v.currentTime === this.lastVideoTime) return null;
    this.lastVideoTime = v.currentTime;
    // 검사가 느리면 새 프레임 2개 중 1개만 검사(spec 10)
    if (this.skipping) {
      this.skipToggle = !this.skipToggle;
      if (this.skipToggle) return null;
    }
    const ts = Math.max(performance.now(), this.lastTs + 1);
    this.lastTs = ts;
    let result: HandLandmarkerResult;
    const t0 = performance.now();
    try {
      result = lm.detectForVideo(v, ts);
    } catch (e) {
      this.lastError = String(e);
      if (this.delegateNow === 'GPU' && this.checksOnDelegate < PERF.GPU_FAIL_CHECKS && this.opts.delegate !== 'GPU') {
        this.recreating = this.create('CPU')
          .catch((err) => {
            this.lastError = `CPU: ${String(err)}`;
          })
          .finally(() => {
            this.recreating = null;
          });
      }
      this.checksOnDelegate += 1;
      return null;
    }
    const dt = performance.now() - t0;
    this.checksOnDelegate += 1;
    this.detectCount += 1;
    this.durations.push(dt);
    if (this.durations.length > PERF.DETECT_AVG_WINDOW) this.durations.shift();
    const avg = this.avgMs();
    if (!this.skipping && this.durations.length >= PERF.DETECT_AVG_WINDOW && avg > PERF.SLOW_DETECT_MS) this.skipping = true;
    else if (this.skipping && avg < PERF.FAST_DETECT_MS) this.skipping = false;
    this.hzWindow.push(now);
    while (this.hzWindow.length > 0 && (this.hzWindow[0] ?? 0) < now - 1000) this.hzWindow.shift();

    const hands: RawHand[] = [];
    const n = Math.min(result.landmarks.length, result.worldLandmarks.length);
    for (let i = 0; i < n; i++) {
      const l = result.landmarks[i];
      const w = result.worldLandmarks[i];
      if (!l || !w) continue;
      hands.push({
        landmarks: l.map((p) => ({ x: p.x, y: p.y, z: p.z })),
        worldLandmarks: w.map((p) => ({ x: p.x, y: p.y, z: p.z })),
      });
    }
    return { t: now, hands, videoSize: { w: v.videoWidth, h: v.videoHeight } };
  }

  private avgMs(): number {
    if (this.durations.length === 0) return 0;
    return this.durations.reduce((a, b) => a + b, 0) / this.durations.length;
  }

  stats(): MediapipeStats {
    return {
      delegate: this.delegateNow,
      detectCount: this.detectCount,
      avgDetectMs: this.avgMs(),
      detectHz: this.hzWindow.length,
      skipping: this.skipping,
      videoW: this.video.videoWidth,
      videoH: this.video.videoHeight,
      lastError: this.lastError,
    };
  }

  get ready(): boolean {
    return this.landmarker !== null;
  }

  private closeLandmarker(): void {
    if (this.landmarker) {
      try {
        this.landmarker.close();
      } catch {
        // 닫기 실패는 무시
      }
    }
    this.landmarker = null;
    this.delegateNow = '-';
  }

  stop(): void {
    // 손 인식기는 다음 판을 위해 남겨 둔다(모델 다시 받지 않음). 영상 시각만 초기화.
    this.lastVideoTime = -1;
  }

  /** 손 인식기를 닫는다(pagehide 때). close() 때 MediaPipe가 보내려는 통계는 networkGuard가 막는다. */
  dispose(): void {
    this.closeLandmarker();
    this.lastVideoTime = -1;
  }
}
