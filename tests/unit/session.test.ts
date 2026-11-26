import { describe, expect, it } from 'vitest';
import questionsJson from '../../src/data/questions.json';
import { buildPlans } from '../../src/game/questions.ts';
import { mulberry32 } from '../../src/game/rng.ts';
import { Session } from '../../src/game/session.ts';
import type { QuestionsFile } from '../../src/game/types.ts';

const all = (questionsJson as QuestionsFile).questions;
const VP = { W: 1280, H: 800 };

function makeSession(seed: number, camera = false): Session {
  const rng = mulberry32(seed);
  const plans = buildPlans(all, '3-4', rng);
  return new Session({ plans, rng, viewport: VP, camera });
}

/** 정답 카드가 잡을 수 있게 될 때까지(또는 extra ms 더) 16ms씩 진행 */
function stepUntilGrabbable(s: Session, extraMs = 0): void {
  for (let i = 0; i < 2000; i++) {
    const c = s.cards.find((x) => x.correct)!;
    if (s.grabbable(c)) break;
    s.update(16);
  }
  for (let t = 0; t < extraMs; t += 16) s.update(16);
}

function finishQuestion(s: Session): void {
  const idx = s.index;
  for (let i = 0; i < 1000 && s.index === idx && s.phase !== 'finished'; i++) s.update(50);
}

describe('session (spec 5.2~5.8)', () => {
  it('한 판: 모두 첫 시도 정답 → 10/10, 점수 = 5.5 식(빠르기·콤보)', () => {
    const s = makeSession(7);
    let expected = 0;
    let combo = 0;
    const events: string[] = [];
    for (let q = 0; q < 10; q++) {
      stepUntilGrabbable(s, 200 + q * 37);
      const c = s.cards.find((x) => x.correct)!;
      const p = c.p;
      expect(s.grab(c.id)).toBe('correct');
      combo += 1;
      expected += 100 + Math.round(50 * (1 - p)) + (combo >= 3 ? 20 : 0);
      expect(s.score).toBe(expected);
      events.push(...s.drainEvents().map((e) => e.type));
      finishQuestion(s);
    }
    events.push(...s.drainEvents().map((e) => e.type));
    expect(s.phase).toBe('finished');
    expect(s.correctCount).toBe(10);
    expect(s.results.map((r) => r.mark)).toEqual(Array(10).fill('first'));
    expect(events.filter((e) => e === 'correct').length).toBe(10);
    expect(events).toContain('finished');
    expect(s.maxCombo).toBe(10);
  });

  it('오답: 점수 그대로·그 카드만 사라짐·콤보 0, 그 뒤 정답은 50점 + 빠르기', () => {
    const s = makeSession(3);
    // 1·2번 문제 정답으로 콤보 2
    for (let q = 0; q < 2; q++) {
      stepUntilGrabbable(s);
      s.grab(s.cards.find((x) => x.correct)!.id);
      finishQuestion(s);
    }
    expect(s.combo).toBe(2);
    const before = s.score;
    stepUntilGrabbable(s, 300);
    const wrong = s.cards.find((x) => !x.correct && s.grabbable(x))!;
    expect(wrong).toBeDefined();
    expect(s.grab(wrong.id)).toBe('wrong');
    expect(s.score).toBe(before);
    expect(s.combo).toBe(0);
    expect(wrong.status).toBe('wrong');
    expect(s.grab(wrong.id)).toBe('ignored');
    s.update(16);
    for (let i = 0; i < 30; i++) s.update(16);
    expect(wrong.status).toBe('gone');
    const c = s.cards.find((x) => x.correct)!;
    const p = c.p;
    expect(s.grab(c.id)).toBe('correct');
    expect(s.score).toBe(before + 50 + Math.round(50 * (1 - p)));
    expect(s.results[2]!.mark).toBe('retry');
    expect(s.combo).toBe(1);
  });

  it('놓침: 정답 카드가 화면 아래로 빠지면 0점·콤보 0, 2초 뒤 다음 문제', () => {
    const s = makeSession(11);
    stepUntilGrabbable(s);
    s.grab(s.cards.find((x) => x.correct)!.id);
    finishQuestion(s);
    expect(s.combo).toBe(1);
    const score = s.score;
    for (let i = 0; i < 1000 && s.phase === 'falling'; i++) s.update(50);
    expect(s.phase).toBe('missed');
    expect(s.results[1]!.mark).toBe('miss');
    expect(s.score).toBe(score);
    expect(s.combo).toBe(0);
    expect(s.drainEvents().map((e) => e.type)).toContain('miss');
    const idx = s.index;
    for (let t = 0; t < 1900; t += 50) s.update(50);
    expect(s.index).toBe(idx);
    for (let t = 0; t < 200; t += 50) s.update(50);
    expect(s.index).toBe(idx + 1);
  });

  it('띠 뒤 카드는 잡을 수 없다', () => {
    const s = makeSession(5);
    const c = s.cards.find((x) => x.correct)!;
    expect(s.grab(c.id)).toBe('ignored');
  });

  it('카메라 모드: 손이 3초 넘게 안 보이면 자동 일시정지, 손이 보이면 세기 처음부터', () => {
    const s = makeSession(9, true);
    for (let t = 0; t < 2900; t += 50) s.update(50, false);
    s.update(50, true);
    for (let t = 0; t < 2950; t += 50) s.update(50, false);
    expect(s.paused).toBe(null);
    for (let t = 0; t < 200; t += 50) s.update(50, false);
    expect(s.paused).toBe('nohand');
    expect(s.drainEvents().map((e) => e.type)).toContain('autopause');
    const el = s.elapsedMs;
    s.update(50, true);
    expect(s.elapsedMs).toBe(el);
    s.resume();
    s.update(50, true);
    expect(s.elapsedMs).toBe(el + 50);
  });

  it('터치 모드에서는 손이 없어도 일시정지하지 않는다', () => {
    const s = makeSession(9, false);
    for (let t = 0; t < 5000; t += 50) s.update(50, false);
    expect(s.paused).toBe(null);
  });

  it('dt는 100ms로 자른다', () => {
    const s = makeSession(2);
    s.update(1000);
    expect(s.elapsedMs).toBe(100);
    s.update(-5);
    expect(s.elapsedMs).toBe(100);
  });

  it('일시정지 중에는 시간이 흐르지 않는다', () => {
    const s = makeSession(2);
    s.update(50);
    s.pause('user');
    s.update(50);
    expect(s.elapsedMs).toBe(50);
    expect(s.grab(s.cards[0]!.id)).toBe('ignored');
  });

  it('화면 크기가 바뀌어도 xFrac·p 유지', () => {
    const s = makeSession(4);
    for (let i = 0; i < 100; i++) s.update(16);
    const before = s.cards.map((c) => [c.xFrac, c.p]);
    s.setViewport({ W: 820, H: 1180 });
    expect(s.cards.map((c) => [c.xFrac, c.p])).toEqual(before);
  });
});
