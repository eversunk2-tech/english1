import { defineConfig } from 'vitest/config';
import type { PluginOption } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

// spec 2.5·11: 상대 경로 base('./') — GitHub Pages 하위 경로(/english1/)와 개발 서버(/) 모두에서 같은 빌드가 열린다.
// HTTPS=1(npm run dev:https)일 때만 basic-ssl을 켠다(같은 와이파이의 태블릿에서 카메라 시험용).
const plugins: PluginOption[] = [];
if (process.env.HTTPS === '1') plugins.push(basicSsl());

export default defineConfig({
  base: './',
  plugins,
  server: { port: 5173, strictPort: true },
  preview: { port: 4173 },
  build: { outDir: 'dist', emptyOutDir: true },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
