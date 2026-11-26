import { describe, expect, it } from 'vitest';
import { filterHands, initialTracks, updateTracks } from '../../src/hand/handTracks.ts';
import { mapToScreen } from '../../src/hand/mapping.ts';
import { frame, synthHand } from '../helpers/handSynth.ts';

const W = 1280;
const H = 800;

describe('handTracks (spec 3.5·4.4)', () => {
  it('두 손이 움직여도 짝짓기(id)가 유지된다', () => {
    let st = initialTracks();
    let ids: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const t = i * 33;
      const a = synthHand({ bend: 0, u: 0.3 + i * 0.004, v: 0.5, palm: 0.08 });
      const b = synthHand({ bend: 0, u: 0.7 - i * 0.004, v: 0.5 + i * 0.002, palm: 0.07 });
      // 손 순서를 섞어 넣어도 같은 트랙에 붙어야 한다
      st = updateTracks(st, frame(t, i % 2 ? [a, b] : [b, a]), W, H).state;
      expect(st.tracks.length).toBe(2);
      const left = st.tracks.reduce((m, tr) => (tr.raw.x < m.raw.x ? tr : m));
      const right = st.tracks.find((tr) => tr !== left)!;
      // 거울: u=0.3 손은 화면 오른쪽
      if (i === 0) ids = { r: left.id, l: right.id };
      expect(right.id).toBe(ids.l);
      expect(left.id).toBe(ids.r);
    }
  });

  it('작은 손(가장 큰 손의 0.6배 미만)·너무 작은 손(0.025 미만) 무시', () => {
    const big = synthHand({ bend: 0, u: 0.5, v: 0.5, palm: 0.1 });
    const small = synthHand({ bend: 0, u: 0.2, v: 0.5, palm: 0.05 });
    const tiny = synthHand({ bend: 0, u: 0.8, v: 0.5, palm: 0.02 });
    expect(filterHands([big, small], 640, 480).length).toBe(1);
    expect(filterHands([tiny], 640, 480).length).toBe(0);
    const ok = synthHand({ bend: 0, u: 0.2, v: 0.5, palm: 0.07 });
    expect(filterHands([big, ok], 640, 480).length).toBe(2);
  });

  it('3개 이상이면 큰 2개만', () => {
    const hs = [0.08, 0.1, 0.09].map((palm, i) => synthHand({ bend: 0, u: 0.2 + i * 0.3, v: 0.5, palm }));
    const kept = filterHands(hs, 640, 480);
    expect(kept.length).toBe(2);
    expect(kept.map((k) => Number(k.palm.toFixed(3)))).toEqual([0.1, 0.09]);
    const st = updateTracks(initialTracks(), frame(0, hs), W, H).state;
    expect(st.tracks.length).toBe(2);
  });

  it('폄 → 쥠: 잡기 사건 1개, 위치는 손바닥 중심(화면 px), 이전 OPEN 위치 포함', () => {
    let st = initialTracks();
    const grabs = [];
    let t = 0;
    for (; t < 300; t += 33) {
      const up = updateTracks(st, frame(t, [synthHand({ bend: 0, u: 0.4, v: 0.5 })]), W, H);
      st = up.state;
      grabs.push(...up.grabs);
    }
    for (const end = t + 300; t < end; t += 33) {
      const up = updateTracks(st, frame(t, [synthHand({ bend: 1, u: 0.4, v: 0.52 })]), W, H);
      st = up.state;
      grabs.push(...up.grabs);
    }
    expect(grabs.length).toBe(1);
    const g = grabs[0]!;
    const target = mapToScreen(0.4, 0.52, 640, 480, W, H);
    expect(Math.abs(g.pos.x - target.x)).toBeLessThan(20);
    expect(g.prevOpenPos).not.toBeNull();
    expect(Math.abs(g.prevOpenPos!.y - mapToScreen(0.4, 0.5, 640, 480, W, H).y)).toBeLessThan(5);
  });

  it('쥔 채로 움직이면 추가 잡기 없음', () => {
    let st = initialTracks();
    let n = 0;
    let t = 0;
    for (; t < 300; t += 33) {
      const up = updateTracks(st, frame(t, [synthHand({ bend: 0, u: 0.2, v: 0.5 })]), W, H);
      st = up.state;
      n += up.grabs.length;
    }
    for (let i = 0; i < 60; i++, t += 33) {
      const up = updateTracks(st, frame(t, [synthHand({ bend: 1, u: 0.2 + i * 0.01, v: 0.5 })]), W, H);
      st = up.state;
      n += up.grabs.length;
    }
    expect(n).toBe(1);
  });

  it('거리 안내: 가장 큰 손 기준', () => {
    expect(updateTracks(initialTracks(), frame(0, [synthHand({ bend: 0, u: 0.5, v: 0.5, palm: 0.03 })]), W, H).hint).toBe('far');
    expect(updateTracks(initialTracks(), frame(0, [synthHand({ bend: 0, u: 0.5, v: 0.5, palm: 0.25 })]), W, H).hint).toBe('close');
    expect(updateTracks(initialTracks(), frame(0, [synthHand({ bend: 0, u: 0.5, v: 0.5, palm: 0.08 })]), W, H).hint).toBe(null);
  });
});
