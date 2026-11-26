import { expect, test, type Page } from '@playwright/test';
import type { TestState } from '../../src/debug/testHooks.ts';
import { synthHand } from '../helpers/handSynth.ts';
import { VH, VW, framesFor, handAt, playFrames, state, watchPage } from './helpers.ts';

/** 카드에서 멀리 떨어진 곳(왼쪽 아래 가장자리 칸 밖)의 편 손 — 손 없음 자동 일시정지를 막는다 */
function idle(s: TestState): ReturnType<typeof handAt> {
  return handAt(0.01 * s.viewport.W, 0.9 * s.viewport.H, s.viewport.W, s.viewport.H, 0);
}

async function idleUntil(page: Page, pred: (s: TestState) => boolean, maxMs = 20_000): Promise<TestState> {
  for (let t = 0; t < maxMs; t += 200) {
    const s = await state(page);
    if (pred(s)) return s;
    await playFrames(page, framesFor([{ ms: 200, hands: () => [idle(s)] }]), 0);
  }
  throw new Error('idleUntil timeout');
}

/** 화면 점(x,y)에서 편 손 300ms → 주먹 300ms */
async function grabAt(page: Page, s: TestState, x: number, y: number): Promise<void> {
  const { W, H } = s.viewport;
  await playFrames(
    page,
    framesFor([
      { ms: 300, hands: () => [handAt(x, y, W, H, 0)] },
      { ms: 330, hands: () => [handAt(x, y, W, H, 1)] },
    ]),
  );
}

test('E3 재생 모드: 합성 손으로 잡기 규칙·거울 변환', async ({ page, baseURL }) => {
  test.setTimeout(120_000);
  const w = watchPage(page, new URL(baseURL!).origin);
  await page.goto('./?input=replay&seed=3&test=1&clock=manual');
  await page.click('#btn-camera');
  let s = await state(page);
  expect(s.screen).toBe('handcheck');
  expect(s.mode).toBe('replay');
  await playFrames(page, framesFor([{ ms: 100, hands: () => [] }]));
  await expect(page.locator('#hc-text')).toHaveText('손바닥을 펴서 보여 주세요');
  await expect(page.locator('#hc-hint')).toHaveText('손이 보이지 않아요');

  // 거울 변환: 정규화 x=0.2 → 화면 오른쪽
  await playFrames(page, framesFor([{ ms: 200, hands: () => [synthHand({ bend: 0, u: 0.2, v: 0.5, videoW: VW, videoH: VH })] }]));
  s = await state(page);
  // 기대값은 spec 3.3 식으로 여기서 따로 계산한다(저장소 mapToScreen을 쓰지 않음, review R12).
  // 손바닥 중심(0,5,9,13,17 평균)을 u=0.2에 두었으므로 그 점의 화면 x를 본다.
  const sc = Math.max(s.viewport.W / VW, s.viewport.H / VH);
  const dw = VW * sc;
  const ox = (s.viewport.W - dw) / 2;
  // 화면 밖(cover로 잘린 곳)이면 화면 안으로 자른다(spec 3.3) — 세로 화면에서는 u=0.2가 오른쪽 밖이다
  const expectX = Math.min(s.viewport.W, Math.max(0, ox + (1 - 0.2) * dw));
  expect(s.tracks.length).toBe(1);
  expect(s.tracks[0]!.x).toBeGreaterThan(s.viewport.W / 2);
  expect(Math.abs(s.tracks[0]!.x - expectX)).toBeLessThan(2);
  expect(s.tracks[0]!.state).toBe('OPEN');
  await expect(page.locator('#hc-text')).toHaveText('이제 START 위에서 주먹을 꽉 쥐어 보세요');
  await expect(page.locator('#hc-hint')).toHaveText('');

  // START 카드 잡기 → 3·2·1 → 놀이
  const r = s.grabCardRect!;
  await grabAt(page, s, r.x + r.w / 2, r.y + r.h / 2);
  s = await state(page);
  expect(s.screen).toBe('countdown');
  await playFrames(page, framesFor([{ ms: 3100, hands: () => [idle(s)] }]), 0);
  s = await state(page);
  expect(s.screen).toBe('playing');

  // ① 정답 카드 위로 편 손 → 쥠 → 정답 처리
  s = await idleUntil(page, (st) => st.question === 1 && st.cards.some((c) => c.correct && c.grabbable && c.rect.y > st.bandH + 30));
  let c = s.cards.find((x) => x.correct)!;
  let grabs = s.grabCount;
  await grabAt(page, s, c.rect.x + c.rect.w / 2, c.rect.y + c.rect.h * 0.75);
  s = await state(page);
  expect(s.grabCount).toBe(grabs + 1);
  expect(s.results[0]?.mark).toBe('first');
  expect(s.score).toBeGreaterThan(100);
  expect(s.phase).toBe('correct');

  // ② 주먹 쥔 채 등장 → 잡기 없음
  s = await idleUntil(page, (st) => st.question === 2 && st.cards.some((x) => x.correct && x.grabbable && x.rect.y > st.bandH + 30));
  c = s.cards.find((x) => x.correct)!;
  grabs = s.grabCount;
  const { W, H } = s.viewport;
  await playFrames(
    page,
    framesFor([
      { ms: 300, hands: () => [] },
      { ms: 500, hands: () => [handAt(c.rect.x + c.rect.w / 2, c.rect.y + c.rect.h * 0.8, W, H, 1)] },
    ]),
  );
  s = await state(page);
  expect(s.grabCount).toBe(grabs);
  expect(s.tracks.some((t) => t.state === 'CLOSED')).toBe(true);
  expect(s.phase).toBe('falling');
  expect(s.results.length).toBe(1);

  // ③ 쥔 채로 카드 3장을 지나감 → 잡기 없음(쥐는 순간은 카드 밖에서 1번)
  s = await state(page);
  const y = Math.max(...s.cards.filter((x) => x.alive).map((x) => x.rect.y + x.rect.h / 2));
  const startX = 0.01 * W;
  const startY = 0.9 * H;
  grabs = s.grabCount;
  const n = 40;
  await playFrames(
    page,
    framesFor([
      { ms: 300, hands: () => [handAt(startX, startY, W, H, 0)] },
      { ms: 300, hands: () => [handAt(startX, startY, W, H, 1)] },
      // 쥔 채로 천천히 카드 줄로 올라감
      { ms: 600, hands: (i, k) => [handAt(startX, startY + ((y - startY) * (i + 1)) / k, W, H, 1)] },
      // 쥔 채로 왼쪽 → 오른쪽으로 카드 3장 위를 지나감
      { ms: n * 33, hands: (i, k) => [handAt(startX + ((0.97 * W - startX) * (i + 1)) / k, y, W, H, 1)] },
    ]),
  );
  s = await state(page);
  expect(s.grabCount).toBe(grabs + 1);
  expect(s.lastGrab?.target).toBe(null);
  expect(s.results.length).toBe(1);
  expect(s.cards.filter((x) => x.status === 'wrong').length).toBe(0);

  // ④ 오답 카드에서 쥠 → 오답 처리
  s = await idleUntil(page, (st) => st.phase === 'falling' && st.cards.some((x) => !x.correct && x.grabbable && x.rect.y > st.bandH + 30));
  const wrong = s.cards.find((x) => !x.correct && x.grabbable && x.rect.y > s.bandH + 30)!;
  const before = s.score;
  await grabAt(page, s, wrong.rect.x + wrong.rect.w / 2, wrong.rect.y + wrong.rect.h * 0.75);
  s = await state(page);
  expect(s.lastGrab?.target).toBe(wrong.word);
  expect(['wrong', 'gone']).toContain(s.cards.find((x) => x.id === wrong.id)!.status);
  expect(s.score).toBe(before);
  expect(s.combo).toBe(0);

  // ⑤ 손 3초 사라짐 → 일시정지 화면
  await playFrames(page, framesFor([{ ms: 3700, hands: () => [] }]));
  s = await state(page);
  expect(s.screen).toBe('paused');
  expect(s.paused).toBe('nohand');
  await expect(page.locator('.screen-paused h2')).toHaveText('손을 화면에 보여 주세요');
  // 손을 펴서 0.5초 보여 주면 3·2·1 뒤 이어서
  await playFrames(page, framesFor([{ ms: 800, hands: () => [idle(s)] }]));
  s = await state(page);
  expect(s.screen).toBe('countdown');
  await playFrames(page, framesFor([{ ms: 3100, hands: () => [idle(s)] }]));
  s = await state(page);
  expect(s.screen).toBe('playing');
  expect(s.paused).toBe(null);

  expect(w.errors, w.errors.join('\n')).toEqual([]);
  expect(w.external).toEqual([]);
});
