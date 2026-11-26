import { expect, test } from '@playwright/test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { state, watchPage } from './helpers.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

test.describe('E1 첫 화면·같은 출처', () => {
  test.use({
    permissions: ['camera'],
  });

  test('/english1/에서 열리고 400 이상 응답·콘솔 오류 0, 모든 요청이 같은 출처(카메라 준비까지)', async ({ page, baseURL }) => {
    const origin = new URL(baseURL!).origin;
    const w = watchPage(page, origin);
    const res = await page.goto('./?test=1');
    expect(res?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe('/english1/');
    await expect(page.locator('h1')).toHaveText('Catch the Word!');
    await page.click('#btn-camera');
    await expect.poll(async () => (await state(page)).screen, { timeout: 30_000 }).toBe('handcheck');
    await expect.poll(async () => (await state(page)).detectCount, { timeout: 20_000 }).toBeGreaterThan(3);
    expect(w.bad, w.bad.join('\n')).toEqual([]);
    expect(w.errors, w.errors.join('\n')).toEqual([]);
    expect(w.external, w.external.join('\n')).toEqual([]);
  });

  test('끝 / 없는 /english1 은 /english1/로 넘어간다(시험 서버)', async ({ page, baseURL }) => {
    const u = new URL(baseURL!);
    await page.goto(`${u.origin}/english1`);
    expect(new URL(page.url()).pathname).toBe('/english1/');
  });
});

test('E1 빌드 결과물에 /로 시작하는 경로가 없다', () => {
  const dist = join(root, 'dist');
  const texts = walk(dist).filter((f) => /\.(html|js|css)$/.test(f) && !f.includes(`${join('dist', 'mediapipe')}`));
  expect(texts.length).toBeGreaterThan(1);
  for (const f of texts) {
    const s = readFileSync(f, 'utf8');
    for (const bad of ['"/assets', '"/mediapipe', '"/models', "'/assets", "'/mediapipe", "'/models", '`/assets', '`/mediapipe', '`/models', '(/assets']) {
      expect(s.includes(bad), `${f}에 ${bad}`).toBe(false);
    }
  }
  // 필요한 파일이 dist에 있다
  for (const p of ['mediapipe/1.2.3/vision_wasm_internal.js', 'mediapipe/1.2.3/vision_wasm_internal.wasm', 'models/hand_landmarker.task', 'index.html']) {
    expect(statSync(join(dist, p)).size).toBeGreaterThan(0);
  }
});
