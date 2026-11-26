import { expect, test } from '@playwright/test';
import { state, step, stepUntil } from './helpers.ts';

const PRIVACY = '카메라 영상은 이 태블릿 안에서 손 위치를 찾는 데만 쓰여요. 저장하거나 다른 곳으로 보내지 않아요.';
// v7(spec 9절): 둘째 줄 — 영어 읽어 주기와 인터넷 목소리
const PRIVACY_VOICE = '영어 읽어 주기는 인터넷 목소리(Google 등)를 쓸 수 있어요. 이때 영어 문제 문장만 보내져요.';

for (const url of ['./?test=1&clock=manual', './?input=pointer&test=1&clock=manual']) {
  test(`E7 개인정보 문구가 보이고, 터치 모드에서 getUserMedia가 불리지 않음 (${url})`, async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __gum: number }).__gum = 0;
      const md = navigator.mediaDevices;
      if (md) {
        const orig = md.getUserMedia.bind(md);
        md.getUserMedia = (c) => {
          (window as unknown as { __gum: number }).__gum += 1;
          return orig(c);
        };
      }
    });
    await page.goto(url);
    await expect(page.locator('#privacy')).toBeVisible();
    await expect(page.locator('#privacy')).toHaveText(PRIVACY);
    await expect(page.locator('#privacy-voice')).toBeVisible();
    await expect(page.locator('#privacy-voice')).toHaveText(PRIVACY_VOICE);
    await expect(page.locator('#privacy-voice svg')).toHaveCount(1); // 스피커 아이콘
    // 첫 줄 바로 아래
    const a = (await page.locator('#privacy').boundingBox())!;
    const b = (await page.locator('#privacy-voice').boundingBox())!;
    expect(b.y).toBeGreaterThanOrEqual(a.y + a.height - 1);
    expect(b.y - (a.y + a.height)).toBeLessThanOrEqual(12);
    // ?input=pointer면 [카메라로 시작]도 터치 모드
    await page.click(url.includes('pointer') ? '#btn-camera' : '#btn-touch');
    expect((await state(page)).mode).toBe('pointer');
    await page.click('#start-card');
    await step(page, 3100);
    await stepUntil(page, (s) => s.question >= 2, { chunk: 500 });
    expect(await page.evaluate(() => (window as unknown as { __gum: number }).__gum)).toBe(0);
    expect((await state(page)).cameraActive).toBe(false);
    await expect(page.locator('#camera-badge')).toBeHidden();
  });
}
