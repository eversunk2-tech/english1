import { describe, expect, it } from 'vitest';
import { parseParams } from '../../src/app/params.ts';

describe('params (spec 11·12.2)', () => {
  it('?clock=manual은 ?test=1이 함께 있을 때만 켜진다(review R1)', () => {
    expect(parseParams('?clock=manual').manualClock).toBe(false);
    expect(parseParams('?test=1&clock=manual').manualClock).toBe(true);
    expect(parseParams('?test=1').manualClock).toBe(false);
  });

  it('입력·학년군·씨앗·delegate', () => {
    const p = parseParams('?input=pointer&band=5-6&test=1&seed=7&delegate=cpu&debug=1&record=1');
    expect(p).toMatchObject({ input: 'pointer', band: '5-6', seed: 7, delegate: 'CPU', debug: true, record: true, test: true });
    expect(parseParams('?input=xx&band=9&test=1&seed=-1').input).toBe('camera');
    expect(parseParams('?input=xx&band=9&test=1&seed=-1').seed).toBe(null);
    expect(parseParams('?band=9').band).toBe(null);
    expect(parseParams('?test=1&seed=abc').seed).toBe(null);
  });

  it('?seed=는 ?test=1이 함께 있을 때만(v8, spec 5.6.1 ⑧)', () => {
    expect(parseParams('?seed=7').seed).toBe(null);
    expect(parseParams('?input=pointer&seed=7&band=5-6').seed).toBe(null);
    expect(parseParams('?test=1&seed=7').seed).toBe(7);
    expect(parseParams('?seed=7&test=1').seed).toBe(7);
    expect(parseParams('?test=1&seed=abc').seed).toBe(null);
    expect(parseParams('?test=0&seed=7').seed).toBe(null);
  });

  it('?difficulty=easy|normal|hard (v2), 이상한 값은 무시', () => {
    expect(parseParams('?difficulty=hard').difficulty).toBe('hard');
    expect(parseParams('?difficulty=Easy').difficulty).toBe('easy');
    expect(parseParams('?difficulty=veryhard').difficulty).toBe('veryhard');
    expect(parseParams('?difficulty=x').difficulty).toBe(null);
    expect(parseParams('').difficulty).toBe(null);
  });
});
