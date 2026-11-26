import { expect, test } from '@playwright/test';
import { state, step, stepUntil } from './helpers.ts';

const PRIVACY = '카메라 영상은 이 태블릿 안에서 손 위치를 찾는 데만 쓰여요. 저장하거나 다른 곳으로 보내지 않아요.';

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
