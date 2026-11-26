// spec 5.2~5.7: 한 판 진행·채점·결과. 순수 — 시간은 update(dt)로만 흐른다.
import { GAME } from '../config.ts';
import { cardMetrics, cardRect, placeCards } from './layout.ts';
import type { Rng } from './rng.ts';
import { correctScore } from './scoring.ts';
import type { Question, QuestionPlan, Rect, Viewport } from './types.ts';

export type CardStatus = 'falling' | 'wrong' | 'caught' | 'fading' | 'gone';

export interface SessionCard {
  id: number;
  q: Question;
  correct: boolean;
  lane: number;
  xFrac: number;
  delayMs: number;
  /** 진행도 0(띠 뒤) → 1(화면 아래로 완전히 빠짐) */
  p: number;
  status: CardStatus;
  /** 지금 상태가 된 뒤 지난 시간(ms) */
  statusMs: number;
}

export type Mark = 'first' | 'retry' | 'miss';

export interface QuestionResult {
  q: Question;
  mark: Mark;
  score: number;
}

export type SessionPhase = 'falling' | 'correct' | 'missed' | 'finished';
export type PauseReason = 'user' | 'nohand' | 'hidden';

export type SessionEvent =
  | { type: 'question'; index: number; q: Question }
  | { type: 'correct'; cardId: number; q: Question; firstTry: boolean; score: number; combo: number; comboBonus: number }
  | { type: 'wrong'; cardId: number; q: Question }
  | { type: 'miss'; q: Question }
  | { type: 'autopause' }
  | { type: 'finished' };

export interface SessionOptions {
  plans: QuestionPlan[];
  rng: Rng;
  viewport: Viewport;
  /** 카메라 모드면 손이 3초 넘게 안 보일 때 자동 일시정지 */
  camera: boolean;
}

export class Session {
  readonly plans: QuestionPlan[];
  private readonly rng: Rng;
  private readonly camera: boolean;
  viewport: Viewport;

  index = -1;
  phase: SessionPhase = 'falling';
  /** 지금 문제가 시작된 뒤 흐른 시간(ms, 떨어지는 동안만) */
  elapsedMs = 0;
  /** 지금 phase가 된 뒤 흐른 시간(ms) */
  phaseMs = 0;
  score = 0;
  combo = 0;
  maxCombo = 0;
  firstTry = true;
  paused: PauseReason | null = null;
  noHandMs = 0;
  cards: SessionCard[] = [];
  results: QuestionResult[] = [];
  /** 마지막 정답·놓침 정보(화면 표시용) */
  lastCorrect: { cardId: number; firstTry: boolean; score: number; combo: number } | null = null;
  private events: SessionEvent[] = [];
  private nextCardId = 1;

  constructor(opts: SessionOptions) {
    this.plans = opts.plans;
    this.rng = opts.rng;
    this.camera = opts.camera;
    this.viewport = opts.viewport;
    this.startQuestion(0);
  }

  get total(): number {
    return this.plans.length;
  }

  get current(): QuestionPlan | null {
    return this.plans[this.index] ?? null;
  }

  get correctCount(): number {
    return this.results.filter((r) => r.mark !== 'miss').length;
  }

  setViewport(vp: Viewport): void {
    this.viewport = vp;
  }

  drainEvents(): SessionEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  pause(reason: PauseReason): void {
    if (this.phase === 'finished') return;
    if (this.paused === null) this.paused = reason;
  }

  resume(): void {
    this.paused = null;
    this.noHandMs = 0;
  }

  private startQuestion(i: number): void {
    this.index = i;
    const plan = this.plans[i];
    if (!plan) {
      this.phase = 'finished';
      this.cards = [];
      this.events.push({ type: 'finished' });
      return;
    }
    this.phase = 'falling';
    this.elapsedMs = 0;
    this.phaseMs = 0;
    this.firstTry = true;
    this.lastCorrect = null;
    const placements = placeCards(plan.options.length, this.viewport, this.rng);
    this.cards = plan.options.map((q, k) => {
      const pl = placements[k] ?? { lane: k, xFrac: 0.5 };
      return {
        id: this.nextCardId++,
        q,
        correct: q.word === plan.answer.word,
        lane: pl.lane,
        xFrac: pl.xFrac,
        delayMs: plan.delaysMs[k] ?? 0,
        p: 0,
        status: 'falling' as CardStatus,
        statusMs: 0,
      };
    });
    this.events.push({ type: 'question', index: i, q: plan.answer });
  }

  /** 카드 사각형(화면 px) */
  rectOf(card: SessionCard): Rect {
    return cardRect({ lane: card.lane, xFrac: card.xFrac }, card.p, this.viewport, this.cards.length);
  }

  bandH(): number {
    return cardMetrics(this.viewport, Math.max(1, this.cards.length)).bandH;
  }

  /**
   * 시간 진행. dt는 100ms로 자른다(spec 5.7).
   * @param handVisible 카메라 모드에서 손이 하나라도 보이는가
   */
  update(dtRaw: number, handVisible = true): void {
    if (this.phase === 'finished' || this.paused !== null) return;
    const dt = Math.max(0, Math.min(dtRaw, GAME.MAX_DT_MS));
    if (this.camera) {
      if (handVisible) this.noHandMs = 0;
      else {
        this.noHandMs += dt;
        if (this.noHandMs > GAME.NO_HAND_PAUSE_MS) {
          this.paused = 'nohand';
          this.events.push({ type: 'autopause' });
          return;
        }
      }
    }
    this.phaseMs += dt;
    for (const c of this.cards) c.statusMs += dt;
    const plan = this.current;
    if (!plan) return;

    if (this.phase === 'falling') {
      this.elapsedMs += dt;
      for (const c of this.cards) {
        if (c.status === 'falling') {
          c.p = Math.max(0, (this.elapsedMs - c.delayMs) / plan.stage.fallMs);
          if (!c.correct && c.p >= 1) this.setStatus(c, 'gone');
        } else if (c.status === 'wrong' && c.statusMs >= GAME.WRONG_SHAKE_MS) {
          this.setStatus(c, 'gone');
        }
      }
      const answer = this.cards.find((c) => c.correct);
      if (answer && answer.status === 'falling' && answer.p >= 1) {
        // 놓침(spec 5.2-4)
        answer.p = 1;
        this.combo = 0;
        this.results.push({ q: answer.q, mark: 'miss', score: 0 });
        for (const c of this.cards) if (c.status === 'falling' || c.status === 'wrong') this.setStatus(c, 'fading');
        this.phase = 'missed';
        this.phaseMs = 0;
        this.events.push({ type: 'miss', q: answer.q });
      }
      return;
    }

    for (const c of this.cards) {
      if (c.status === 'fading' && c.statusMs >= GAME.FADE_MS) this.setStatus(c, 'gone');
      if (c.status === 'wrong' && c.statusMs >= GAME.WRONG_SHAKE_MS) this.setStatus(c, 'gone');
    }
    if (this.phase === 'correct' && this.phaseMs >= GAME.CORRECT_NEXT_MS) this.startQuestion(this.index + 1);
    else if (this.phase === 'missed' && this.phaseMs >= GAME.MISS_SHOW_MS) this.startQuestion(this.index + 1);
  }

  private setStatus(c: SessionCard, s: CardStatus): void {
    c.status = s;
    c.statusMs = 0;
  }

  /** 지금 잡을 수 있는 카드인가(떨어지는 중 + 카드 중심이 띠 아래) */
  grabbable(card: SessionCard): boolean {
    if (this.phase !== 'falling' || this.paused !== null || card.status !== 'falling') return false;
    const r = this.rectOf(card);
    return r.y + r.h / 2 >= this.bandH();
  }

  /** 카드를 잡았다. 결과: 'correct' | 'wrong' | 'ignored' */
  grab(cardId: number): 'correct' | 'wrong' | 'ignored' {
    const card = this.cards.find((c) => c.id === cardId);
    if (!card || !this.grabbable(card)) return 'ignored';
    if (!card.correct) {
      this.setStatus(card, 'wrong');
      this.combo = 0;
      this.firstTry = false;
      this.events.push({ type: 'wrong', cardId: card.id, q: card.q });
      return 'wrong';
    }
    this.combo += 1;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    const sc = correctScore(this.firstTry, card.p, this.combo);
    this.score += sc.total;
    this.results.push({ q: card.q, mark: this.firstTry ? 'first' : 'retry', score: sc.total });
    this.setStatus(card, 'caught');
    for (const c of this.cards) if (c !== card && (c.status === 'falling' || c.status === 'wrong')) this.setStatus(c, 'fading');
    this.phase = 'correct';
    this.phaseMs = 0;
    this.lastCorrect = { cardId: card.id, firstTry: this.firstTry, score: sc.total, combo: this.combo };
    this.events.push({
      type: 'correct',
      cardId: card.id,
      q: card.q,
      firstTry: this.firstTry,
      score: sc.total,
      combo: this.combo,
      comboBonus: sc.combo,
    });
    return 'correct';
  }
}
