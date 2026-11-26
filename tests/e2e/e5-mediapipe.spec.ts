import { expect, test } from '@playwright/test';
import { CAMERA_TEST_TIMEOUT_MS, expectCameraVideoPlaying, expectDetectCountAbove } from './helpers.ts';

// E5: 실제 MediaPipe 적재(가짜 카메라). 가짜 카메라 무늬에는 손이 없으므로 손 0개가 정상.
test.use({
  permissions: ['camera'],
});

function isMediapipeInfo(text: string): boolean {
  return /^(INFO: |I\d{4} |W\d{4} .*(gl_context|landmark_projection_calculator))/.test(text);
}

for (const delegate of ['auto', 'CPU'] as const) {
  test(`E5 MediaPipe 적재 (delegate=${delegate})`, async ({ page, baseURL }) => {
    test.setTimeout(CAMERA_TEST_TIMEOUT_MS);
    const errors: string[] = [];
    const external: string[] = [];
    const origin = new URL(baseURL ?? '').origin;
    page.on('console', (m) => {
      // MediaPipe(emscripten)는 정보 로그("INFO: ...", "I0000 ..." 등)를 stderr → console.error로 낸다. 오류가 아니므로 뺀다.
      if (m.type() === 'error' && !isMediapipeInfo(m.text())) errors.push(m.text());
    });
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('request', (r) => {
      const u = new URL(r.url());
      if (u.protocol.startsWith('http') && u.origin !== origin) external.push(r.url());
    });
    const q = delegate === 'CPU' ? '?test=1&debug=1&delegate=CPU' : '?test=1&debug=1';
    await page.goto(q);
    await page.click('#btn-camera');
    await expect
      .poll(async () => page.evaluate(() => window.__eg?.state().screen), { timeout: 30_000 })
      .toBe('handcheck');
    // 느린 CI 예산은 helpers.ts SLOW_DETECT_MS
    await expectCameraVideoPlaying(page);
    await expectDetectCountAbove(page, 10);
    const st = await page.evaluate(() => window.__eg?.state());
    expect(st?.tracks.length).toBe(0);
    if (delegate === 'CPU') expect(st?.delegate).toBe('CPU');
    else expect(['GPU', 'CPU']).toContain(st?.delegate);
    expect(st?.cameraActive).toBe(true);
    expect(errors, errors.join('\n')).toEqual([]);
    expect(external, external.join('\n')).toEqual([]);
    // pagehide → 손 인식기 close()·카메라 끄기(review R11). close() 때 MediaPipe가 보내려는 통계는 막혀야 한다
    const blockedBefore = st?.blockedRequests ?? 0;
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false })));
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => window.__eg?.state());
    expect(after?.cameraActive).toBe(false);
    expect(after?.delegate).toBe('-');
    expect(after?.blockedRequests ?? 0).toBeGreaterThan(blockedBefore);
    expect(errors, errors.join('\n')).toEqual([]);
    expect(external, external.join('\n')).toEqual([]);
    console.log(`delegate=${st?.delegate} detectCount=${st?.detectCount} blocked=${st?.blockedRequests}`);
  });
}
