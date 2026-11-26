import { describe, expect, it } from 'vitest';
import { classifyShape, type Shape } from '../../src/hand/fist.ts';
import { initialGesture, stepGesture } from '../../src/hand/gestureState.ts';
import { expireTracks, initialTracks, updateTracks } from '../../src/hand/handTracks.ts';
import { frame, synthHand } from '../helpers/handSynth.ts';

type Seg = [shape: Shape | null | ((i: number) => Shape | null), ms: number, offscreen?: boolean];

/** 구간(모양, 길이 ms)들을 fps로 돌려 잡기 횟수를 센다 */
function runGrabs(segs: Seg[], fps: number): number {
  const dt = 1000 / fps;
  let s = initialGesture(0);
  let grabs = 0;
  let start = 0;
  let t = 0;
  for (const [shape, ms, off] of segs) {
    let i = 0;
    while (t < start + ms - 1e-9) {
      const sh = typeof shape === 'function' ? shape(i) : shape;
      const r = stepGesture(s, sh, t, off ?? false);
      s = r.state;
      if (r.grab) grabs += 1;
      t += dt;
      i += 1;
    }
    start += ms;
  }
  return grabs;
}

const FPS = [15, 30, 60];

describe('gestureState (spec 4.3)', () => {
  for (const fps of FPS) {
    describe(`${fps}fps`, () => {
      it('① 폄(200ms) → 쥠 확정 = 잡기 1회', () => {
        expect(runGrabs([['OPEN', 200], ['FIST', 400]], fps)).toBe(1);
      });
      it('② 쥠으로 시작 = 잡기 0', () => {
        expect(runGrabs([['FIST', 800]], fps)).toBe(0);
      });
      it('③ 쥠 유지 = 추가 잡기 0', () => {
        expect(runGrabs([['OPEN', 300], ['FIST', 2000]], fps)).toBe(1);
      });
      it('④ 쥠 → 폄 → 쥠 = 2회', () => {
        expect(runGrabs([['OPEN', 300], ['FIST', 300], ['OPEN', 300], ['FIST', 300]], fps)).toBe(2);
      });
      it('⑤ 임계값 근처 떨림(C 0.68/0.72 번갈아) = 잡기 0', () => {
        const flicker = (i: number): Shape => classifyShape(i % 2 === 0 ? 0.68 : 0.72, 0.6);
        expect(runGrabs([['OPEN', 300], [flicker, 1500]], fps)).toBe(0);
      });
      it('⑥ 한 프레임만 0.9 = 잡기 0(2회 확정)', () => {
        const one = (i: number): Shape => (i === 0 ? classifyShape(0.9, 0.9) : 'OPEN');
        expect(runGrabs([['OPEN', 300], [one, 600]], fps)).toBe(0);
      });
      it('⑧ 폄 100ms 뒤 쥠 = 잡기 0(ARM_OPEN_MS)', () => {
        expect(runGrabs([['OPEN', 100], ['FIST', 500]], fps)).toBe(0);
      });
      it('⑩ offscreen 쥠 = 잡기 0', () => {
        expect(runGrabs([['OPEN', 300], ['FIST', 500, true]], fps)).toBe(0);
      });
      it('판정 불가 프레임은 상태를 바꾸지 않는다', () => {
        expect(runGrabs([['OPEN', 300], [null, 200], ['FIST', 300]], fps)).toBe(1);
      });
    });
  }

  it('⑦ 15·30·60fps 모두 같은 결과', () => {
    const scenarios: Seg[][] = [
      [['OPEN', 200], ['FIST', 400]],
      [['FIST', 800]],
      [['OPEN', 300], ['FIST', 300], ['OPEN', 300], ['FIST', 300]],
      [['OPEN', 100], ['FIST', 500]],
      [['OPEN', 400], ['MIDDLE', 200], ['FIST', 300], ['MIDDLE', 100], ['OPEN', 300], ['FIST', 300]],
    ];
    for (const sc of scenarios) {
      const r = FPS.map((f) => runGrabs(sc, f));
      expect(new Set(r).size, JSON.stringify(r)).toBe(1);
    }
  });

  it('⑨ 260ms 끊김 → 새 트랙(주먹으로 다시 나타나면 잡기 없음)', () => {
    let st = initialTracks();
    let grabs = 0;
    let t = 0;
    const W = 1280;
    const H = 800;
    const push = (bend: number): void => {
      const up = updateTracks(st, frame(t, [synthHand({ bend, u: 0.5, v: 0.5 })]), W, H);
      st = up.state;
      grabs += up.grabs.length;
    };
    for (; t < 300; t += 33) push(0);
    const firstId = st.tracks[0]?.id;
    expect(st.tracks[0]?.gesture.confirmed).toBe('OPEN');
    // 260ms 동안 검출 없음
    t += 260;
    st = expireTracks(st, t);
    expect(st.tracks.length).toBe(0);
    for (const end = t + 400; t < end; t += 33) push(1);
    expect(st.tracks[0]?.id).not.toBe(firstId);
    expect(grabs).toBe(0);
  });
});
