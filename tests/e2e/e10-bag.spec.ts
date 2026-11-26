// spec 12.2 E10 (v8): 섞은 카드 더미 — 이어짐·경계·버린 판 되돌리기·"모두" 공유·seed는 테스트 모드에서만·저장 막힘·옛 키 옮기기.
// 기대값은 spec 5.6.1 문장과 questions.json에서 따로 세운다(정답은 문제마다 state()의 정답 카드로 읽어 모음).
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { clickAt, startTouchGame, state, step, stepUntil, watchPage } from './helpers.ts';

interface Q {
  id: string;
  word: string;
  band: string;
}
const MAIN = (JSON.parse(readFileSync(new URL('../../src/data/questions.json', import.meta.url), 'utf8')) as { questions: Q[] }).questions;
const VH = (JSON.parse(readFileSync(new URL('../../src/data/veryhard.json', import.meta.url), 'utf8')) as { questions: Q[] }).questions;
const ADVANCED = new Set(
  (JSON.parse(readFileSync(new URL('../../src/data/vocab/clue-extra.json', import.meta.url), 'utf8')) as { veryhardAdvanced: string[] }).veryhardAdvanced,
);
const VH_MID = VH.filter((q) => !ADVANCED.has(q.word)).map((q) => q.id);
const VH_ADV = VH.filter((q) => ADVANCED.has(q.word)).map((q) => q.id);
const ID_OF = new Map([...MAIN, ...VH].map((q) => [q.word, q.id]));
const IDS_56 = MAIN.filter((q) => q.band === '5-6').map((q) => q.id);
const IDS_34 = new Set(MAIN.filter((q) => q.band === '3-4').map((q) => q.id));

const BASE = './?input=pointer&test=1&clock=manual&difficulty=easy';

const idOf = (w: string): string => {
  const id = ID_OF.get(w);
  if (!id) throw new Error(`questions.json·veryhard.json에 없는 단어 ${w}`);
  return id;
};

/** 정답만 눌러 문제 upTo까지 푼다(upTo가 10이면 결과 화면까지). 문제마다 정답 단어를 모은다. */
async function playFast(page: Page, touch: boolean, upTo = 10): Promise<string[]> {
  const words: string[] = [];
  for (let q = 1; q <= upTo; q++) {
    const s = await stepUntil(page, (st) => st.question === q && st.phase === 'falling' && st.cards.some((c) => c.correct && c.grabbable && c.rect.y > st.bandH + 20));
    const c = s.cards.find((x) => x.correct)!;
    expect(s.answer).toBe(c.word);
    words.push(c.word);
    await clickAt(page, c.rect.x + c.rect.w / 2, c.rect.y + c.rect.h / 2, touch);
    expect((await state(page)).phase).toBe('correct');
    await step(page, 1600);
  }
  if (upTo === 10) await stepUntil(page, (st) => st.screen === 'result');
  return words;
}

async function bagOf(page: Page, name: string): Promise<{ v: number; used: string[]; recent: string[] } | null> {
  const raw = await page.evaluate((k) => localStorage.getItem(k), `catchword.bag.${name}`);
  return raw === null ? null : (JSON.parse(raw) as { v: number; used: string[]; recent: string[] });
}

async function again(page: Page): Promise<void> {
  await page.click('#btn-again');
  await step(page, 3100);
  expect((await state(page)).screen).toBe('playing');
}

test('E10 ① 이어짐: 5~6 두 판 → 20개 모두 다름·used 20·남은 67 → 새로고침 → 한 판 겹침 0·used 30', async ({ page, baseURL }, info) => {
  test.setTimeout(150_000);
  const touch = info.project.use.hasTouch === true;
  const w = watchPage(page, new URL(baseURL!).origin);
  await page.goto(`${BASE}&band=5-6`);
  await startTouchGame(page);
  const g1 = await playFast(page, touch);
  await again(page);
  const g2 = await playFast(page, touch);
  const ids20 = [...g1, ...g2].map(idOf);
  expect(new Set(ids20).size).toBe(20);
  const bag = await bagOf(page, '5-6');
  expect(bag!.v).toBe(1);
  expect(bag!.used).toEqual(ids20);
  const s = await state(page);
  expect(s.bag.names).toEqual(['5-6']);
  expect(s.bag.persist).toBe(true);
  expect(s.bag.sizes['5-6']).toBe(87);
  expect(s.bag.remaining['5-6']).toBe(67);

  await page.reload();
  await startTouchGame(page);
  const g3 = (await playFast(page, touch)).map(idOf);
  expect(g3.filter((id) => ids20.includes(id))).toEqual([]);
  const after = await bagOf(page, '5-6');
  expect(after!.used.length).toBe(30);
  expect(after!.used).toEqual([...ids20, ...g3]);
  expect(w.errors, w.errors.join('\n')).toEqual([]);
});

test('E10 ② 경계: used 80개·recent 마지막 30개 → 남은 7개 모두 + 새 바퀴 3개(7개·recent 아님), 판 뒤 used 3개', async ({ page }, info) => {
  const touch = info.project.use.hasTouch === true;
  const used80 = IDS_56.slice(0, 80);
  const left7 = IDS_56.slice(80);
  const recent30 = used80.slice(-30).reverse();
  expect(left7.length).toBe(7);
  await page.addInitScript((v) => localStorage.setItem('catchword.bag.5-6', v), JSON.stringify({ v: 1, used: used80, recent: recent30 }));
  await page.goto(`${BASE}&band=5-6`);
  expect((await state(page)).bag.remaining['5-6']).toBe(7);
  await startTouchGame(page);
  const ids = (await playFast(page, touch)).map(idOf);
  expect(new Set(ids).size).toBe(10);
  for (const id of left7) expect(ids).toContain(id);
  const extra = ids.filter((id) => !left7.includes(id));
  expect(extra.length).toBe(3);
  for (const id of extra) expect(recent30).not.toContain(id);
  const bag = await bagOf(page, '5-6');
  expect(bag!.used.slice().sort()).toEqual(extra.slice().sort());
});

test('E10 ③ 버린 판 되돌리기: 3번 문제가 나온 뒤 일시정지 → [처음으로] → used·recent = 1~3번 정답 3개', async ({ page }, info) => {
  const touch = info.project.use.hasTouch === true;
  await page.goto(`${BASE}&band=3-4`);
  await startTouchGame(page);
  const shown = await playFast(page, touch, 2);
  const s3 = await stepUntil(page, (st) => st.question === 3 && st.answer !== null);
  shown.push(s3.answer!);
  // 판 시작 때 10개를 "낸 것"으로 저장해 둔다
  expect((await bagOf(page, '3-4'))!.used.length).toBe(10);
  await page.click('#pause-btn');
  expect((await state(page)).screen).toBe('paused');
  await page.click('#btn-home');
  expect((await state(page)).screen).toBe('start');
  const bag = await bagOf(page, '3-4');
  const ids3 = shown.map(idOf);
  expect(bag!.used).toEqual(ids3);
  expect(bag!.recent.slice().sort()).toEqual(ids3.slice().sort());
  expect((await state(page)).bag.remaining['3-4']).toBe(140);
});

test('E10 ④ "모두" 공유: 3~4 한 판 뒤 [모두] 한 판 → 겹침 0, 3-4·5-6 used 합 20', async ({ page }, info) => {
  test.setTimeout(120_000);
  const touch = info.project.use.hasTouch === true;
  await page.goto(`${BASE}&band=3-4`);
  await startTouchGame(page);
  const g1 = (await playFast(page, touch)).map(idOf);
  await page.click('#btn-home');
  expect((await state(page)).screen).toBe('start');
  await page.click('[data-band="all"]');
  await startTouchGame(page);
  expect((await state(page)).bag.names).toEqual(['3-4', '5-6']);
  const g2 = (await playFast(page, touch)).map(idOf);
  expect(g2.filter((id) => g1.includes(id))).toEqual([]);
  const b34 = await bagOf(page, '3-4');
  const b56 = await bagOf(page, '5-6');
  expect(b34!.used.length + (b56?.used.length ?? 0)).toBe(20);
  // 뽑힌 문항은 제 학년군 더미에
  expect(b34!.used).toEqual([...g1, ...g2.filter((id) => IDS_34.has(id))]);
  expect(b56?.used ?? []).toEqual(g2.filter((id) => !IDS_34.has(id)));
});

test('E10 ⑤-a seed는 테스트 모드에서만: ?seed=7(test=1 없음)은 무시되고 보통처럼 더미를 저장', async ({ page }) => {
  // v9: 기본 난이도(Normal)는 5~6 판에서 중학 2문제를 섞으므로 E10의 다른 판과 같이 Easy로 연다(5-6 더미에 10개)
  await page.goto('./?input=pointer&seed=7&band=5-6&difficulty=easy');
  expect(await page.evaluate(() => typeof window.__eg)).toBe('undefined');
  await page.click('#btn-touch');
  await page.click('#start-card');
  // 보통 시계로 3·2·1이 지나 판이 시작되면 used 10개가 저장돼 있음
  await expect
    .poll(async () => (await bagOf(page, '5-6'))?.used.length ?? 0, { timeout: 15_000 })
    .toBe(10);
});

test('E10 ⑤-b seed 모드(?test=1&seed=7): 두 번 열어도 첫 판 정답이 같고, 저장된 더미를 읽지도 쓰지도 않음', async ({ page, context }, info) => {
  test.setTimeout(150_000);
  const touch = info.project.use.hasTouch === true;
  const pre = JSON.stringify({ v: 1, used: IDS_56.slice(0, 40), recent: IDS_56.slice(30, 40).reverse() });
  await context.addInitScript((v) => {
    if (localStorage.getItem('catchword.bag.5-6') === null) localStorage.setItem('catchword.bag.5-6', v);
  }, pre);
  const url = `${BASE}&seed=7&band=5-6`;
  const runs: string[][] = [];
  for (const p of [page, await context.newPage()]) {
    await p.goto(url);
    const s0 = await state(p);
    expect(s0.bag.persist).toBe(false);
    // 미리 넣은 값(40개 낸 것)을 읽지 않고 빈 메모리 더미에서 시작
    expect(s0.bag.remaining['5-6']).toBe(87);
    await startTouchGame(p);
    runs.push(await playFast(p, touch));
    expect(await p.evaluate(() => localStorage.getItem('catchword.bag.5-6'))).toBe(pre);
    const keys = await p.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('catchword.bag.')));
    expect(keys).toEqual(['catchword.bag.5-6']);
    expect((await state(p)).bag.remaining['5-6']).toBe(77);
  }
  expect(runs[0]).toEqual(runs[1]);
  // 미리 넣은 40개 중에서도 뽑힐 수 있다(읽지 않았으므로) — 10개가 서로 다름만 확인
  expect(new Set(runs[0]).size).toBe(10);
});

test('E10 ⑥ 저장 막힘: getItem·setItem·removeItem이 예외 → 두 판 20개 모두 다름, 콘솔 오류 0, 결과 화면 정상', async ({ page, baseURL }, info) => {
  test.setTimeout(150_000);
  const touch = info.project.use.hasTouch === true;
  const w = watchPage(page, new URL(baseURL!).origin);
  await page.addInitScript(() => {
    const boom = (): never => {
      throw new DOMException('blocked', 'SecurityError');
    };
    Storage.prototype.getItem = boom;
    Storage.prototype.setItem = boom;
    Storage.prototype.removeItem = boom;
  });
  await page.goto(`${BASE}&band=5-6`);
  await startTouchGame(page);
  const g1 = await playFast(page, touch);
  await expect(page.locator('#result-correct')).toContainText('10 / 10');
  await again(page);
  const g2 = await playFast(page, touch);
  await expect(page.locator('#result-correct')).toContainText('10 / 10');
  expect(new Set([...g1, ...g2]).size).toBe(20);
  expect((await state(page)).bag.remaining['5-6']).toBe(67);
  expect(w.errors, w.errors.join('\n')).toEqual([]);
});

test('E10 ⑦ 옛 키 옮기기: catchword.recent = ["cat","dog"] → 지워지고 3-4 used에 두 id, 그 판 정답에 cat·dog 없음', async ({ page }, info) => {
  const touch = info.project.use.hasTouch === true;
  await page.addInitScript(() => localStorage.setItem('catchword.recent', JSON.stringify(['cat', 'dog'])));
  await page.goto(`${BASE}&band=3-4`);
  expect(await page.evaluate(() => localStorage.getItem('catchword.recent'))).toBe(null);
  const before = await bagOf(page, '3-4');
  expect(before!.used.slice().sort()).toEqual([idOf('cat'), idOf('dog')].sort());
  await startTouchGame(page);
  const words = await playFast(page, touch);
  expect(words).not.toContain('cat');
  expect(words).not.toContain('dog');
  const after = await bagOf(page, '3-4');
  expect(after!.used.slice(0, 2).sort()).toEqual([idOf('cat'), idOf('dog')].sort());
  expect(after!.used.length).toBe(12);
});

test('E10 v9 Hard 5~6 한 판 → catchword.bag.5-6에 6개·catchword.bag.vh-mid에 4개(한 단계 위 문제는 4~10번)', async ({ page }, info) => {
  test.setTimeout(120_000);
  const touch = info.project.use.hasTouch === true;
  await page.goto('./?input=pointer&test=1&clock=manual&difficulty=hard&band=5-6');
  await startTouchGame(page);
  const s0 = await state(page);
  expect(s0.bag.names).toEqual(['5-6', 'vh-mid']);
  expect(s0.bag.persist).toBe(true);
  expect(s0.bag.sizes['vh-mid']).toBe(71);
  expect(s0.bag.sizes['vh-adv']).toBe(48);
  const levels = s0.plans.map((p) => p.level);
  const ids = (await playFast(page, touch)).map(idOf);
  const b56 = await bagOf(page, '5-6');
  const bmid = await bagOf(page, 'vh-mid');
  expect(b56!.used.length).toBe(6);
  expect(bmid!.used.length).toBe(4);
  expect(await bagOf(page, 'vh-adv')).toBe(null);
  // 한 단계 위(up) 문제 = 중학 더미에 들어간 4개, 모두 4~10번
  const upIds = ids.filter((_, i) => levels[i] === 'up');
  expect(upIds.slice().sort()).toEqual(bmid!.used.slice().sort());
  expect(levels.slice(0, 3)).toEqual(['base', 'base', 'base']);
  for (const id of upIds) expect(VH_MID).toContain(id);
  expect(ids.filter((_, i) => levels[i] === 'base').slice().sort()).toEqual(b56!.used.slice().sort());
  const s1 = await state(page);
  expect(s1.bag.remaining['5-6']).toBe(81);
  expect(s1.bag.remaining['vh-mid']).toBe(67);
});

test('E10 v9 옛 catchword.bag.veryhard → 열면 vh-mid·vh-adv 두 키로 나뉘고 지워짐, 그 판(Very Hard)은 옮긴 문항을 내지 않음', async ({ page }, info) => {
  test.setTimeout(120_000);
  const touch = info.project.use.hasTouch === true;
  const used = [VH_MID[0]!, VH_ADV[0]!, VH_MID[1]!, VH_ADV[1]!, VH_MID[2]!];
  const recent = used.slice().reverse();
  await page.addInitScript((v) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('catchword.bag.veryhard', v);
      sessionStorage.setItem('seeded', '1');
    }
  }, JSON.stringify({ v: 1, used, recent }));
  await page.goto('./?input=pointer&test=1&clock=manual&difficulty=veryhard');
  expect(await page.evaluate(() => localStorage.getItem('catchword.bag.veryhard'))).toBe(null);
  expect(await bagOf(page, 'vh-mid')).toEqual({ v: 1, used: [VH_MID[0], VH_MID[1], VH_MID[2]], recent: [VH_MID[2], VH_MID[1], VH_MID[0]] });
  expect(await bagOf(page, 'vh-adv')).toEqual({ v: 1, used: [VH_ADV[0], VH_ADV[1]], recent: [VH_ADV[1], VH_ADV[0]] });
  const s0 = await state(page);
  expect(s0.bag.names).toEqual(['vh-mid', 'vh-adv']);
  expect(s0.bag.remaining['vh-mid']).toBe(68);
  expect(s0.bag.remaining['vh-adv']).toBe(46);
  await startTouchGame(page);
  const ids = (await playFast(page, touch)).map(idOf);
  for (const id of used) expect(ids).not.toContain(id);
  // Very Hard 한 판: 중학 6 + 심화 4
  expect(ids.filter((id) => VH_ADV.includes(id)).length).toBe(4);
  expect(ids.filter((id) => VH_MID.includes(id)).length).toBe(6);
  expect((await bagOf(page, 'vh-mid'))!.used.length).toBe(3 + 6);
  expect((await bagOf(page, 'vh-adv'))!.used.length).toBe(2 + 4);
});

test('E10 v9 seed 모드(?test=1&seed=)는 옛 catchword.bag.veryhard를 옮기지도 지우지도 않는다', async ({ page }) => {
  const old = JSON.stringify({ v: 1, used: [VH_MID[0]], recent: [VH_MID[0]] });
  await page.addInitScript((v) => {
    if (localStorage.getItem('catchword.bag.veryhard') === null) localStorage.setItem('catchword.bag.veryhard', v);
  }, old);
  await page.goto('./?input=pointer&test=1&clock=manual&seed=3&difficulty=veryhard');
  expect((await state(page)).bag.persist).toBe(false);
  expect(await page.evaluate(() => localStorage.getItem('catchword.bag.veryhard'))).toBe(old);
  expect(await bagOf(page, 'vh-mid')).toBe(null);
  expect(await bagOf(page, 'vh-adv')).toBe(null);
});
