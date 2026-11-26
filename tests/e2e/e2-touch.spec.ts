import { expect, test } from '@playwright/test';
import { clickAt, startTouchGame, state, step, stepUntil, watchPage } from './helpers.ts';

test('E2 터치 모드 한 판: 정답 누르기 ×10 → 10/10, 점수 = 독립 계산, 오답은 사라지고 점수 그대로', async ({ page, baseURL }, info) => {
  const touch = info.project.use.hasTouch === true;
  const w = watchPage(page, new URL(baseURL!).origin);
  await page.goto('./?input=pointer&seed=7&test=1&clock=manual');
  await startTouchGame(page);

  let expected = 0;
  let combo = 0;
  let wrongTested = false;
  for (let q = 1; q <= 10; q++) {
    // 정답 카드가 잡을 수 있게 되고 조금 더 내려올 때까지
    let s = await stepUntil(page, (st) => st.question === q && st.phase === 'falling' && st.cards.some((c) => c.correct && c.grabbable && c.rect.y > st.bandH + 20));
    expect(s.total).toBe(10);
    let firstTry = true;
    if (q === 2 && !wrongTested) {
      const wrong = (await stepUntil(page, (st) => st.cards.some((c) => !c.correct && c.grabbable && c.rect.y > st.bandH + 10))).cards.find(
        (c) => !c.correct && c.grabbable && c.rect.y > s.bandH + 10,
      )!;
      const before = (await state(page)).score;
      await clickAt(page, wrong.rect.x + wrong.rect.w / 2, wrong.rect.y + wrong.rect.h / 2, touch);
      s = await state(page);
      expect(s.score).toBe(before);
      expect(s.cards.find((c) => c.id === wrong.id)!.status).toBe('wrong');
      await step(page, 400);
      s = await state(page);
      expect(s.cards.find((c) => c.id === wrong.id)!.status).toBe('gone');
      expect(s.score).toBe(before);
      combo = 0;
      firstTry = false;
      wrongTested = true;
    }
    s = await state(page);
    const c = s.cards.find((x) => x.correct)!;
    expect(c.grabbable).toBe(true);
    // 5.5 식을 따로 계산
    combo += 1;
    expected += (firstTry ? 100 : 50) + Math.round(50 * (1 - Math.min(1, Math.max(0, c.p)))) + (combo >= 3 ? 20 : 0);
    await clickAt(page, c.rect.x + c.rect.w / 2, c.rect.y + c.rect.h / 2, touch);
    s = await state(page);
    expect(s.phase).toBe('correct');
    expect(s.score).toBe(expected);
    await step(page, 1600);
  }
  const s = await stepUntil(page, (st) => st.screen === 'result');
  expect(s.results.length).toBe(10);
  expect(s.results.filter((r) => r.mark !== 'miss').length).toBe(10);
  expect(s.results.map((r) => r.mark)).toEqual(['first', 'retry', ...Array(8).fill('first')]);
  await expect(page.locator('#result-correct')).toContainText('10 / 10');
  await expect(page.locator('#result-score b')).toHaveText(String(expected));
  await expect(page.locator('#new-record')).toHaveText('New record!');
  await expect(page.locator('#review tbody tr')).toHaveCount(10);
  expect(w.errors, w.errors.join('\n')).toEqual([]);
  expect(w.external).toEqual([]);

  // 다시 하기 → 새 판, 처음으로 → 시작 화면
  await page.click('#btn-again');
  await step(page, 3100);
  expect((await state(page)).screen).toBe('playing');
  await page.click('#pause-btn');
  expect((await state(page)).screen).toBe('paused');
  await page.click('#btn-home');
  expect((await state(page)).screen).toBe('start');
});

test('E2 놓침: 정답 카드가 아래로 빠지면 정답 공개 후 다음 문제', async ({ page }) => {
  await page.goto('./?input=pointer&seed=3&test=1&clock=manual');
  await startTouchGame(page);
  const s = await stepUntil(page, (st) => st.phase === 'missed', { chunk: 250 });
  expect(s.results[0]!.mark).toBe('miss');
  expect(s.score).toBe(0);
  await expect(page.locator('#reveal')).toBeVisible();
  await expect(page.locator('#reveal')).toContainText(`The answer is ${s.results[0]!.word}`);
  await step(page, 2100);
  expect((await state(page)).question).toBe(2);
  await expect(page.locator('#reveal')).toBeHidden();
});

/** 정답 카드를 차례로 눌러 한 판을 끝낸다 */
async function finishGame(page: import('@playwright/test').Page, touch: boolean): Promise<void> {
  for (let q = 1; q <= 10; q++) {
    const s = await stepUntil(page, (st) => st.question === q && st.phase === 'falling' && st.cards.some((c) => c.correct && c.grabbable && c.rect.y > st.bandH + 20));
    const c = s.cards.find((x) => x.correct)!;
    await clickAt(page, c.rect.x + c.rect.w / 2, c.rect.y + c.rect.h / 2, touch);
    await step(page, 1600);
  }
  await stepUntil(page, (st) => st.screen === 'result');
}

async function setHidden(page: import('@playwright/test').Page, hidden: boolean): Promise<void> {
  await page.evaluate((h) => {
    Object.defineProperty(document, 'hidden', { value: h, configurable: true });
    Object.defineProperty(document, 'visibilityState', { value: h ? 'hidden' : 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
}

test('E2 M1: 결과 화면 [다시 하기] 3·2·1 중 탭이 숨겨져도 멈추지 않고 새 판을 시작할 수 있다', async ({ page }, info) => {
  const touch = info.project.use.hasTouch === true;
  await page.goto('./?input=pointer&seed=7&test=1&clock=manual');
  await startTouchGame(page);
  await finishGame(page, touch);
  await page.click('#btn-again');
  await step(page, 500);
  let s = await state(page);
  expect(s.screen).toBe('countdown');
  // 지난 판의 설명 띠가 보이지 않는다(R2)
  await expect(page.locator('#hud')).toBeHidden();
  await setHidden(page, true);
  await setHidden(page, false);
  s = await state(page);
  // 끝난 판이 남아 '멈춤' 화면이 되면 안 된다 → 손 확인(START) 화면으로 돌아간다
  expect(s.screen).toBe('handcheck');
  await page.click('#start-card');
  await step(page, 3100);
  s = await state(page);
  expect(s.screen).toBe('playing');
  expect(s.question).toBe(1);
  expect(s.phase).toBe('falling');
  expect(s.cards.length).toBeGreaterThan(0);
  await step(page, 3000);
  s = await state(page);
  expect(s.cards.some((c) => c.p > 0)).toBe(true);
});

test('E2 M2: 테스트 훅으로 규칙 값을 바꿀 수 없다', async ({ page }, info) => {
  const touch = info.project.use.hasTouch === true;
  await page.goto('./?input=pointer&seed=7&test=1&clock=manual');
  const tamper = await page.evaluate(() => {
    const eg = window.__eg as unknown as Record<string, unknown>;
    const out: string[] = [];
    out.push(`config:${typeof eg.config}`);
    try {
      (eg.config as { GAME: { SCORE_FIRST_TRY: number } }).GAME.SCORE_FIRST_TRY = 999;
      out.push('config-set');
    } catch {
      out.push('config-blocked');
    }
    const orig = eg.state;
    const fake = (): object => ({});
    try {
      eg.state = fake;
    } catch {
      // 엄격 모드면 오류, 아니면 조용히 무시된다
    }
    out.push(eg.state === orig ? 'state-blocked' : 'state-replaced');
    // state()는 복사본: 바꿔도 게임에 영향 없음
    const s = window.__eg!.state() as unknown as { score: number };
    s.score = 5000;
    out.push(`frozen:${Object.isFrozen(window.__eg)}`);
    return out;
  });
  expect(tamper).toEqual(['config:undefined', 'config-blocked', 'state-blocked', 'frozen:true']);
  await startTouchGame(page);
  const s = await stepUntil(page, (st) => st.phase === 'falling' && st.cards.some((c) => c.correct && c.grabbable && c.rect.y > st.bandH + 20));
  expect(s.score).toBe(0);
  const c = s.cards.find((x) => x.correct)!;
  await clickAt(page, c.rect.x + c.rect.w / 2, c.rect.y + c.rect.h / 2, touch);
  const after = await state(page);
  expect(after.score).toBe(100 + Math.round(50 * (1 - c.p)));
  expect(after.score).toBeLessThanOrEqual(150);
});

test('E2 R1: ?test=1 없이 ?clock=manual만 있으면 보통 시계로 돈다', async ({ page }) => {
  await page.goto('./?input=pointer&clock=manual');
  expect(await page.evaluate(() => typeof window.__eg)).toBe('undefined');
  await page.click('#btn-touch');
  await page.click('#start-card');
  await expect(page.locator('#countdown')).toBeVisible();
  await expect(page.locator('#countdown')).toBeHidden({ timeout: 6_000 });
  await expect(page.locator('#clue')).not.toHaveText('');
  await expect(page.locator('#hud')).toBeVisible();
});
