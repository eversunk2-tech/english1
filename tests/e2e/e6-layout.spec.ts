import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { tokenize } from '../../src/data/words.ts';
import type { QuestionsFile } from '../../src/game/types.ts';
import { lineBreaks, startTouchGame } from './helpers.ts';

// 부록 A(questions.json)와 Very Hard(veryhard.json) 문항 모두 — Very Hard에는 11자 낱말(temperature, anniversary)이 있다
const qs = [
  ...(JSON.parse(readFileSync(new URL('../../src/data/questions.json', import.meta.url), 'utf8')) as QuestionsFile).questions,
  ...(JSON.parse(readFileSync(new URL('../../src/data/veryhard.json', import.meta.url), 'utf8')) as QuestionsFile).questions,
];
const maxTokens = Math.max(...qs.map((q) => tokenize(q.clue).length));
const longestClues = qs.filter((q) => tokenize(q.clue).length === maxTokens).map((q) => q.clue);
const maxLen = Math.max(...qs.map((q) => q.word.length));
const longestWords = qs.filter((q) => q.word.length === maxLen).map((q) => q.word);

test('E6 배치: 가장 긴 설명·가장 긴 단어가 넘치지 않음(설명 두 줄 이내, 카드 글자 폭 ≤ 카드 폭 − 24)', async ({ page }, info) => {
  expect(maxTokens).toBe(10);
  expect(maxLen).toBe(11);
  expect(longestWords).toEqual(expect.arrayContaining(['temperature', 'anniversary']));
  await page.goto('./?input=pointer&seed=1&test=1&clock=manual');
  await startTouchGame(page);
  const sizes = [page.viewportSize()!];
  if (info.project.name === 'small-landscape') sizes.push({ width: 768, height: 1024 });
  for (const size of sizes) {
    await page.setViewportSize(size);
    await page.waitForTimeout(50);
    // 모든 설명(가장 긴 10낱말 포함)이 두 줄 안, 띠 안
    for (const clue of [...longestClues, ...qs.map((q) => q.clue)]) {
      const r = await page.evaluate(([c, w]) => window.__eg!.probeLayout(c, w), [clue, longestWords[0]!] as const);
      expect(r.clueLines, `${size.width}×${size.height} "${clue}" ${r.clueFontPx}px`).toBeLessThanOrEqual(2);
      expect(r.clueHeight).toBeLessThanOrEqual(r.bandH);
      expect(r.clueFontPx).toBeGreaterThanOrEqual(14);
    }
    for (const word of longestWords) {
      const r = await page.evaluate(([c, w]) => window.__eg!.probeLayout(c, w), [longestClues[0]!, word] as const);
      expect(r.cardTextW, `${size.width}×${size.height} ${word} ${r.cardFontPx}px`).toBeLessThanOrEqual(r.cardW - 24);
    }
  }
  // 놀이 중 실제 카드도 넘치지 않음
  const st = await page.evaluate(() => window.__eg!.state());
  for (const c of st.cards) expect(c.textW).toBeLessThanOrEqual(c.rect.w - 24);
});

test('E6 v2·v4: 시작 화면이 4종 화면에서 스크롤 없이 들어가고, 난이도 버튼 4개가 보이며 높이 ≥ 56px, 한국어가 낱말 가운데서 끊기지 않음', async ({ page }) => {
  await page.goto('./?test=1');
  for (const size of [{ width: 1024, height: 768 }, { width: 1180, height: 820 }, { width: 768, height: 1024 }, { width: 820, height: 1180 }]) {
    await page.setViewportSize(size);
    for (const d of ['easy', 'normal', 'hard', 'veryhard']) {
      await page.click(`[data-difficulty="${d}"]`);
      const m = await page.evaluate(() => {
        const sc = document.querySelector('.screen-start') as HTMLElement;
        const kids = [...sc.children].map((c) => c.getBoundingClientRect());
        return {
          scrollH: sc.scrollHeight,
          clientH: sc.clientHeight,
          docH: document.documentElement.scrollHeight,
          top: Math.min(...kids.map((r) => r.top)),
          bottom: Math.max(...kids.map((r) => r.bottom)),
          winH: window.innerHeight,
        };
      });
      const tag = `${size.width}×${size.height} ${d}`;
      expect(m.scrollH, tag).toBeLessThanOrEqual(m.clientH);
      expect(m.docH, tag).toBeLessThanOrEqual(m.winH);
      expect(m.top, tag).toBeGreaterThanOrEqual(0);
      expect(m.bottom, tag).toBeLessThanOrEqual(m.winH);
      for (const b of ['easy', 'normal', 'hard', 'veryhard']) {
        const box = await page.locator(`[data-difficulty="${b}"]`).boundingBox();
        expect(box, tag).not.toBeNull();
        expect(box!.height, `${tag} ${b}`).toBeGreaterThanOrEqual(56);
        expect(box!.y + box!.height).toBeLessThanOrEqual(size.height);
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(size.width);
      }
      // 난이도 4칸이 한 줄(같은 높이)
      const tops = await page.locator('[data-difficulty]').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
      expect(new Set(tops).size, `${tag} 한 줄`).toBe(1);
      for (const sel of ['.subtitle', '#difficulty-desc', '.stand-hint', '#privacy', ...(d === 'veryhard' ? ['#band-note'] : [])]) {
        for (const [before, after] of await lineBreaks(page, sel)) {
          expect(/\s/.test(before), `${tag} ${sel}: "${before}" | "${after}"`).toBe(true);
        }
      }
    }
  }
});
