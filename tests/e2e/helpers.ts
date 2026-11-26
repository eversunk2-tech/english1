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
