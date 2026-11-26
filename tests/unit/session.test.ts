import { describe, expect, it } from 'vitest';
import questionsJson from '../../src/data/questions.json';
import veryhardJson from '../../src/data/veryhard.json';
import type { Difficulty } from '../../src/config.ts';
import { buildGamePlans } from '../../src/game/questions.ts';
import extraJson from '../../src/data/vocab/clue-extra.json';
import { bagPool, drawGame, drawSpecFor, emptyBag } from '../../src/game/bag.ts';
import { mulberry32 } from '../../src/game/rng.ts';
import { Session } from '../../src/game/session.ts';
import type { QuestionsFile } from '../../src/game/types.ts';

const all = (questionsJson as QuestionsFile).questions;
const VP = { W: 1280, H: 800 };

// spec 5.3.2·5.5를 테스트 안에 따로 적는다
const MULT: Record<Difficulty, number> = { easy: 1.0, normal: 1.2, hard: 1.5, veryhard: 2.0 };
const PENALTY: Record<Difficulty, number> = { easy: 10, normal: 20, hard: 30, veryhard: 40 };
const STAGE_FALL: Record<Difficulty, number[]> = {
  easy: [8500, 7000, 6000],
  normal: [6500, 5500, 4500],
  hard: [5000, 4000, 3500],
  veryhard: [4500, 3500, 3000],
};
/** spec 5.3.3 읽기 계수(v9, ms/낱말) */
const WORD: Record<Difficulty, Record<'3-4' | '5-6' | 'vh', number>> = {
  easy: { '3-4': 350, '5-6': 300, vh: 250 },
  normal: { '3-4': 350, '5-6': 300, vh: 250 },
  hard: { '3-4': 300, '5-6': 250, vh: 200 },
  veryhard: { '3-4': 300, '5-6': 250, vh: 200 },
};
const advanced = new Set((extraJson as { veryhardAdvanced: string[] }).veryhardAdvanced);
const vhq = (veryhardJson as QuestionsFile).questions;

function correctPoints(first: boolean, p: number, combo: number, d: Difficulty): number {
  return Math.round(MULT[d] * ((first ? 100 : 50) + Math.round(50 * (1 - Math.min(1, Math.max(0, p)))) + (combo >= 3 ? 20 : 0)));
}

function expectedFall(clue: string, band: '3-4' | '5-6' | 'vh', qNo: number, d: Difficulty): number {
  const n = (clue.toLowerCase().match(/[a-z]+('[a-z]+)?/g) ?? []).length;
  const need = 300 + n * WORD[d][band] + 1000 + 400;
  const floor = Math.ceil((need * 100) / 85 / 10) * 10;
  const stage = STAGE_FALL[d][qNo <= 3 ? 0 : qNo <= 6 ? 1 : 2]!;
  return Math.max(stage, floor);
}

/** v9: 게임과 같은 순서(drawSpecFor → drawGame → buildGamePlans)로 한 판 */
function makeSession(seed: number, d: Difficulty = 'easy', camera = false, band: '3-4' | '5-6' | 'all' = '3-4'): Session {
  const rng = mulberry32(seed);
  const pools = { main: all, veryhard: vhq, advanced: [...advanced] };
  const { answers, levels } = drawGame(drawSpecFor(band, d), (name) => ({ name, pool: bagPool(name, pools), state: emptyBag() }), rng);
  const plans = buildGamePlans(pools, band, d, rng, answers, levels);
  return new Session({ plans, rng, viewport: VP, camera, difficulty: d });
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

function stepUntilWrongGrabbable(s: Session): void {
  for (let i = 0; i < 2000; i++) {
    if (s.cards.some((x) => !x.correct && s.grabbable(x))) return;
    s.update(16);
  }
}

function finishQuestion(s: Session): void {
  const idx = s.index;
  for (let i = 0; i < 1000 && s.index === idx && s.phase !== 'finished'; i++) s.update(50);
}

describe('session (spec 5.2~5.8)', () => {
  it('v9: 판 구성 — 단계 값·카드 수·같은 주제 수·level(Normal 2개 7~10번, Hard 4개 4~10번), Very Hard 심화 4문제가 4~10번', () => {
    const cards: Record<Difficulty, number[]> = { easy: [3, 4, 4], normal: [3, 4, 4], hard: [4, 4, 4], veryhard: [4, 4, 4] };
    const same: Record<Difficulty, number[]> = { easy: [0, 1, 2], normal: [1, 2, 2], hard: [2, 2, 3], veryhard: [3, 3, 3] };
    const up: Record<Difficulty, [number, number]> = { easy: [0, 11], normal: [2, 7], hard: [4, 4], veryhard: [4, 4] };
    for (const d of ['easy', 'normal', 'hard', 'veryhard'] as Difficulty[]) {
      for (const band of ['3-4', '5-6', 'all'] as const) {
        for (let seed = 1; seed <= 20; seed++) {
          const s = makeSession(seed, d, false, band);
          const ups = s.plans.map((p, i) => (p.level === 'up' ? i + 1 : 0)).filter((x) => x > 0);
          expect(ups.length).toBe(up[d][0]);
          for (const no of ups) expect(no).toBeGreaterThanOrEqual(up[d][1]);
          s.plans.forEach((p, i) => {
            const k = i < 3 ? 0 : i < 6 ? 1 : 2;
            expect(p.stage.cards).toBe(cards[d][k]);
            expect(p.options.length).toBe(cards[d][k]);
            expect(p.stage.sameTopicDistractors).toBe(same[d][k]);
            expect(p.stage.fallMs).toBe(STAGE_FALL[d][k]);
            expect(p.fallMs).toBe(expectedFall(p.answer.clue, p.answer.band, i + 1, d));
            if (d === 'veryhard') {
              // Very Hard: 심화(veryhardAdvanced) 문제 = level up = 4개, 모두 4~10번
              expect(advanced.has(p.answer.word)).toBe(p.level === 'up');
            }
          });
          if (d === 'veryhard') expect(s.plans.filter((p) => advanced.has(p.answer.word)).length).toBe(4);
        }
      }
    }
    // 시간 제한: 로컬 약 0.7초, 배포 러너 실측 2.9초(run 45878021468 attempt 1) — 기본 5초는 1.7배뿐이라 3배 이상인 30초로.
  }, 30_000);

  for (const d of ['easy', 'normal', 'hard', 'veryhard'] as Difficulty[]) {
    it(`${d}: 모두 첫 시도 정답 → 10/10, 점수 = 5.5 식(배율·빠르기·콤보), 문제별 떨어지는 시간 = fallMsFor`, () => {
      const s = makeSession(7, d);
      let expected = 0;
      let combo = 0;
      const events: string[] = [];
      for (let q = 0; q < 10; q++) {
        const plan = s.current!;
        expect(plan.fallMs).toBe(expectedFall(plan.answer.clue, plan.answer.band, q + 1, d));
        stepUntilGrabbable(s, 200 + q * 37);
        const c = s.cards.find((x) => x.correct)!;
        // 진행도 p = (경과 − 지연) / fallMs
        expect(c.p).toBeCloseTo((s.elapsedMs - c.delayMs) / plan.fallMs, 9);
        const p = c.p;
        expect(s.grab(c.id)).toBe('correct');
        combo += 1;
        expected += correctPoints(true, p, combo, d);
        expect(s.score).toBe(expected);
        events.push(...s.drainEvents().map((e) => e.type));
        finishQuestion(s);
      }
      events.push(...s.drainEvents().map((e) => e.type));
      expect(s.phase).toBe('finished');
      expect(s.correctCount).toBe(10);
      expect(s.firstTryCount).toBe(10);
      expect(s.results.map((r) => r.mark)).toEqual(Array(10).fill('first'));
      expect(s.results.every((r) => r.deducted === 0 && r.wrongs.length === 0 && r.grabMs !== null)).toBe(true);
      expect(s.wrongSummary).toEqual({ count: 0, deducted: 0 });
      expect(events.filter((e) => e === 'correct').length).toBe(10);
      expect(events).toContain('finished');
      expect(s.maxCombo).toBe(10);
    });
  }

  for (const d of ['easy', 'normal', 'hard', 'veryhard'] as Difficulty[]) {
    it(`${d}: 오답 1·2번 뒤 정답 = 깎인 합 + 오답 뒤 정답 점수, 오답은 콤보를 끊는다, 문제별 기록`, () => {
      const s = makeSession(3, d);
      // 1·2번 문제 정답으로 콤보 2, 점수 쌓기
      let score = 0;
      let combo = 0;
      for (let q = 0; q < 2; q++) {
        stepUntilGrabbable(s);
        const c = s.cards.find((x) => x.correct)!;
        const p = c.p;
        s.grab(c.id);
        combo += 1;
        score += correctPoints(true, p, combo, d);
        finishQuestion(s);
      }
      expect(s.score).toBe(score);
      expect(s.combo).toBe(2);
      stepUntilWrongGrabbable(s);
      const wrongs = s.cards.filter((x) => !x.correct);
      let deducted = 0;
      const grabbedWrong: string[] = [];
      for (const w of wrongs.slice(0, 2)) {
        for (let i = 0; i < 2000 && !s.grabbable(w); i++) s.update(16);
        const ev = s.grab(w.id);
        expect(ev).toBe('wrong');
        const pen = Math.min(score, PENALTY[d]);
        score -= pen;
        deducted += pen;
        grabbedWrong.push(w.q.word);
        expect(s.score).toBe(score);
        expect(s.combo).toBe(0);
        const e = s.drainEvents().find((x) => x.type === 'wrong');
        expect(e && e.type === 'wrong' ? e.deducted : -1).toBe(pen);
        expect(s.grab(w.id)).toBe('ignored');
      }
      const c = s.cards.find((x) => x.correct)!;
      for (let i = 0; i < 2000 && !s.grabbable(c); i++) s.update(16);
      const p = c.p;
      expect(s.grab(c.id)).toBe('correct');
      const gain = correctPoints(false, p, 1, d);
      score += gain;
      expect(s.score).toBe(score);
      const r = s.results[2]!;
      expect(r.mark).toBe('retry');
      expect(r.score).toBe(gain);
      expect(r.deducted).toBe(deducted);
      expect(r.wrongs).toEqual(grabbedWrong);
      expect(s.combo).toBe(1);
    });
  }

  it('점수 0에서 오답 → 0 유지·깎인 양 0, 빨간 숫자 없음(deducted 0)', () => {
    const s = makeSession(5, 'normal');
    stepUntilWrongGrabbable(s);
    const w = s.cards.find((x) => !x.correct && s.grabbable(x))!;
    expect(s.score).toBe(0);
    expect(s.grab(w.id)).toBe('wrong');
    expect(s.score).toBe(0);
    const e = s.drainEvents().find((x) => x.type === 'wrong');
    expect(e && e.type === 'wrong' ? e.deducted : -1).toBe(0);
  });

  it('점수 15에서 Normal 오답 → 0, 깎인 양 15', () => {
    const s = makeSession(5, 'normal');
    stepUntilWrongGrabbable(s);
    s.score = 15; // 상황 만들기(순수 객체)
    const w = s.cards.find((x) => !x.correct && s.grabbable(x))!;
    s.grab(w.id);
    expect(s.score).toBe(0);
    const e = s.drainEvents().find((x) => x.type === 'wrong');
    expect(e && e.type === 'wrong' ? e.deducted : -1).toBe(15);
  });

  it('Very Hard: 정답은 Very Hard 풀에서만, 오답 −40, 0점 바닥', () => {
    const s = makeSession(4, 'veryhard');
    const words = new Set(vhq.map((q) => q.word));
    for (const p of s.plans) expect(words.has(p.answer.word)).toBe(true);
    stepUntilWrongGrabbable(s);
    s.score = 25;
    const w = s.cards.find((x) => !x.correct && s.grabbable(x))!;
    s.grab(w.id);
    expect(s.score).toBe(0);
    const e = s.drainEvents().find((x) => x.type === 'wrong');
    expect(e && e.type === 'wrong' ? e.deducted : -1).toBe(25);
    s.score = 100;
    const w2 = s.cards.find((x) => !x.correct && x.id !== w.id && (s.grabbable(x) || x.status === 'falling'))!;
    for (let i = 0; i < 2000 && !s.grabbable(w2); i++) s.update(16);
    s.grab(w2.id);
    expect(s.score).toBe(60);
  });

  it('카드 4장 Hard: 오답 3번 → 감점 3번', () => {
    const s = makeSession(8, 'hard');
    expect(s.cards.length).toBe(4);
    s.score = 1000;
    for (const w of s.cards.filter((x) => !x.correct)) {
      for (let i = 0; i < 2000 && !s.grabbable(w); i++) s.update(16);
      expect(s.grab(w.id)).toBe('wrong');
    }
    expect(s.score).toBe(1000 - 3 * 30);
  });

  it('오답 뒤 놓침 = 감점만 남는다, 놓침 자체는 감점 없음', () => {
    const s = makeSession(11, 'hard');
    stepUntilGrabbable(s);
    const c0 = s.cards.find((x) => x.correct)!;
    const p0 = c0.p;
    s.grab(c0.id);
    const afterFirst = correctPoints(true, p0, 1, 'hard');
    expect(s.score).toBe(afterFirst);
    finishQuestion(s);
    stepUntilWrongGrabbable(s);
    const w = s.cards.find((x) => !x.correct && s.grabbable(x))!;
    s.grab(w.id);
    expect(s.score).toBe(afterFirst - 30);
    for (let i = 0; i < 2000 && s.phase === 'falling'; i++) s.update(50);
    expect(s.phase).toBe('missed');
    const r = s.results[1]!;
    expect(r.mark).toBe('miss');
    expect(r.score).toBe(0);
    expect(r.deducted).toBe(30);
    expect(r.wrongs).toEqual([w.q.word]);
    expect(r.grabMs).toBe(null);
    expect(s.score).toBe(afterFirst - 30);
    expect(s.wrongSummary).toEqual({ count: 1, deducted: 30 });
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

  it('놓치는 시각 = 정답 카드의 지연 + fallMs', () => {
    const s = makeSession(13, 'hard');
    const plan = s.current!;
    const c = s.cards.find((x) => x.correct)!;
    const due = c.delayMs + plan.fallMs;
    while (s.elapsedMs + 10 < due) s.update(10);
    expect(s.phase).toBe('falling');
    s.update(20);
    expect(s.phase).toBe('missed');
  });

  it('띠 뒤 카드는 잡을 수 없다', () => {
    const s = makeSession(5);
    const c = s.cards.find((x) => x.correct)!;
    expect(s.grab(c.id)).toBe('ignored');
    expect(s.score).toBe(0);
  });

  it('카메라 모드: 손이 3초 넘게 안 보이면 자동 일시정지, 손이 보이면 세기 처음부터', () => {
    const s = makeSession(9, 'normal', true);
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
    const s = makeSession(9, 'normal', false);
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

  it('일시정지 중에는 시간이 흐르지 않고 잡을 수 없다(감점도 없음)', () => {
    const s = makeSession(2, 'hard');
    s.update(50);
    s.score = 100;
    s.pause('user');
    s.update(50);
    expect(s.elapsedMs).toBe(50);
    for (const c of s.cards) expect(s.grab(c.id)).toBe('ignored');
    expect(s.score).toBe(100);
  });

  it('화면 크기가 바뀌어도 xFrac·p 유지', () => {
    const s = makeSession(4);
    for (let i = 0; i < 100; i++) s.update(16);
    const before = s.cards.map((c) => [c.xFrac, c.p]);
    s.setViewport({ W: 820, H: 1180 });
    expect(s.cards.map((c) => [c.xFrac, c.p])).toEqual(before);
  });
});
