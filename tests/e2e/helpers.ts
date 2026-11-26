import { expect, type Page } from '@playwright/test';
import type { TestState } from '../../src/debug/testHooks.ts';
import type { HandFrame, RawHand } from '../../src/hand/tracker.ts';
import { synthHand, type Bend } from '../helpers/handSynth.ts';

export const VW = 640;
export const VH = 480;

/** 페이지의 콘솔 오류·페이지 오류·같은 출처가 아닌 요청·400 이상 응답을 모은다 */
export function watchPage(page: Page, origin: string): { errors: string[]; external: string[]; bad: string[] } {
  const out = { errors: [] as string[], external: [] as string[], bad: [] as string[] };
  page.on('console', (m) => {
    if (m.type() === 'error' && !/^(INFO: |I\d{4} )/.test(m.text())) out.errors.push(m.text());
  });
  page.on('pageerror', (e) => out.errors.push(String(e)));
  page.on('request', (r) => {
    const u = new URL(r.url());
    if ((u.protocol === 'http:' || u.protocol === 'https:' || u.protocol === 'ws:' || u.protocol === 'wss:') && u.origin !== origin) {
      out.external.push(r.url());
    }
  });
  page.on('response', (r) => {
    if (r.status() >= 400) out.bad.push(`${r.status()} ${r.url()}`);
  });
  return out;
}

export async function state(page: Page): Promise<TestState> {
  return page.evaluate(() => window.__eg!.state());
}

export async function step(page: Page, ms: number): Promise<void> {
  await page.evaluate((m) => window.__eg!.clock.step(m), ms);
}

/**
 * 실제 카메라 손 인식(E1·E4 R3·E5)의 느린 기기 시간 예산.
 * 검사(detectForVideo)는 게임 루프 안에서 프레임마다 많아야 1번 돌고, 도는 동안 주 스레드를 붙잡는다.
 * CI(GitHub ubuntu, GPU 없음 → WebGL이 소프트웨어 SwiftShader)에서 두 작업자가 MediaPipe를 함께 돌리면
 * 프레임 하나(= 검사 하나)에 약 1.5~3초까지 걸렸다(run 45790148325 attempt 1 trace: 게임 시계가 프레임마다
 * 상한 1000ms씩, 검사 수는 프레임마다 1씩 늘고, state() 한 번에 1.5~4.7초). 그래서 검사 1번에 4초, 여기에
 * 첫 검사·state() 지연 몫으로 10초를 더 준다. 인식이 멈추면(검사 수 그대로) 이 시간이 지나 여전히 실패한다.
 */
export const SLOW_DETECT_MS = 4_000;
const DETECT_SLACK_MS = 10_000;
/** 카메라 시험 한 개의 시간 제한: 준비 30초 + 다시 시도 15초 + 영상 15초 + 검사 대기(최대 11번 × 4초 + 10초)에 여유 */
export const CAMERA_TEST_TIMEOUT_MS = 150_000;

/** #camera-video에 살아 있는 트랙이 붙어 있고 새 프레임이 들어와 재생 시각이 앞으로 가는지 기다린다 */
export async function expectCameraVideoPlaying(page: Page): Promise<void> {
  const clock = (): Promise<{ t: number; ready: number; live: boolean }> =>
    page.evaluate(() => {
      const v = document.getElementById('camera-video') as HTMLVideoElement;
      const s = v.srcObject as MediaStream | null;
      return { t: v.currentTime, ready: v.readyState, live: !!s && s.getVideoTracks().some((tr) => tr.readyState === 'live') };
    });
  const t0 = (await clock()).t;
  await expect
    .poll(
      async () => {
        const c = await clock();
        return c.live && c.ready >= 2 && c.t > t0;
      },
      { message: '카메라 영상에 새 프레임이 들어오지 않음(재생 시각이 그대로)', timeout: 15_000 },
    )
    .toBe(true);
}

/** detectCount가 threshold를 넘을 때까지 기다린다. 시간 제한은 아직 필요한 검사 수 × SLOW_DETECT_MS + 10초 */
export async function expectDetectCountAbove(page: Page, threshold: number): Promise<void> {
  const need = Math.max(1, threshold + 1 - (await state(page)).detectCount);
  await expect
    .poll(async () => (await state(page)).detectCount, {
      message: `손 인식 검사 수가 ${threshold}를 넘지 않음(인식이 멈췄을 수 있음)`,
      timeout: need * SLOW_DETECT_MS + DETECT_SLACK_MS,
    })
    .toBeGreaterThan(threshold);
}

/** 조건이 맞을 때까지 수동 시계를 chunk씩 진행 */
export async function stepUntil(
  page: Page,
  pred: (s: TestState) => boolean,
  opts: { chunk?: number; maxMs?: number; between?: () => Promise<void> } = {},
): Promise<TestState> {
  const chunk = opts.chunk ?? 100;
  const maxMs = opts.maxMs ?? 30_000;
  for (let t = 0; t <= maxMs; t += chunk) {
    const s = await state(page);
    if (pred(s)) return s;
    if (opts.between) await opts.between();
    await step(page, chunk);
  }
  throw new Error(`stepUntil: 조건이 ${maxMs}ms 안에 맞지 않음`);
}

/** 화면 좌표(CSS px) → 거울 + cover 역변환 → 정규화 영상 좌표 */
export function screenToNorm(x: number, y: number, W: number, H: number): { u: number; v: number } {
  const s = Math.max(W / VW, H / VH);
  const dw = VW * s;
  const dh = VH * s;
  const ox = (W - dw) / 2;
  const oy = (H - dh) / 2;
  return { u: 1 - (x - ox) / dw, v: (y - oy) / dh };
}

export function handAt(x: number, y: number, W: number, H: number, bend: Bend, palm = 0.08): RawHand {
  const { u, v } = screenToNorm(x, y, W, H);
  return synthHand({ bend, u, v, palm, videoW: VW, videoH: VH });
}

/** 구간들(손 위치·모양·길이)을 30fps 프레임으로 */
export function framesFor(
  segs: { ms: number; hands: (i: number, n: number) => RawHand[] }[],
  fps = 30,
): HandFrame[] {
  const dt = 1000 / fps;
  const frames: HandFrame[] = [];
  let t = 0;
  for (const seg of segs) {
    const n = Math.max(1, Math.round(seg.ms / dt));
    for (let i = 0; i < n; i++) {
      frames.push({ t, hands: seg.hands(i, n), videoSize: { w: VW, h: VH } });
      t += dt;
    }
  }
  return frames;
}

/** 프레임을 넣고 그 길이만큼 시계를 진행 */
export async function playFrames(page: Page, frames: HandFrame[], extraMs = 50): Promise<void> {
  await page.evaluate((f) => window.__eg!.loadReplay(f), frames);
  const last = frames[frames.length - 1];
  const dur = last ? last.t - (frames[0]?.t ?? 0) : 0;
  await step(page, dur + extraMs);
}

export async function clickAt(page: Page, x: number, y: number, touch: boolean): Promise<void> {
  if (touch) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
}

/** 터치 모드로 들어가 START를 누르고 3·2·1이 끝날 때까지 */
export async function startTouchGame(page: Page): Promise<void> {
  await page.click('#btn-touch');
  await expect.poll(async () => (await state(page)).screen).toBe('handcheck');
  await page.click('#start-card');
  expect((await state(page)).screen).toBe('countdown');
  await step(page, 3100);
  expect((await state(page)).screen).toBe('playing');
}

/** 요소 안 글자의 줄바꿈 위치마다 [앞 글자, 뒤 글자]를 돌려준다(Range로 글자마다 위치를 잰다) */
export async function lineBreaks(page: Page, selector: string): Promise<[string, string][]> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)!;
    const chars: { ch: string; top: number }[] = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const t = n.textContent ?? '';
      for (let i = 0; i < t.length; i++) {
        const r = document.createRange();
        r.setStart(n, i);
        r.setEnd(n, i + 1);
        const rect = r.getClientRects()[0];
        chars.push({ ch: t[i]!, top: rect ? rect.top : NaN });
      }
    }
    const out: [string, string][] = [];
    let lastTop = NaN;
    let prev = '';
    for (const c of chars) {
      if (/\s/.test(c.ch) || Number.isNaN(c.top)) {
        prev = c.ch;
        continue;
      }
      if (!Number.isNaN(lastTop) && c.top > lastTop + 2) out.push([prev, c.ch]);
      lastTop = c.top;
      prev = c.ch;
    }
    return out;
  }, selector);
}

