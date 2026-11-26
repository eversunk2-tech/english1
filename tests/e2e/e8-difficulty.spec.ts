import { expect, test, type Page } from '@playwright/test';
import { clickAt, startTouchGame, state, step, stepUntil, watchPage } from './helpers.ts';

type Diff = 'easy' | 'normal' | 'hard';

// spec 5.3.2·5.3.3·5.5를 테스트 안에 따로 적는다(저장소 코드를 기대값으로 쓰지 않음)
const MULT: Record<Diff, number> = { easy: 1.0, normal: 1.2, hard: 1.5 };
const PENALTY: Record<Diff, number> = { easy: 10, normal: 20, hard: 30 };
const STAGE: Record<Diff, [number, number][]> = {
  // [카드 수, 단계 값 ms] — 1~3, 4~6, 7~10
  easy: [[3, 9000], [4, 7500], [4, 6500]],
  normal: [[3, 7500], [4, 6500], [4, 5500]],
  hard: [[4, 6000], [4, 5000], [4, 4500]],
};
const LABEL: Record<Diff, string> = { easy: 'Easy', normal: 'Normal', hard: 'Hard' };

function stageOf(d: Diff, q: number): [number, number] {
  return STAGE[d][q <= 3 ? 0 : q <= 6 ? 1 : 2]!;
}
function expectedFall(clue: string, band: '3-4' | '5-6', d: Diff, q: number): number {
  const n = (clue.toLowerCase().match(/[a-z]+('[a-z]+)?/g) ?? []).length;
  const need = 300 + n * (band === '3-4' ? 400 : 350) + 1000 + 400;
  return Math.max(stageOf(d, q)[1], Math.ceil((need * 100) / 85 / 10) * 10);
}
const center = (r: { x: number; y: number; w: number; h: number }): [number, number] => [r.x + r.w / 2, r.y + r.h / 2];

/** 한 판: wrongs[q] 번 오답을 누른 뒤 정답을 누른다. 점수·문제별 기록을 독립 계산해 비교한다. */
async function playGame(page: Page, d: Diff, band: '3-4' | '5-6', wrongs: Record<number, number>, touch: boolean): Promise<{ score: number; first: number }> {
  let score = 0;
  let combo = 0;
  let first = 0;
  const rows: { net: number; wrongCount: number; deducted: number; mark: string }[] = [];
  for (let q = 1; q <= 10; q++) {
    let s = await stepUntil(page, (st) => st.question === q && st.phase === 'falling');
    // 카드 수·떨어지는 시간 = 5.3.2·5.3.3
    expect(s.cards.length, `q${q} cards`).toBe(stageOf(d, q)[0]);
    expect(s.fallMs, `q${q} fallMs`).toBe(expectedFall(s.clue!, band, d, q));
    expect(s.difficulty).toBe(d);
    let firstTry = true;
    let deducted = 0;
    let wrongCount = 0;
    for (let k = 0; k < (wrongs[q] ?? 0); k++) {
      s = await stepUntil(page, (st) => st.cards.some((c) => !c.correct && c.grabbable && c.rect.y > st.bandH + 10));
      const w = s.cards.find((c) => !c.correct && c.grabbable && c.rect.y > s.bandH + 10)!;
      const before = s.score;
      expect(before).toBe(score);
      await clickAt(page, ...center(w.rect), touch);
      const pen = Math.min(score, PENALTY[d]);
      score -= pen;
      deducted += pen;
      wrongCount += 1;
      combo = 0;
      firstTry = false;
      s = await state(page);
      expect(s.score, `q${q} wrong ${k}`).toBe(score);
      if (pen > 0) await expect(page.locator('.penalty-pop').last()).toHaveText(`−${pen}`);
    }
    s = await stepUntil(page, (st) => st.cards.some((c) => c.correct && c.grabbable && c.rect.y > st.bandH + 20));
    const c = s.cards.find((x) => x.correct)!;
    combo += 1;
    const gain = Math.round(MULT[d] * ((firstTry ? 100 : 50) + Math.round(50 * (1 - Math.min(1, Math.max(0, c.p)))) + (combo >= 3 ? 20 : 0)));
    await clickAt(page, ...center(c.rect), touch);
    score += gain;
    if (firstTry) first += 1;
    s = await state(page);
    expect(s.phase).toBe('correct');
    expect(s.score, `q${q} correct`).toBe(score);
    rows.push({ net: gain - deducted, wrongCount, deducted, mark: firstTry ? 'first' : 'retry' });
    await step(page, 1600);
  }
  const s = await stepUntil(page, (st) => st.screen === 'result');
  expect(s.score).toBe(score);
  await expect(page.locator('#result-score b')).toHaveText(String(score));
  await expect(page.locator('#result-combo')).toHaveText(`${band === '3-4' ? '3~4학년' : '5~6학년'} · ${LABEL[d]}`);
  // 복습표 문제별 점수·오답 수
  for (let i = 0; i < 10; i++) {
    const row = page.locator('#review tbody tr').nth(i);
    const r = rows[i]!;
    expect(s.results[i]!.mark).toBe(r.mark);
    expect(s.results[i]!.deducted).toBe(r.deducted);
    expect(s.results[i]!.wrongs.length).toBe(r.wrongCount);
    const netText = r.net > 0 ? `+${r.net}` : r.net < 0 ? `−${-r.net}` : '0';
    await expect(row.locator('.net')).toHaveText(netText);
    if (r.wrongCount > 0) await expect(row.locator('.wrong-note')).toContainText(`오답 ${r.wrongCount}번`);
    else await expect(row.locator('.wrong-note')).toHaveCount(0);
  }
  const totalWrong = rows.reduce((a, r) => a + r.wrongCount, 0);
  const totalDed = rows.reduce((a, r) => a + r.deducted, 0);
  await expect(page.locator('#wrong-summary')).toHaveText(
    totalWrong > 0 && totalDed > 0 ? `오답 ${totalWrong}번 (−${totalDed})` : `오답 ${totalWrong}번`,
  );
  return { score, first };
}

test('E8 ①② 난이도 기억: Hard를 누르고 새로고침 → Hard, ?difficulty=easy가 기억보다 우선(저장도 함), 기본 Normal', async ({ page }) => {
  await page.goto('./?test=1');
  await expect(page.locator('[data-difficulty="normal"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#difficulty-desc')).toHaveText('조금 빨라요. 비슷한 단어가 섞여 나와요.');
  await page.click('[data-difficulty="hard"]');
  await expect(page.locator('#difficulty-desc')).toHaveText('빠르고 헷갈리는 단어가 많아요. 도전해 보세요!');
  await page.reload();
  await expect(page.locator('[data-difficulty="hard"]')).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => localStorage.getItem('catchword.difficulty'))).toBe('hard');
  await page.goto('./?test=1&difficulty=easy');
  await expect(page.locator('[data-difficulty="easy"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#difficulty-desc')).toHaveText('천천히 떨어져요. 처음 하는 친구에게 좋아요.');
  expect(await page.evaluate(() => localStorage.getItem('catchword.difficulty'))).toBe('easy');
  // 이상한 값 → 기억한 값(easy)
  await page.goto('./?test=1&difficulty=insane');
  await expect(page.locator('[data-difficulty="easy"]')).toHaveAttribute('aria-pressed', 'true');
});

const GAMES: { d: Diff; band: '3-4' | '5-6'; seed: number; wrongs: Record<number, number>; challenge: string | null }[] = [
  // Easy: 1번 문제(점수 0)에서 오답 → 깎인 것 없음. 첫 시도 9개 → Normal 권유
  { d: 'easy', band: '3-4', seed: 21, wrongs: { 1: 1 }, challenge: '다음엔 Normal에 도전해 볼까요?' },
  // Normal: 오답 섞인 문제 3개 → 첫 시도 7개 → 권유 없음
  { d: 'normal', band: '3-4', seed: 22, wrongs: { 1: 1, 2: 2, 5: 1 }, challenge: null },
  // Hard(5~6학년군): 오답 섞인 문제 2개 → 첫 시도 8개 → Hard 권유
  { d: 'hard', band: '5-6', seed: 23, wrongs: { 3: 2, 8: 1 }, challenge: 'Hard도 거뜬해요! 최고 점수에 도전해 봐요.' },
];

for (const g of GAMES) {
  test(`E8 ③④⑤⑥ ${g.d} 한 판(${g.band}): 배지·점수(배율·감점·0점 바닥)·fallMs·카드 수·최고 점수 키·도전 권유`, async ({ page, baseURL }, info) => {
    test.setTimeout(120_000);
    const touch = info.project.use.hasTouch === true;
    const w = watchPage(page, new URL(baseURL!).origin);
    await page.goto(`./?input=pointer&test=1&clock=manual&seed=${g.seed}&band=${g.band}&difficulty=${g.d}`);
    await startTouchGame(page);
    await expect(page.locator('#diff-badge')).toHaveText(LABEL[g.d]);
    const { score, first } = await playGame(page, g.d, g.band, g.wrongs, touch);
    expect(first).toBe(10 - Object.keys(g.wrongs).length);
    // ⑤ 최고 점수 키
    expect(await page.evaluate((k) => localStorage.getItem(k), `catchword.best.${g.band}.${g.d}`)).toBe(String(score));
    await expect(page.locator('#result-best b')).toHaveText(String(score));
    // ⑥ 도전 권유
    if (g.challenge) await expect(page.locator('#challenge')).toHaveText(g.challenge);
    else await expect(page.locator('#challenge')).toHaveCount(0);
    // AGAIN/다시 하기는 감점 없이 0점에서 시작
    await page.click('#btn-again');
    await step(page, 3100);
    const s = await state(page);
    expect(s.screen).toBe('playing');
    expect(s.score).toBe(0);
    expect(w.errors, w.errors.join('\n')).toEqual([]);
    expect(w.external).toEqual([]);
  });
}

test('E8 ⑤ v1 최고 점수 키만 있으면 Easy로 옮겨진다', async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('catchword.best.3-4', '777');
      sessionStorage.setItem('seeded', '1');
    }
  });
  await page.goto('./?test=1');
  expect(await page.evaluate(() => localStorage.getItem('catchword.best.3-4.easy'))).toBe('777');
  expect(await page.evaluate(() => localStorage.getItem('catchword.best.3-4'))).toBe('777');
  expect(await page.evaluate(() => localStorage.getItem('catchword.best.3-4.normal'))).toBe(null);
});

test('E8 ③ 오답 감점: Normal에서 점수 0이면 빨간 숫자 없이 Try again!만, 점수가 있으면 −20', async ({ page }, info) => {
  const touch = info.project.use.hasTouch === true;
  await page.goto('./?input=pointer&test=1&clock=manual&seed=5&difficulty=normal');
  await startTouchGame(page);
  let s = await stepUntil(page, (st) => st.cards.some((c) => !c.correct && c.grabbable && c.rect.y > st.bandH + 10));
  const w = s.cards.find((c) => !c.correct && c.grabbable && c.rect.y > s.bandH + 10)!;
  await clickAt(page, ...center(w.rect), touch);
  s = await state(page);
  expect(s.score).toBe(0);
  await expect(page.locator('#feedback')).toHaveText('Try again!');
  await expect(page.locator('.penalty-pop')).toHaveCount(0);
});
