import { expect, test, type Page } from '@playwright/test';
import { clickAt, startTouchGame, state, step, stepUntil, watchPage } from './helpers.ts';

import { readFileSync } from 'node:fs';

type Diff = 'easy' | 'normal' | 'hard' | 'veryhard';
const VH_WORDS = new Set<string>(
  (JSON.parse(readFileSync(new URL('../../src/data/veryhard.json', import.meta.url), 'utf8')) as { questions: { word: string }[] }).questions.map(
    (q) => q.word,
  ),
);
/** v9: 심화 낱말(부록 D "심화" = clue-extra.json veryhardAdvanced) */
const ADVANCED = new Set<string>(
  (JSON.parse(readFileSync(new URL('../../src/data/vocab/clue-extra.json', import.meta.url), 'utf8')) as { veryhardAdvanced: string[] }).veryhardAdvanced,
);

// spec 5.3.2·5.3.3·5.5를 테스트 안에 따로 적는다(저장소 코드를 기대값으로 쓰지 않음)
const MULT: Record<Diff, number> = { easy: 1.0, normal: 1.2, hard: 1.5, veryhard: 2.0 };
const PENALTY: Record<Diff, number> = { easy: 10, normal: 20, hard: 30, veryhard: 40 };
const STAGE: Record<Diff, [number, number][]> = {
  // [카드 수, 단계 값 ms] — 1~3, 4~6, 7~10 (spec 5.3.2 v9)
  easy: [[3, 8500], [4, 7000], [4, 6000]],
  normal: [[3, 6500], [4, 5500], [4, 4500]],
  hard: [[4, 5000], [4, 4000], [4, 3500]],
  veryhard: [[4, 4500], [4, 3500], [4, 3000]],
};
/** spec 5.3.3 읽기 계수(v9, ms/낱말): 난이도 × 문항 band */
const WORD: Record<Diff, Record<'3-4' | '5-6' | 'vh', number>> = {
  easy: { '3-4': 350, '5-6': 300, vh: 250 },
  normal: { '3-4': 350, '5-6': 300, vh: 250 },
  hard: { '3-4': 300, '5-6': 250, vh: 200 },
  veryhard: { '3-4': 300, '5-6': 250, vh: 200 },
};
/** spec 5.3.2 한 단계 위 문제 수·첫 번호(v9) */
const UP: Record<Diff, [number, number]> = { easy: [0, 11], normal: [2, 7], hard: [4, 4], veryhard: [4, 4] };
const LABEL: Record<Diff, string> = { easy: 'Easy', normal: 'Normal', hard: 'Hard', veryhard: 'Very Hard' };
type QBand = '3-4' | '5-6' | 'vh';

function stageOf(d: Diff, q: number): [number, number] {
  return STAGE[d][q <= 3 ? 0 : q <= 6 ? 1 : 2]!;
}
function expectedFall(clue: string, band: QBand, d: Diff, q: number): number {
  const n = (clue.toLowerCase().match(/[a-z]+('[a-z]+)?/g) ?? []).length;
  const need = 300 + n * WORD[d][band] + 1000 + 400;
  return Math.max(stageOf(d, q)[1], Math.ceil((need * 100) / 85 / 10) * 10);
}
const center = (r: { x: number; y: number; w: number; h: number }): [number, number] => [r.x + r.w / 2, r.y + r.h / 2];

/** 한 판: wrongs[q] 번 오답을 누른 뒤 정답을 누른다. 점수·문제별 기록을 독립 계산해 비교한다. */
async function playGame(page: Page, d: Diff, band: '3-4' | '5-6', wrongs: Record<number, number>, touch: boolean): Promise<{ score: number; first: number }> {
  let score = 0;
  let combo = 0;
  let first = 0;
  const rows: { net: number; wrongCount: number; deducted: number; mark: string }[] = [];
  // v9: 한 단계 위 문제 수·자리(spec 5.3.2·5.6.1 ①-2) — state().plans의 level
  const plans = (await state(page)).plans;
  expect(plans.length).toBe(10);
  const ups = plans.map((p, i) => (p.level === 'up' ? i + 1 : 0)).filter((x) => x > 0);
  expect(ups.length, 'up 문제 수').toBe(UP[d][0]);
  for (const no of ups) expect(no).toBeGreaterThanOrEqual(UP[d][1]);
  plans.forEach((p, i) => {
    // 정답 수준: Very Hard는 base 중학·up 심화, 그 밖에는 base = 학년군, up = 3~4 → 5~6, 5~6 → 중학(vh)
    const want: QBand = d === 'veryhard' ? 'vh' : p.level === 'up' ? (band === '3-4' ? '5-6' : 'vh') : band;
    expect(p.band, `q${i + 1} band`).toBe(want);
    if (p.band === 'vh') expect(ADVANCED.has(p.word), `q${i + 1} ${p.word}`).toBe(d === 'veryhard' && p.level === 'up');
  });
  for (let q = 1; q <= 10; q++) {
    let s = await stepUntil(page, (st) => st.question === q && st.phase === 'falling');
    const plan = plans[q - 1]!;
    expect(s.answer).toBe(plan.word);
    // 카드 수·떨어지는 시간 = 5.3.2·5.3.3(문항 자신의 band와 난이도)
    expect(s.cards.length, `q${q} cards`).toBe(stageOf(d, q)[0]);
    expect(s.fallMs, `q${q} fallMs`).toBe(expectedFall(s.clue!, plan.band as QBand, d, q));
    expect(plan.fallMs).toBe(s.fallMs);
    expect(s.difficulty).toBe(d);
    // 오답 풀은 정답 수준(spec 5.6 v9): vh 문항이면 카드가 모두 Very Hard 풀, 아니면 모두 부록 A
    for (const c of s.cards) expect(VH_WORDS.has(c.word), `q${q} ${c.word}`).toBe(plan.band === 'vh');
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
  await expect(page.locator('#result-combo')).toHaveText(
    d === 'veryhard' ? 'Very Hard · 중학·심화 단어' : `${band === '3-4' ? '3~4학년' : '5~6학년'} · ${LABEL[d]}`,
  );
  // 복습표 문제별 점수·오답 수
  for (let i = 0; i < 10; i++) {
    const row = page.locator('#review tbody tr').nth(i);
    const r = rows[i]!;
    expect(s.results[i]!.mark).toBe(r.mark);
    expect(s.results[i]!.deducted).toBe(r.deducted);
    expect(s.results[i]!.wrongs.length).toBe(r.wrongCount);
    const netText = r.net > 0 ? `+${r.net}` : r.net < 0 ? `−${-r.net}` : '0';
    await expect(row.locator('.net')).toHaveText(netText);
    if (r.wrongCount > 0) {
      await expect(row.locator('.wrong-note')).toContainText(`오답 ${r.wrongCount}번`);
      // review V2-R1: "오답:"은 한국어, 단어만 lang="en"
      const ww = row.locator('.wrong-words');
      await expect(ww).toHaveText(`오답: ${s.results[i]!.wrongs.join(', ')}`);
      expect(await ww.evaluate((el) => el.closest('[lang="en"]'))).toBe(null);
      await expect(ww.locator('span[lang="en"]')).toHaveText(s.results[i]!.wrongs.join(', '));
    }
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
  await expect(page.locator('#difficulty-desc')).toHaveText('조금 빨라요. 5~6학년 단어가 2개 섞여 나와요.');
  await page.click('[data-difficulty="hard"]');
  await expect(page.locator('#difficulty-desc')).toHaveText('빠르고 헷갈려요. 5~6학년 단어가 4개 나와요!');
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
  // Hard(5~6학년군): 오답 섞인 문제 2개 → 첫 시도 8개 → Very Hard 권유(v4). v9: 4~10번 중 4문제가 중학(vh)
  { d: 'hard', band: '5-6', seed: 23, wrongs: { 3: 2, 8: 1 }, challenge: '다음엔 Very Hard에 도전해 볼까요?' },
  // v9 Hard(3~4학년군): 4~10번 중 4문제가 5~6학년 문항, 그 오답은 5~6 풀. 오답 없음 → 첫 시도 10개
  { d: 'hard', band: '3-4', seed: 25, wrongs: {}, challenge: '다음엔 Very Hard에 도전해 볼까요?' },
  // Very Hard(학년 3~4를 골라도 Very Hard 풀): 1번 문제 점수 0에서 오답(깎인 것 없음), 오답 문제 2개 → 첫 시도 8개 → Very Hard 권유
  { d: 'veryhard', band: '3-4', seed: 24, wrongs: { 1: 1, 6: 2 }, challenge: 'Very Hard도 거뜬해요! 최고 점수에 도전해 봐요.' },
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
    // ⑤ 최고 점수 키(spec 5.5 v9): Easy는 catchword.best.<band>.easy 그대로, Normal·Hard는 catchword.best.v9.<band>.<d>,
    // Very Hard는 학년과 상관없이 catchword.best.v9.veryhard. 옛 Normal·Hard·Very Hard 키에는 쓰지 않는다
    const key =
      g.d === 'easy' ? `catchword.best.${g.band}.easy` : g.d === 'veryhard' ? 'catchword.best.v9.veryhard' : `catchword.best.v9.${g.band}.${g.d}`;
    expect(await page.evaluate((k) => localStorage.getItem(k), key)).toBe(String(score));
    const oldKey = g.d === 'veryhard' ? 'catchword.best.veryhard' : `catchword.best.${g.band}.${g.d}`;
    if (g.d !== 'easy') expect(await page.evaluate((k) => localStorage.getItem(k), oldKey)).toBe(null);
    // v8·v9: 정답 기억은 섞은 카드 더미 — 기본 더미 + 한 단계 위 더미(spec 5.6.1 ①-2).
    // seed 모드(?test=1&seed=)라 저장하지 않으므로 state().bag으로 확인하고, 옛 recent 키·bag 키가 없음을 본다.
    const bag = (await state(page)).bag;
    const names: Record<Diff, string[]> = {
      easy: [g.band],
      normal: [g.band, g.band === '3-4' ? '5-6' : 'vh-mid'],
      hard: [g.band, g.band === '3-4' ? '5-6' : 'vh-mid'],
      veryhard: ['vh-mid', 'vh-adv'],
    };
    expect(bag.names).toEqual(names[g.d]);
    expect(bag.persist).toBe(false);
    const [upCount] = UP[g.d];
    expect(bag.remaining[bag.names[0]!]).toBe(bag.sizes[bag.names[0]!] - (10 - upCount));
    if (upCount > 0) expect(bag.remaining[bag.names[1]!]).toBe(bag.sizes[bag.names[1]!] - upCount);
    const keys = await page.evaluate(() => Object.keys(localStorage));
    expect(keys.filter((k) => k.startsWith('catchword.recent') || k.startsWith('catchword.bag.'))).toEqual([]);
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

test('E8 v4 Very Hard 화면: 버튼 4칸, 고르면 학년 줄 흐림 + 안내, 기억·URL, 배지', async ({ page }) => {
  await page.goto('./?test=1');
  await expect(page.locator('[data-difficulty]')).toHaveCount(4);
  await expect(page.locator('[data-difficulty="veryhard"]')).toContainText('Very Hard');
  await expect(page.locator('[data-difficulty="veryhard"]')).toContainText('매우 어려움');
  await expect(page.locator('[data-difficulty="veryhard"] .icon.star')).toHaveCount(2);
  await expect(page.locator('[data-difficulty="hard"] .icon.star')).toHaveCount(1);
  await expect(page.locator('#band-note')).toBeHidden();
  await page.click('[data-difficulty="veryhard"]');
  await expect(page.locator('#difficulty-desc')).toHaveText('중학·심화 단어가 아주 빠르게! 최고의 도전!');
  await expect(page.locator('#band-note')).toHaveText('Very Hard는 학년과 상관없이 중학·심화 단어로 나와요');
  expect(await page.locator('#band-row').evaluate((el) => getComputedStyle(el).opacity)).toBe('0.4');
  // 흐려도 누를 수 있고 값은 기억
  await page.click('[data-band="5-6"]');
  await expect(page.locator('[data-band="5-6"]')).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.locator('[data-difficulty="veryhard"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#band-note')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('catchword.difficulty'))).toBe('veryhard');
  // 다른 난이도로 바꾸면 원래대로
  await page.click('[data-difficulty="normal"]');
  await expect(page.locator('#band-note')).toBeHidden();
  expect(await page.locator('#band-row').evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
  // URL ?difficulty=veryhard가 기억보다 우선 + 배지
  await page.goto('./?test=1&input=pointer&clock=manual&difficulty=veryhard');
  await expect(page.locator('[data-difficulty="veryhard"]')).toHaveAttribute('aria-pressed', 'true');
  await startTouchGame(page);
  await expect(page.locator('#diff-badge')).toHaveText('Very Hard');
});

test('E8 v9 한 줄 설명이 학년군에 따라 바로 바뀐다(Normal·Hard의 {위}: 3~4 → 5~6학년, 5~6·모두 → 중학)', async ({ page }) => {
  await page.goto('./?test=1&difficulty=normal&band=3-4');
  const desc = page.locator('#difficulty-desc');
  await expect(desc).toHaveText('조금 빨라요. 5~6학년 단어가 2개 섞여 나와요.');
  await page.click('[data-band="5-6"]');
  await expect(desc).toHaveText('조금 빨라요. 중학 단어가 2개 섞여 나와요.');
  await page.click('[data-band="all"]');
  await expect(desc).toHaveText('조금 빨라요. 중학 단어가 2개 섞여 나와요.');
  await page.click('[data-difficulty="hard"]');
  await expect(desc).toHaveText('빠르고 헷갈려요. 중학 단어가 4개 나와요!');
  await page.click('[data-band="3-4"]');
  await expect(desc).toHaveText('빠르고 헷갈려요. 5~6학년 단어가 4개 나와요!');
  await page.click('[data-difficulty="easy"]');
  await expect(desc).toHaveText('천천히 떨어져요. 처음 하는 친구에게 좋아요.');
  await page.click('[data-band="5-6"]');
  await expect(desc).toHaveText('천천히 떨어져요. 처음 하는 친구에게 좋아요.');
  await page.click('[data-difficulty="veryhard"]');
  await expect(desc).toHaveText('중학·심화 단어가 아주 빠르게! 최고의 도전!');
  await page.click('[data-band="3-4"]');
  await expect(desc).toHaveText('중학·심화 단어가 아주 빠르게! 최고의 도전!');
});
