import { expect, test } from '@playwright/test';
import { lineBreaks, state, step } from './helpers.ts';

const CASES: { name: string; text: string }[] = [
  { name: 'NotAllowedError', text: "카메라 사용이 허락되지 않았어요. 주소창 옆(또는 설정 › Safari › 카메라)에서 카메라를 '허용'으로 바꾼 뒤 [다시 시도]를 눌러 주세요." },
  { name: 'SecurityError', text: "카메라 사용이 허락되지 않았어요. 주소창 옆(또는 설정 › Safari › 카메라)에서 카메라를 '허용'으로 바꾼 뒤 [다시 시도]를 눌러 주세요." },
  { name: 'NotFoundError', text: '카메라를 찾지 못했어요. 카메라가 있는 태블릿에서 열어 주세요.' },
  { name: 'OverconstrainedError', text: '카메라를 찾지 못했어요. 카메라가 있는 태블릿에서 열어 주세요.' },
  { name: 'NotReadableError', text: '다른 앱이 카메라를 쓰고 있어요. 다른 앱을 닫고 [다시 시도]를 눌러 주세요.' },
  { name: 'AbortError', text: '다른 앱이 카메라를 쓰고 있어요. 다른 앱을 닫고 [다시 시도]를 눌러 주세요.' },
  { name: 'TypeError', text: '카메라를 켜지 못했어요. [다시 시도]를 누르거나 터치로 해 보세요.' },
];

test.describe('E4 카메라 오류 흉내', () => {
  for (const c of CASES) {
    test(`${c.name} → 문구 + [터치로 하기]로 게임 시작`, async ({ page }) => {
      await page.addInitScript((name) => {
        const md = navigator.mediaDevices;
        if (md) {
          md.getUserMedia = () => Promise.reject(new DOMException('mock', name));
        }
      }, c.name);
      await page.goto('./?test=1&clock=manual');
      await page.click('#btn-camera');
      await expect(page.locator('#error-msg')).toHaveText(c.text);
      await expect(page.locator('#error-title')).toHaveText('시작하지 못했어요');
      await expect(page.locator('#error-name')).toContainText(c.name);
      await expect(page.locator('#btn-retry')).toBeVisible();
      // 다시 시도 → 같은 오류
      await page.click('#btn-retry');
      await expect(page.locator('#error-msg')).toHaveText(c.text);
      await page.click('#btn-touch');
      expect((await state(page)).screen).toBe('handcheck');
      await page.click('#start-card');
      await step(page, 3100);
      const s = await state(page);
      expect(s.screen).toBe('playing');
      expect(s.mode).toBe('pointer');
    });
  }

  test('mediaDevices 없음 → https 안내', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, 'mediaDevices', { get: () => undefined, configurable: true });
    });
    await page.goto('./?test=1&clock=manual');
    await page.click('#btn-camera');
    await expect(page.locator('#error-msg')).toHaveText('이 주소에서는 카메라를 쓸 수 없어요. https:// 로 시작하는 주소로 열어 주세요.');
    await page.click('#btn-touch');
    await page.click('#start-card');
    await step(page, 3100);
    expect((await state(page)).screen).toBe('playing');
  });

  test('손 인식 파일 받기 실패·만들기 실패 문구(forceError)', async ({ page }) => {
    await page.goto('./?test=1&clock=manual');
    await page.evaluate(() => window.__eg!.forceError('download'));
    await expect(page.locator('#error-msg')).toHaveText('손 인식 파일을 받지 못했어요. 인터넷 연결을 확인하고 [다시 시도]를 눌러 주세요.');
    await expect(page.locator('#error-title')).toHaveText('시작하지 못했어요');
    await page.evaluate(() => window.__eg!.forceError('init'));
    await expect(page.locator('#error-msg')).toHaveText('이 기기에서는 손 인식을 시작하지 못했어요. 터치로 할 수 있어요.');
    await expect(page.locator('#btn-touch')).toBeVisible();
    await expect(page.locator('#btn-retry')).toBeVisible();
  });

  test('모델 파일 404 → 받기 실패 문구', async ({ page }) => {
    await page.route('**/models/hand_landmarker.task', (r) => r.fulfill({ status: 404, body: '' }));
    await page.context().grantPermissions(['camera']);
    await page.addInitScript(() => {
      // 가짜 카메라 대신: 빈 캔버스 스트림
      const md = navigator.mediaDevices;
      if (md) {
        md.getUserMedia = async () => {
          const c = document.createElement('canvas');
          c.width = 64;
          c.height = 48;
          const ctx = c.getContext('2d');
          ctx?.fillRect(0, 0, 64, 48);
          return c.captureStream(15);
        };
      }
    });
    await page.goto('./?test=1');
    await page.click('#btn-camera');
    await expect(page.locator('#error-msg')).toHaveText('손 인식 파일을 받지 못했어요. 인터넷 연결을 확인하고 [다시 시도]를 눌러 주세요.', { timeout: 15_000 });
    await expect(page.locator('#error-name')).toContainText('DownloadError');
  });
});

test.describe('E4 카메라 트랙이 중간에 끊김(review R3)', () => {
  test.use({ permissions: ['camera'] });

  test('트랙 ended → busy 문구, [다시 시도]는 카메라만 다시 열고 모델은 다시 받지 않음', async ({ page }) => {
    let modelRequests = 0;
    page.on('request', (r) => {
      if (r.url().includes('models/hand_landmarker.task')) modelRequests += 1;
    });
    await page.goto('./?test=1');
    await page.click('#btn-camera');
    await expect.poll(async () => (await state(page)).screen, { timeout: 30_000 }).toBe('handcheck');
    expect(modelRequests).toBe(1);
    // 다른 앱이 카메라를 가져간 것처럼 트랙의 ended 사건을 낸다
    await page.evaluate(() => {
      const v = document.getElementById('camera-video') as HTMLVideoElement;
      const t = (v.srcObject as MediaStream).getVideoTracks()[0]!;
      t.dispatchEvent(new Event('ended'));
    });
    await expect(page.locator('#error-title')).toHaveText('시작하지 못했어요');
    await expect(page.locator('#error-msg')).toHaveText('다른 앱이 카메라를 쓰고 있어요. 다른 앱을 닫고 [다시 시도]를 눌러 주세요.');
    await expect(page.locator('#btn-touch')).toBeVisible();
    expect((await state(page)).cameraActive).toBe(false);
    await page.click('#btn-retry');
    await expect.poll(async () => (await state(page)).screen, { timeout: 15_000 }).toBe('handcheck');
    const s = await state(page);
    expect(s.cameraActive).toBe(true);
    const n = s.detectCount;
    await expect.poll(async () => (await state(page)).detectCount, { timeout: 10_000 }).toBeGreaterThan(n + 3);
    expect(modelRequests).toBe(1);
  });

  test('우리가 끈 카메라([처음으로])는 오류 화면으로 가지 않음', async ({ page }) => {
    await page.goto('./?test=1');
    await page.click('#btn-camera');
    await expect.poll(async () => (await state(page)).screen, { timeout: 30_000 }).toBe('handcheck');
    await page.click('#start-card');
    await expect.poll(async () => (await state(page)).screen, { timeout: 10_000 }).toBe('playing');
    await page.click('#pause-btn');
    await page.click('#btn-home');
    await page.waitForTimeout(300);
    expect((await state(page)).screen).toBe('start');
  });
});

test('E4 N1: 한국어 오류 문구가 낱말 가운데서 줄이 바뀌지 않는다(띄어쓰기에서만)', async ({ page }) => {
  const kinds = ['insecure', 'denied', 'notfound', 'busy', 'download', 'init', 'other'] as const;
  const sizes = [page.viewportSize()!, { width: 1180, height: 820 }, { width: 820, height: 1180 }, { width: 1024, height: 768 }, { width: 768, height: 1024 }, { width: 600, height: 900 }];
  await page.goto('./?test=1&clock=manual');
  let checked = 0;
  for (const size of sizes) {
    await page.setViewportSize(size);
    for (const k of kinds) {
      await page.evaluate((kind) => window.__eg!.forceError(kind), k);
      for (const sel of ['#error-msg', '#error-title']) {
        const breaks = await lineBreaks(page, sel);
        for (const [before, after] of breaks) {
          checked += 1;
          // 줄이 바뀐 곳 바로 앞이 띄어쓰기여야 한다
          expect(/\s/.test(before), `${size.width}×${size.height} ${k} ${sel}: "${before}" | "${after}"`).toBe(true);
        }
      }
    }
  }
  expect(checked).toBeGreaterThan(0);
});
