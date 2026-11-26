// spec 2.4: @mediapipe/tasks-vision 패키지의 wasm 2개를 public/mediapipe/<버전>/ 으로 복사한다.
// 설치된 패키지 버전이 EXPECTED_VERSION이 아니면 실패한다(predev·prebuild·pretest:e2e에서 자동 실행).
import { copyFileSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const EXPECTED_VERSION = '1.2.3';
const FILES = ['vision_wasm_internal.js', 'vision_wasm_internal.wasm'];

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkgDir = join(root, 'node_modules', '@mediapipe', 'tasks-vision');

let version;
try {
  version = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8')).version;
} catch (e) {
  console.error('[copy-mediapipe] @mediapipe/tasks-vision 패키지를 찾지 못했어요. npm install을 먼저 하세요.');
  process.exit(1);
}
if (version !== EXPECTED_VERSION) {
  console.error(`[copy-mediapipe] 설치된 @mediapipe/tasks-vision 버전이 ${version}이에요. ${EXPECTED_VERSION}이어야 해요.`);
  process.exit(1);
}

const outDir = join(root, 'public', 'mediapipe', EXPECTED_VERSION);
mkdirSync(outDir, { recursive: true });
for (const f of FILES) {
  const src = join(pkgDir, 'wasm', f);
  const dst = join(outDir, f);
  const size = statSync(src).size;
  if (size === 0) {
    console.error(`[copy-mediapipe] ${f} 크기가 0이에요.`);
    process.exit(1);
  }
  copyFileSync(src, dst);
  console.log(`[copy-mediapipe] ${f} (${size} B) → public/mediapipe/${EXPECTED_VERSION}/`);
}
