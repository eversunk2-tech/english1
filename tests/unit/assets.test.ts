import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '..', '..');

describe('assets (spec 2.4)', () => {
  it('public/models/hand_landmarker.task SHA-256이 spec 값과 같다', () => {
    const buf = readFileSync(resolve(root, 'public/models/hand_landmarker.task'));
    expect(buf.length).toBe(7819105);
    expect(createHash('sha256').update(buf).digest('hex')).toBe(
      'fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1',
    );
  });

  it('package.json의 @mediapipe/tasks-vision 버전이 정확히 1.2.3이다', () => {
    const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
    expect(pkg.dependencies['@mediapipe/tasks-vision']).toBe('1.2.3');
    const installed = JSON.parse(
      readFileSync(resolve(root, 'node_modules/@mediapipe/tasks-vision/package.json'), 'utf8'),
    );
    expect(installed.version).toBe('1.2.3');
  });
});
