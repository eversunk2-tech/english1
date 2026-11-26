import { expect, test, type Page } from '@playwright/test';
import { clickAt, startTouchGame, state, step, stepUntil, watchPage } from './helpers.ts';
import { macChromeVoices, macVoices, windowsChromeVoices, type FakeVoice } from '../helpers/voices.ts';

// E9(spec 12.2 v7): speechSynthesis.getVoices가 정한 목록을 돌려주고, speak가 넘겨받은 {text, voice?.name, lang, rate, pitch}를
// 기록하며, 발화의 onstart·onend를 흉내(local은 바로, remote는 'start' 바로 시작 / 'never' 시작 안 함)하게 바꾼다.
// 공통: 소리가 있는 발화 중 voice가 null이거나 ko-*인 것 0개, Albert 0회.
type RemoteMode = 'start' | 'never';
type FakeOpts = { voices: FakeVoice[]; delay: number | null; remote: RemoteMode };

async function installFakeSpeech(page: Page, o: FakeOpts): Promise<void> {
  await page.addInitScript(
    ({ voices, delay, remote }) => {
      type Rec = { text: string; voice: string | null; voiceLang: string | null; lang: string; rate: number; pitch: number };
      const w = window as unknown as { __spoken: Rec[]; SpeechSynthesisUtterance: unknown };
      w.__spoken = [];
      type V = { name: string; lang: string; localService: boolean };
      class FakeUtterance {
        text: string;
        voice: V | null = null;
        lang = '';
        rate = 1;
        pitch = 1;
        volume = 1;
        onstart: (() => void) | null = null;
        onend: (() => void) | null = null;
        onerror: ((e: { error: string }) => void) | null = null;
        constructor(t: string) {
          this.text = t;
        }
      }
      w.SpeechSynthesisUtterance = FakeUtterance;
      const synth = window.speechSynthesis;
      let list: V[] = delay === null ? voices : [];
      Object.defineProperty(synth, 'getVoices', { value: () => list, configurable: true });
      Object.defineProperty(synth, 'speak', {
        value: (u: FakeUtterance) => {
          w.__spoken.push({
            text: u.text,
            voice: u.voice ? u.voice.name : null,
            voiceLang: u.voice ? u.voice.lang : null,
            lang: u.lang,
            rate: u.rate,
            pitch: u.pitch,
          });
          const isRemote = u.voice !== null && u.voice.localService === false;
          if (isRemote && remote === 'never') return; // 인터넷 끊김: 시작하지 않음
          setTimeout(() => {
            u.onstart?.();
            setTimeout(() => u.onend?.(), 20);
          }, isRemote ? 30 : 0);
        },
        configurable: true,
      });
      Object.defineProperty(synth, 'cancel', { value: () => undefined, configurable: true });
      if (delay !== null) {
        setTimeout(() => {
          list = voices;
          synth.dispatchEvent(new Event('voiceschanged'));
        }, delay);
      }
    },
    { voices: o.voices, delay: o.delay, remote: o.remote },
  );
}

type Spoken = { text: string; voice: string | null; voiceLang: string | null; lang: string; rate: number; pitch: number };
const spoken = async (page: Page): Promise<Spoken[]> =>
  (await page.evaluate(() => (window as unknown as { __spoken: Spoken[] }).__spoken)).filter((s) => s.text.trim() !== '');

/** 모든 경우에 공통 */
function expectCommon(sp: Spoken[]): void {
  for (const x of sp) {
    expect(x.voice, `"${x.text}" voice null`).not.toBe(null);
    expect((x.voiceLang ?? '').toLowerCase().startsWith('ko'), `"${x.text}" ${x.voice}`).toBe(false);
  }
  expect(sp.filter((x) => x.voice === 'Albert').length).toBe(0);
  expect(sp.every((x) => x.rate === 0.9 && x.pitch === 1)).toBe(true);
}

async function playTouchGame(page: Page, touch: boolean): Promise<string[]> {
  const clues: string[] = [];
  for (let q = 1; q <= 10; q++) {
    const s = await stepUntil(page, (st) => st.question === q && st.phase === 'falling' && st.cards.some((c) => c.correct && c.grabbable && c.rect.y > st.bandH + 20));
    clues.push(s.clue!);
    const c = s.cards.find((x) => x.correct)!;
    await clickAt(page, c.rect.x + c.rect.w / 2, c.rect.y + c.rect.h / 2, touch);
    await step(page, 1600);
  }
  await stepUntil(page, (st) => st.screen === 'result');
  return clues;
}

const URL_DEBUG = './?input=pointer&seed=7&test=1&clock=manual&difficulty=easy&debug=1';
const GOOGLE = 'Google US English';
const HINT = '더 자연스러운 목소리: 고품질 영어 목소리를 내려받으세요';

test('E9 ① 맥 Safari 목록(Google 없음) → 설명·단어 읽기 모두 Samantha, Albert 0회', async ({ page, baseURL }, info) => {
  const touch = info.project.use.hasTouch === true;
  const w = watchPage(page, new URL(baseURL!).origin);
  await installFakeSpeech(page, { voices: macVoices(), delay: null, remote: 'start' });
  await page.goto(URL_DEBUG);
  await startTouchGame(page);
  const clues = await playTouchGame(page, touch);
  const sp = await spoken(page);
  for (const c of clues) expect(sp.some((x) => x.text === c), c).toBe(true);
  expect(sp.length).toBeGreaterThanOrEqual(20); // 설명 10 + 정답 단어 10
  expect(sp.every((x) => x.voice === 'Samantha' && x.lang === 'en-US')).toBe(true);
  expectCommon(sp);
  expect((await state(page)).voice).toBe('Samantha (en-US, local, B) · voice');
  await expect(page.locator('#debug-panel')).toContainText('voice Samantha (en-US, local, B) · voice');
  // 5.9.1 디버그·5.9.3: 애플 기기 안 보통 목소리 → 고품질 안내 한 줄
  await expect(page.locator('#debug-panel')).toContainText(HINT);
  expect(w.errors, w.errors.join('\n')).toEqual([]);
});

test('E9 ② 맥 Chrome 목록(remote 바로 시작) → 모두 Google US English', async ({ page, baseURL }, info) => {
  const touch = info.project.use.hasTouch === true;
  const w = watchPage(page, new URL(baseURL!).origin);
  await installFakeSpeech(page, { voices: macChromeVoices(), delay: null, remote: 'start' });
  await page.goto(URL_DEBUG);
  await startTouchGame(page);
  const clues = await playTouchGame(page, touch);
  const sp = await spoken(page);
  for (const c of clues) expect(sp.some((x) => x.text === c), c).toBe(true);
  expect(sp.length).toBeGreaterThanOrEqual(20);
  expect(sp.every((x) => x.voice === GOOGLE && x.lang === 'en-US')).toBe(true);
  expectCommon(sp);
  expect((await state(page)).voice).toBe('Google US English (en-US, remote, G) · voice');
  await expect(page.locator('#debug-panel')).toContainText('voice Google US English (en-US, remote, G) · voice');
  await expect(page.locator('#debug-panel')).not.toContainText(HINT);
  expect(w.errors, w.errors.join('\n')).toEqual([]);
});

test('E9 ③ 맥 Chrome 목록 + 인터넷 끊김 → 첫 설명은 Google 한 번, 약 1.5초 뒤 같은 문장을 Samantha로, 그 뒤 모두 Samantha', async ({ page, baseURL }, info) => {
  const touch = info.project.use.hasTouch === true;
  const w = watchPage(page, new URL(baseURL!).origin);
  await installFakeSpeech(page, { voices: macChromeVoices(), delay: null, remote: 'never' });
  await page.goto(URL_DEBUG);
  await startTouchGame(page);
  const first = (await state(page)).clue!;
  let sp = await spoken(page);
  expect(sp.length).toBe(1);
  expect(sp[0]).toMatchObject({ text: first, voice: GOOGLE });
  const t0 = Date.now();
  // 실제 시간 약 1.5초 뒤 같은 문장을 Samantha로 다시
  await expect.poll(async () => (await spoken(page)).length, { timeout: 5000 }).toBe(2);
  const waited = Date.now() - t0;
  expect(waited).toBeLessThan(3000);
  sp = await spoken(page);
  expect(sp[1]).toMatchObject({ text: first, voice: 'Samantha' });
  expect((await state(page)).voice).toBe('Samantha (en-US, local, B) · voice · 인터넷 목소리 끔');
  // 게임은 10문제 끝까지(소리와 상관없이 문제가 진행됨)
  const clues = await playTouchGame(page, touch);
  expect(clues.length).toBe(10);
  sp = await spoken(page);
  expect(sp.slice(1).every((x) => x.voice === 'Samantha')).toBe(true);
  expect(sp.filter((x) => x.voice === GOOGLE).length).toBe(1);
  for (const c of clues) expect(sp.some((x) => x.text === c && x.voice === 'Samantha'), c).toBe(true);
  expectCommon(sp);
  expect((await state(page)).voice.endsWith('· 인터넷 목소리 끔')).toBe(true);
  expect(w.errors, w.errors.join('\n')).toEqual([]);
});

test('E9 ④ 처음 빈 목록 → 0.5초 뒤 voiceschanged(맥 Chrome 목록) → 첫 설명이 건너뛰어지지 않고 Google US English로', async ({ page }, info) => {
  const touch = info.project.use.hasTouch === true;
  await installFakeSpeech(page, { voices: macChromeVoices(), delay: 500, remote: 'start' });
  await page.goto('./?input=pointer&seed=7&test=1&clock=manual&difficulty=easy');
  await startTouchGame(page);
  const first = (await state(page)).clue!;
  await expect.poll(async () => (await spoken(page)).length, { timeout: 5000 }).toBeGreaterThanOrEqual(1);
  let sp = await spoken(page);
  expect(sp[0]).toMatchObject({ text: first, voice: GOOGLE, lang: 'en-US' });
  await playTouchGame(page, touch);
  sp = await spoken(page);
  expect(sp.length).toBeGreaterThanOrEqual(20);
  expect(sp.every((x) => x.voice === GOOGLE)).toBe(true);
  expectCommon(sp);
});

test('E9 ⑤ 목록이 끝내 빈 채 → 소리가 있는 발화 0개, 결과 화면까지 정상, 콘솔 오류 0', async ({ page, baseURL }, info) => {
  const touch = info.project.use.hasTouch === true;
  const w = watchPage(page, new URL(baseURL!).origin);
  await installFakeSpeech(page, { voices: [], delay: null, remote: 'start' });
  await page.goto(URL_DEBUG);
  await startTouchGame(page);
  const clues = await playTouchGame(page, touch);
  expect(clues.length).toBe(10);
  await page.waitForTimeout(1200); // 마지막 기다림(1초)도 지나게
  expect(await spoken(page)).toEqual([]);
  expect((await state(page)).screen).toBe('result');
  expect(['wait', 'skip']).toContain((await state(page)).voice);
  expect(w.errors, w.errors.join('\n')).toEqual([]);
});

test('E9 ⑥ 윈도 Chrome 목록(remote 바로 시작) → 모두 Microsoft David, Google 0회(U1 "윈도는 지금 그대로")', async ({ page, baseURL }, info) => {
  const touch = info.project.use.hasTouch === true;
  const w = watchPage(page, new URL(baseURL!).origin);
  await installFakeSpeech(page, { voices: windowsChromeVoices(), delay: null, remote: 'start' });
  await page.goto(URL_DEBUG);
  await startTouchGame(page);
  await playTouchGame(page, touch);
  const sp = await spoken(page);
  expect(sp.length).toBeGreaterThanOrEqual(20);
  expect(sp.every((x) => x.voice === 'Microsoft David - English (United States)')).toBe(true);
  expect(sp.filter((x) => (x.voice ?? '').startsWith('Google')).length).toBe(0);
  expectCommon(sp);
  expect((await state(page)).voice).toBe('Microsoft David - English (United States) (en-US, local, B) · voice');
  await expect(page.locator('#debug-panel')).not.toContainText(HINT);
  expect(w.errors, w.errors.join('\n')).toEqual([]);
});
