import { defineConfig, devices } from '@playwright/test';

// spec 12.2: dist/를 /english1/ 아래로 주는 서버로 E2E. 세 화면 크기 프로젝트.
const PORT = Number(process.env.E2E_PORT ?? 4173);

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 2,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}/english1/`,
    ...devices['Desktop Chrome'],
    trace: 'retain-on-failure',
    // E1·E5: 가짜 카메라(무늬 영상). E4·E7은 getUserMedia를 직접 바꿔 시험한다.
    launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] },
  },
  webServer: {
    command: `node scripts/serve-dist.mjs --dir dist --prefix /english1/ --port ${PORT} --host 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}/english1/`,
    reuseExistingServer: false,
    timeout: 30_000,
  },
  projects: [
    {
      name: 'tablet-landscape',
      use: { viewport: { width: 1180, height: 820 }, hasTouch: true },
    },
    {
      name: 'tablet-portrait',
      use: { viewport: { width: 820, height: 1180 }, hasTouch: true },
    },
    {
      name: 'small-landscape',
      use: { viewport: { width: 1024, height: 768 } },
    },
  ],
});
