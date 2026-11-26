import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { expireTracks, initialTracks, updateTracks } from '../../src/hand/handTracks.ts';
import type { HandFrame } from '../../src/hand/tracker.ts';

// spec 12.3(선택, S7): 실제 손 녹화(?debug=1&record=1로 받은 JSON)를 tests/fixtures/replays/에 두면 판정을 확인한다.
// 파일 이름 약속(임시): grab-<N>*.json → 잡기 N회, wave*.json → 잡기 0회. 파일이 없으면 건너뛴다.
const dir = resolve(__dirname, '..', 'fixtures', 'replays');
const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')) : [];

function countGrabs(frames: HandFrame[]): number {
  let st = initialTracks();
  let n = 0;
  for (const f of frames) {
    st = expireTracks(st, f.t);
    const up = updateTracks(st, f, 1180, 820);
    st = up.state;
    n += up.grabs.length;
  }
  return n;
}

describe.skipIf(files.length === 0)('실제 손 녹화 재생 (spec 12.3)', () => {
  for (const f of files) {
    const m = /^grab-(\d+)/.exec(f);
    const expected = m ? Number(m[1]) : /^wave/.test(f) ? 0 : null;
    it.skipIf(expected === null)(`${f}: 잡기 ${expected}회`, () => {
      const frames = JSON.parse(readFileSync(join(dir, f), 'utf8')) as HandFrame[];
      expect(countGrabs(frames)).toBe(expected);
    });
  }
  it('녹화 파일이 있다', () => expect(files.length).toBeGreaterThan(0));
});
