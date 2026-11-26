import { expect, test, type Page } from '@playwright/test';
import { clickAt, startTouchGame, state, step, stepUntil, watchPage } from './helpers.ts';
import { macVoices } from '../helpers/voices.ts';

// E9(spec 12.2 v5): speechSynthesis.getVoices가 이 맥 목록(voicePick ①)을 돌려주고 speak가 넘겨받은 목소리를 기록하게 바꾼다.
async function installFakeSpeech(page: Page, delayMs: number | null): Promise<void> {
  await page.addInitScript(
    ({ voices, delay }) => {
      type Rec = { text: string; voice: string | null; lang: string; rate: number; pitch: number };
      const w = window as unknown as { __spoken: Rec[]; SpeechSynthesisUtterance: unknown };
      w.__spoken = [];
      class FakeUtterance {
        text: string;
        voice: { name: string } | null = null;
        lang = '';
        rate = 1;
        pitch = 1;
        volume = 1;
        constructor(t: string) {
          this.text = t;
        }
      }
      w.SpeechSynthesisUtterance = FakeUtterance;
      const synth = window.speechSynthesis;
      let list = delay === null ? voices : [];
      Object.defineProperty(synth, 'getVoices', { value: () => list, configurable: true });
      Object.defineProperty(synth, 'speak', {
        value: (u: FakeUtterance) =>
          w.__spoken.push({ text: u.text, voice: u.voice ? u.voice.name : null, lang: u.lang, rate: u.rate, pitch: u.pitch }),
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
    { voices: macVoices(), delay: delayMs },
  );
}

type Spoken = { text: string; voice: string | null; lang: string; rate: number; pitch: number };
const spoken = async (page: Page): Promise<Spoken[]> =>
  (await page.evaluate(() => (window as unknown as { __spoken: Spoken[] }).__spoken)).filter((s) => s.text.trim() !== '');

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

test('E9 목소리: 이 맥 목록에서 설명·단어 읽기가 모두 Samantha, Albert 0회', async ({ page, baseURL }, info) => {
  const touch = info.project.use.hasTouch === true;
  const w = watchPage(page, new URL(baseURL!).origin);
  await installFakeSpeech(page, null);
  await page.goto('./?input=pointer&seed=7&test=1&clock=manual&difficulty=easy&debug=1');
  await startTouchGame(page);
  const clues = await playTouchGame(page, touch);
  const sp = await spoken(page);
  for (const c of clues) expect(sp.some((x) => x.text === c), c).toBe(true);
  expect(sp.length).toBeGreaterThanOrEqual(20); // 설명 10 + 정답 단어 10
  expect(sp.every((x) => x.voice === 'Samantha')).toBe(true);
  expect(sp.filter((x) => x.voice === 'Albert').length).toBe(0);
  expect(sp.every((x) => x.rate === 0.9 && x.pitch === 1 && x.lang === 'en-US')).toBe(true);
  expect((await state(page)).voice).toBe('Samantha (en-US, local, B) · voice');
  await expect(page.locator('#debug-panel')).toContainText('voice Samantha (en-US, local, B) · voice');
  expect(w.errors, w.errors.join('\n')).toEqual([]);
});

test('E9 목소리: 처음 빈 목록 → 0.5초 뒤 voiceschanged여도 첫 설명이 건너뛰어지지 않고, 그 뒤는 Samantha', async ({ page }, info) => {
  const touch = info.project.use.hasTouch === true;
  await installFakeSpeech(page, 500);
  await page.goto('./?input=pointer&seed=7&test=1&clock=manual&difficulty=easy');
  // 목록이 오기 전에 첫 문제를 시작한다(수동 시계라 실제 시간은 거의 흐르지 않음)
  await startTouchGame(page);
  const first = (await state(page)).clue!;
  let sp = await spoken(page);
  expect(sp.length).toBe(1);
  expect(sp[0]!.text).toBe(first);
  expect(sp[0]!.voice).toBe(null); // lang-only
  expect(sp[0]!.lang).toBe('en-US');
  // 목록이 온 뒤
  await expect.poll(async () => (await state(page)).voice).toContain('Samantha');
  await playTouchGame(page, touch);
  sp = await spoken(page);
  expect(sp.slice(1).length).toBeGreaterThan(0);
  expect(sp.slice(1).every((x) => x.voice === 'Samantha')).toBe(true);
  expect(sp.filter((x) => x.voice === 'Albert').length).toBe(0);
});
