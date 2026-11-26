import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { tokenize } from '../../src/data/words.ts';
import type { QuestionsFile } from '../../src/game/types.ts';
import { startTouchGame } from './helpers.ts';

const qs = (JSON.parse(readFileSync(new URL('../../src/data/questions.json', import.meta.url), 'utf8')) as QuestionsFile).questions;
const maxTokens = Math.max(...qs.map((q) => tokenize(q.clue).length));
const longestClues = qs.filter((q) => tokenize(q.clue).length === maxTokens).map((q) => q.clue);
const maxLen = Math.max(...qs.map((q) => q.word.length));
const longestWords = qs.filter((q) => q.word.length === maxLen).map((q) => q.word);

test('E6 배치: 가장 긴 설명·가장 긴 단어가 넘치지 않음(설명 두 줄 이내, 카드 글자 폭 ≤ 카드 폭 − 24)', async ({ page }, info) => {
  expect(maxTokens).toBe(10);
  expect(maxLen).toBe(10);
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
