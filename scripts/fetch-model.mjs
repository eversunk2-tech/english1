// spec 2.4: hand_landmarker.task 모델을 받아 public/models/ 에 둔다(S1에서 한 번, 이후 저장소에 커밋).
// 파일이 이미 있고 SHA-256이 맞으면 아무것도 하지 않는다.
// Google 주소에서 받고 SHA-256 검사 → 다르면 Hugging Face 주소로 다시 받아 검사 → 그래도 다르면 실패.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MODEL_SHA256 = 'fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1';
export const MODEL_SIZE = 7819105;
const URLS = [
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
  'https://huggingface.co/litert-community/MediaPipe-HandLandmarker-Full/resolve/main/hand_landmarker.task',
];

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public', 'models', 'hand_landmarker.task');

/** @param {Buffer} buf */
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

if (existsSync(out)) {
  const h = sha256(readFileSync(out));
  if (h === MODEL_SHA256) {
    console.log('[fetch-model] 이미 있고 SHA-256이 맞아요.');
    process.exit(0);
  }
  console.error(`[fetch-model] 있는 파일의 SHA-256(${h})이 달라요. 다시 받아요.`);
}

for (const url of URLS) {
  try {
    console.log(`[fetch-model] 받는 중: ${url}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const h = sha256(buf);
    if (h !== MODEL_SHA256) {
      console.error(`[fetch-model] SHA-256이 달라요(${h}, ${buf.length} B).`);
      continue;
    }
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, buf);
    console.log(`[fetch-model] 저장: public/models/hand_landmarker.task (${buf.length} B, SHA-256 일치)`);
    process.exit(0);
  } catch (e) {
    console.error(`[fetch-model] 실패: ${e instanceof Error ? e.message : e}`);
  }
}
console.error('[fetch-model] 두 주소 모두 실패했어요.');
process.exit(1);
