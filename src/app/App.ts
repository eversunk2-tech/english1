// 화면 상태 기계(start → loading → handcheck → countdown → playing ⇄ paused → result, error)와 rAF 루프 하나(spec 11).
import { GAME } from '../config.ts';
import questionsData from '../data/questions.json';
import veryhardData from '../data/veryhard.json';
import { Camera } from '../camera/camera.ts';
import { classifyCameraError, type AppError, type ErrorKind } from '../camera/errors.ts';
import { buildGamePlans } from '../game/questions.ts';
import { BAG_NAMES, bagsFor, drawAnswers, remainingCount, returnUnshown, type BagName, type BagState } from '../game/bag.ts';
import { mulberry32, randomSeed } from '../game/rng.ts';
import { Session, type SessionEvent } from '../game/session.ts';
import { cardMetrics } from '../game/layout.ts';
import { grabTarget, hitMargin, cardAt, type HitCard } from '../game/hitTest.ts';
import type { BandChoice, QuestionsFile, Rect, Viewport } from '../game/types.ts';
import { MediapipeSource, type MediapipeStats } from '../hand/mediapipeSource.ts';
import { ReplaySource } from '../hand/replaySource.ts';
import { PointerInput } from '../hand/pointerInput.ts';
import { expireTracks, initialTracks, updateTracks, type GrabEvent, type TracksState } from '../hand/handTracks.ts';
import type { DistanceHint } from '../hand/mapping.ts';
import type { HandFrame, HandSource, Point2 } from '../hand/tracker.ts';
import { CanvasLayer, cachedCardFontSize, drawCards, drawCursors, makeMeasure, type DrawCard, type DrawCursor } from '../render/canvasRenderer.ts';
import { Effects } from '../render/effects.ts';
import { Hud } from '../ui/hud.ts';
import { Screens } from '../ui/screens.ts';
import { CHALLENGE_LINES, DIFFICULTY_LABELS, S, V2 } from '../ui/strings.ts';
import type { Difficulty } from '../config.ts';
import { Sfx } from '../audio/sfx.ts';
import { Speech } from '../audio/speech.ts';
import { acquireWakeLock, releaseWakeLock } from '../platform/wakeLock.ts';
import {
  loadBest,
  loadDifficulty,
  loadSound,
  migrateBest,
  migrateRecentToBags,
  saveBest,
  saveDifficulty,
  saveSound,
} from '../platform/storage.ts';
import { BagStore } from '../platform/bagStore.ts';
import { blockedRequestCount } from '../platform/networkGuard.ts';
import { DebugOverlay } from '../debug/debugOverlay.ts';
import { Recorder } from '../debug/recorder.ts';
import { installTestHooks, type TestState } from '../debug/testHooks.ts';
import type { Params } from './params.ts';

export type ScreenName = 'start' | 'loading' | 'handcheck' | 'countdown' | 'playing' | 'paused' | 'result' | 'error';
export type Mode = 'camera' | 'pointer' | 'replay';

const ALL_QUESTIONS = (questionsData as QuestionsFile).questions;
/** v4: Very Hard 전용 풀(부록 D) */
const VERYHARD_QUESTIONS = (veryhardData as QuestionsFile).questions;
const POOLS = { main: ALL_QUESTIONS, veryhard: VERYHARD_QUESTIONS };
const STEP_MS = 1000 / 60;

interface Els {
  app: HTMLElement;
  video: HTMLVideoElement;
  stage: HTMLCanvasElement;
  cursor: HTMLCanvasElement;
  hud: HTMLElement;
  screens: HTMLElement;
  badge: HTMLElement;
}

function getEls(): Els {
  const q = <T extends HTMLElement>(id: string): T => {
    const el = document.getElementById(id);
    if (!el) throw new Error(`#${id} missing`);
    return el as T;
  };
  return {
    app: q('app'),
    video: q<HTMLVideoElement>('camera-video'),
    stage: q<HTMLCanvasElement>('stage'),
    cursor: q<HTMLCanvasElement>('cursor-layer'),
    hud: q('hud'),
    screens: q('screens'),
    badge: q('camera-badge'),
  };
}

export class App {
  private readonly params: Params;
  private readonly els: Els;
  private readonly stage: CanvasLayer;
  private readonly cursorLayer: CanvasLayer;
  private readonly hud: Hud;
  private readonly screens: Screens;
  private readonly pointer: PointerInput;
  private readonly camera: Camera;
  private mp: MediapipeSource | null = null;
  private readonly replay = new ReplaySource();
  private readonly sfx = new Sfx();
  private readonly speech = new Speech();
  private readonly effects = new Effects();
  private readonly debug: DebugOverlay | null = null;
  private readonly recorder: Recorder | null = null;

  screen: ScreenName = 'start';
  mode: Mode = 'pointer';
  band: BandChoice;
  difficulty: Difficulty;
  sound: boolean;
  session: Session | null = null;
  private tracks: TracksState = initialTracks();
  private hint: DistanceHint = null;
  private vp: Viewport = { W: 1, H: 1 };
  /** 앱 시계(ms). 실제 시계 모드는 rAF 시간, 수동 시계 모드는 clock.step으로만 흐른다. */
  now = 0;
  private lastRaf: number | null = null;
  private countdownLeft = 0;
  private countdownShown = 0;
  private countdownDone: (() => void) | null = null;
  private gameCount = 0;
  private seedBase: number;
  /** v8: 섞은 카드 더미(spec 5.6.1). seed 모드(?test=1&seed=)면 저장하지 않음 */
  private readonly bags: BagStore;
  /** 이번 판이 쓰는 더미 이름 */
  private gameBags: BagName[] | null = null;
  private lastResult: { best: number; newRecord: boolean } | null = null;
  private lastError: AppError | null = null;
  private grabCount = 0;
  private lastGrab: { pos: Point2; target: string | null; t: number } | null = null;
  private renderFps = 0;
  private loadingPct = 0;

  constructor(params: Params) {
    this.params = params;
    this.els = getEls();
    this.stage = new CanvasLayer(this.els.stage);
    this.cursorLayer = new CanvasLayer(this.els.cursor);
    this.hud = new Hud(this.els.hud, () => this.userPause());
    this.screens = new Screens(this.els.screens);
    this.pointer = new PointerInput(this.els.app, () => this.processPointer());
    this.camera = new Camera(this.els.video);
    this.band = params.band ?? GAME.DEFAULT_BAND;
    // 난이도: URL ?difficulty=가 있으면 그것(저장도 함), 없으면 기억한 값, 그것도 없으면 normal(spec 6.2 v2)
    migrateBest();
    // v8: seed 모드는 저장된 더미를 읽지도 쓰지도 않는다(옛 키 옮기기도 안 함, spec 5.6.1 ⑥⑦⑧)
    const persist = params.seed === null;
    if (persist) migrateRecentToBags(POOLS);
    this.bags = new BagStore(POOLS, { persist });
    if (params.difficulty) saveDifficulty(params.difficulty);
    this.difficulty = params.difficulty ?? loadDifficulty();
    this.sound = loadSound();
    this.applySound();
    this.seedBase = params.seed ?? randomSeed();
    if (params.debug) {
      this.debug = new DebugOverlay(this.els.app);
      if (params.record) this.recorder = new Recorder(this.els.app);
    }
    this.els.badge.textContent = S.cameraOn;
    // 카메라 트랙이 중간에 끊기면 오류 화면(busy). [다시 시도]는 카메라만 다시 연다(spec 3.1·8.2, review R3)
    this.camera.onEnded = () => {
      this.camera.close();
      this.mp?.stop();
      this.tracks = initialTracks();
      this.showError({ kind: 'busy', name: 'TrackEnded' });
    };
  }

  init(): void {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.onHidden();
    });
    // 페이지를 떠날 때 손 인식기·카메라를 정리한다(review R11). 뒤로 가기 캐시에서 돌아오면 시작 화면부터.
    window.addEventListener('pagehide', () => this.dispose());
    window.addEventListener('pageshow', (e) => {
      if (e.persisted) this.showStart();
    });
    // 첫 터치 때 AudioContext.resume(spec 5.9)
    window.addEventListener('pointerdown', () => this.sfx.prime(), { capture: true });
    if (this.params.test) installTestHooks(this.testApi());
    this.showStart();
    requestAnimationFrame((t) => this.loop(t));
  }

  /** 손 인식기 닫기 + 카메라 끄기. 다음에 카메라로 시작하면 다시 만든다. */
  dispose(): void {
    this.onHidden();
    this.camera.close();
    this.mp?.dispose();
    this.mp = null;
    this.els.badge.hidden = true;
  }

  // ───────────── 화면 전환 ─────────────

  private setScreen(s: ScreenName): void {
    this.screen = s;
    this.els.app.dataset.screen = s;
    const hudOn = s === 'playing' || s === 'paused' || (s === 'countdown' && this.session !== null);
    this.hud.show(hudOn);
    this.pointer.enabled = this.mode === 'pointer' && (s === 'playing');
    this.els.badge.hidden = !this.camera.active;
  }

  private setMode(m: Mode): void {
    this.mode = m;
    this.els.app.dataset.mode = m;
  }

  showStart(): void {
    this.endSession();
    this.camera.close();
    this.mp?.stop();
    this.replay.stop();
    this.tracks = initialTracks();
    this.setMode(this.params.input === 'pointer' ? 'pointer' : 'camera');
    this.screens.start({
      band: this.band,
      difficulty: this.difficulty,
      sound: this.sound,
      onBand: (b) => {
        this.band = b;
      },
      onDifficulty: (d) => {
        this.difficulty = d;
        saveDifficulty(d);
      },
      onSound: (on) => {
        this.sound = on;
        saveSound(on);
        this.applySound();
      },
      onCamera: () => {
        this.primeAudio();
        if (this.params.input === 'pointer') this.startTouch();
        else void this.startCamera();
      },
      onTouch: () => {
        this.primeAudio();
        this.startTouch();
      },
    });
    this.setScreen('start');
  }

  private primeAudio(): void {
    this.sfx.prime();
    this.speech.prime();
  }

  private applySound(): void {
    this.sfx.enabled = this.sound;
    this.speech.enabled = this.sound;
  }

  async startCamera(): Promise<void> {
    this.tracks = initialTracks();
    this.hint = null;
    if (this.params.input === 'replay') {
      this.setMode('replay');
      this.showHandcheck();
      return;
    }
    this.setMode('camera');
    this.screens.loading(S.loadingCamera);
    this.setScreen('loading');
    try {
      await this.camera.open();
      this.els.badge.hidden = false;
      if (!this.mp) {
        this.mp = new MediapipeSource(this.els.video, {
          delegate: this.params.delegate,
          onProgress: (pct) => {
            this.loadingPct = pct;
            if (this.screen === 'loading') this.screens.setLoadingText(S.loadingModel(pct));
          },
        });
      }
      if (!this.mp.ready) {
        this.screens.loading(S.loadingModel(0), S.loadingFirstTime);
        this.setScreen('loading');
        await this.mp.start();
      }
      if (this.screen !== 'loading') return; // 그 사이 다른 화면으로 갔다
      this.showHandcheck();
    } catch (e) {
      this.camera.close();
      this.showError(classifyCameraError(e));
    }
  }

  startTouch(): void {
    this.camera.close();
    this.tracks = initialTracks();
    this.setMode('pointer');
    this.showHandcheck();
  }

  private showHandcheck(): void {
    this.endSession();
    const touch = this.mode === 'pointer';
    this.screens.handcheck(touch, () => {
      // START 카드 누르기: 터치 모드에서 바로 3·2·1, 카메라 모드에서도 터치로 시작할 수 있게 둔다
      this.primeAudio();
      this.beginCountdown(() => this.startGame());
    });
    this.setScreen('handcheck');
  }

  private showError(err: AppError): void {
    this.lastError = err;
    this.endSession();
    this.screens.error(
      err,
      () => {
        this.primeAudio();
        void this.startCamera();
      },
      () => {
        this.primeAudio();
        this.startTouch();
      },
    );
    this.setScreen('error');
  }

  forceError(kind: ErrorKind): void {
    const names: Record<ErrorKind, string> = {
      insecure: 'InsecureContext',
      denied: 'NotAllowedError',
      notfound: 'NotFoundError',
      busy: 'NotReadableError',
      download: 'DownloadError',
      init: 'InitError',
      other: 'Error',
    };
    this.camera.close();
    this.showError({ kind, name: names[kind] });
  }

  private beginCountdown(done: () => void): void {
    this.countdownLeft = GAME.COUNTDOWN_MS;
    this.countdownShown = 0;
    this.countdownDone = done;
    this.screens.countdown(Math.ceil(this.countdownLeft / 1000));
    this.setScreen('countdown');
  }

  private startGame(): void {
    const rng = mulberry32((this.seedBase + this.gameCount * 7919) >>> 0);
    this.gameCount += 1;
    // v8: 정답은 섞은 카드 더미에서(spec 5.6.1). Very Hard면 학년 무시하고 Very Hard 더미, "모두"는 3-4·5-6 더미 함께.
    // 뽑은 결과는 판을 시작할 때 바로 저장한다(탭을 닫아도 이 판의 문제는 "낸 것").
    const names = bagsFor(this.band, this.difficulty);
    const drawn = drawAnswers(
      names.map((name) => ({ name, pool: this.bags.pool(name), state: this.bags.load(name) })),
      GAME.QUESTIONS_PER_GAME,
      rng,
    );
    for (const name of names) {
      const st = drawn.states[name];
      if (st) this.bags.save(name, st);
    }
    this.gameBags = names;
    // Very Hard면 학년 무시하고 Very Hard 풀에서만 오답(spec 5.6 v4). 오답 고르기는 같은 rng로 이어서
    const plans = buildGamePlans(POOLS, this.band, this.difficulty, rng, drawn.answers);
    this.session = new Session({ plans, rng, viewport: this.vp, camera: this.mode !== 'pointer', difficulty: this.difficulty });
    this.hud.setDifficulty(DIFFICULTY_LABELS[this.difficulty].en, this.difficulty);
    this.effects.clear();
    this.hud.clearTransient();
    this.screens.clear();
    this.setScreen('playing');
    void acquireWakeLock();
    this.handleEvents(this.session.drainEvents());
  }

  private endSession(): void {
    this.returnUnshownQuestions();
    this.session = null;
    this.countdownDone = null;
    releaseWakeLock();
    this.speech.cancel();
    this.hud.clearTransient();
  }

  /**
   * 끝나지 않은 판을 버릴 때 아직 화면에 나오지 않은 문제를 더미로 되돌린다(spec 5.6.1 ⑤, 한 판에 한 번).
   * 설명 띠에 한 번이라도 나온 문제(index까지)는 "나온 것".
   */
  private returnUnshownQuestions(): void {
    const s = this.session;
    const names = this.gameBags;
    if (!s || !names || s.phase === 'finished') return;
    this.gameBags = null;
    const ids = s.plans.slice(s.index + 1).map((p) => p.answer.id);
    if (ids.length === 0) return;
    const states: Partial<Record<BagName, BagState>> = {};
    for (const name of names) states[name] = this.bags.load(name);
    const back = returnUnshown(states, ids);
    for (const name of names) {
      const st = back[name];
      if (st) this.bags.save(name, st);
    }
  }

  /** 테스트 훅·디버그용 더미 요약: 이번 판(없으면 지금 고른 학년군·난이도)이 쓰는 더미, 남은 수, 풀 크기 */
  private bagInfo(): { names: BagName[]; remaining: Record<BagName, number>; sizes: Record<BagName, number>; persist: boolean } {
    const remaining = {} as Record<BagName, number>;
    const sizes = {} as Record<BagName, number>;
    for (const name of BAG_NAMES) {
      const pool = this.bags.pool(name);
      sizes[name] = pool.length;
      remaining[name] = remainingCount(pool, this.bags.load(name));
    }
    const names = this.session && this.gameBags ? this.gameBags : bagsFor(this.band, this.difficulty);
    return { names, remaining, sizes, persist: this.bags.persist };
  }

  private userPause(): void {
    if (this.screen !== 'playing' || !this.session) return;
    this.pauseGame('user');
  }

  /** 결과 화면의 [다시 하기]·AGAIN: 끝난 판을 먼저 지우고 3·2·1(review M1) */
  private againFromResult(): void {
    this.endSession();
    this.beginCountdown(() => this.startGame());
  }

  private pauseGame(reason: 'user' | 'nohand' | 'hidden'): void {
    // 끝난 판은 멈출 것이 없다(review M1)
    if (!this.session || this.session.phase === 'finished') return;
    this.session.pause(reason);
    releaseWakeLock();
    this.speech.cancel();
    this.screens.paused(
      reason === 'nohand',
      () => this.resumeGame(),
      () => this.showStart(),
    );
    this.setScreen('paused');
  }

  private resumeGame(): void {
    const s = this.session;
    if (!s) return;
    this.beginCountdown(() => {
      s.resume();
      this.screens.clear();
      this.setScreen('playing');
      void acquireWakeLock();
    });
  }

  private onHidden(): void {
    if (this.screen === 'playing') this.pauseGame('hidden');
    else if (this.screen === 'countdown') {
      // 놀던 판을 이어 하려던 3·2·1이면 멈춤, 새 판을 시작하려던 3·2·1이면 START 화면으로(review M1)
      if (this.session && this.session.phase !== 'finished') this.pauseGame('hidden');
      else this.showHandcheck();
    }
  }

  private finish(): void {
    const s = this.session;
    if (!s) return;
    const d = s.difficulty;
    const best = loadBest(this.band, d);
    const newRecord = s.score > best;
    if (newRecord) saveBest(this.band, d, s.score);
    const wrong = s.wrongSummary;
    this.lastResult = { best: Math.max(best, s.score), newRecord };
    releaseWakeLock();
    this.hud.clearTransient();
    this.screens.result({
      score: s.score,
      correct: s.correctCount,
      total: s.total,
      best: Math.max(best, s.score),
      newRecord,
      results: s.results,
      showGrabCard: this.mode !== 'pointer',
      band: this.band,
      difficulty: d,
      challenge: s.firstTryCount >= 8 ? CHALLENGE_LINES[d] : null,
      wrongCount: wrong.count,
      wrongDeducted: wrong.deducted,
      debug: this.params.debug,
      onAgain: () => {
        this.primeAudio();
        this.againFromResult();
      },
      onHome: () => this.showStart(),
      onWord: (w) => this.speech.say(w),
    });
    this.setScreen('result');
  }

  // ───────────── 루프 ─────────────

  private loop(t: number): void {
    const dt = this.lastRaf === null ? 0 : t - this.lastRaf;
    this.lastRaf = t;
    if (!this.params.manualClock) this.advance(Math.min(dt, 1000));
    this.render(t);
    requestAnimationFrame((tt) => this.loop(tt));
  }

  /** 수동 시계: ms만큼 1/60초씩 나눠 진행 */
  step(ms: number): void {
    let left = ms;
    while (left > 1e-6) {
      const d = Math.min(STEP_MS, left);
      this.advance(d);
      left -= d;
    }
    this.render(performance.now());
  }

  private source(): HandSource | null {
    if (this.mode === 'camera') return this.mp && this.mp.ready && this.camera.active ? this.mp : null;
    if (this.mode === 'replay') return this.replay;
    return null;
  }

  private advance(dt: number): void {
    this.now += dt;
    const grabs = this.pollHands();
    this.processPointer();

    switch (this.screen) {
      case 'handcheck':
        this.updateHandcheck(grabs);
        break;
      case 'countdown':
        this.updateCountdown(dt);
        break;
      case 'playing':
        this.updatePlaying(dt, grabs);
        break;
      case 'paused':
        this.updatePaused();
        break;
      case 'result':
        this.updateResult(grabs);
        break;
      default:
        break;
    }
    this.effects.update(dt);
  }

  private pollHands(): GrabEvent[] {
    const src = this.source();
    const grabs: GrabEvent[] = [];
    if (!src) {
      if (this.tracks.tracks.length > 0) this.tracks = initialTracks();
      return grabs;
    }
    const mirror = true;
    for (let i = 0; i < 8; i++) {
      const f: HandFrame | null = src.poll(this.now);
      if (!f) break;
      this.recorder?.add(f);
      const up = updateTracks(this.tracks, f, this.vp.W, this.vp.H, mirror);
      this.tracks = up.state;
      this.hint = up.hint;
      grabs.push(...up.grabs);
      if (src.kind === 'camera') break;
    }
    this.tracks = expireTracks(this.tracks, this.now);
    if (this.tracks.tracks.length === 0) this.hint = null;
    for (const g of grabs) {
      this.grabCount += 1;
      this.sfx.grab();
      this.lastGrab = { pos: g.pos, target: null, t: g.t };
    }
    return grabs;
  }

  private pendingTaps: Point2[] = [];

  private processPointer(): void {
    for (const tap of this.pointer.drain()) this.pendingTaps.push(tap.pos);
    if (this.screen !== 'playing' || !this.session) {
      this.pendingTaps = [];
      return;
    }
    const taps = this.pendingTaps;
    this.pendingTaps = [];
    for (const pos of taps) {
      this.grabCount += 1;
      this.sfx.grab();
      const id = cardAt(this.hitCards(), pos, hitMargin(this.vp, true));
      this.lastGrab = { pos, target: id === null ? null : this.cardWord(id), t: this.now };
      if (id !== null) this.session.grab(id);
      this.handleEvents(this.session.drainEvents());
    }
  }

  private cardWord(id: number): string | null {
    return this.session?.cards.find((c) => c.id === id)?.q.word ?? null;
  }

  private hitCards(): HitCard[] {
    const s = this.session;
    if (!s) return [];
    return s.cards.map((c) => ({ id: c.id, rect: s.rectOf(c), grabbable: s.grabbable(c) }));
  }

  /** DOM 카드(START·AGAIN)에 손으로 잡기 */
  private grabOnDomCard(grabs: readonly GrabEvent[]): boolean {
    const r = this.screens.grabCardRect();
    if (!r) return false;
    const m = hitMargin(this.vp, false);
    const card: HitCard = { id: 1, rect: { x: r.left, y: r.top, w: r.width, h: r.height }, grabbable: true };
    // 커서 겨냥 표시
    const aimed = this.tracks.tracks.some((t) => !t.offscreen && cardAt([card], t.pos, m) !== null);
    this.screens.setGrabCardAimed(aimed);
    for (const g of grabs) {
      if (grabTarget([card], g.pos, g.prevOpenPos, m) !== null) return true;
    }
    return false;
  }

  private hintText(): string | null {
    if (this.hint === 'far') return S.comeCloser;
    if (this.hint === 'close') return S.stepBack;
    return null;
  }

  private updateHandcheck(grabs: GrabEvent[]): void {
    if (this.mode === 'pointer') return;
    const tracks = this.tracks.tracks;
    // 큰 안내: 손을 펴 보이기 → (OPEN 확정) START 위에서 쥐기. 작은 안내: 손이 안 보임 / 거리.
    const text = tracks.some((t) => t.gesture.confirmed === 'OPEN') ? S.handcheckGrab : S.handcheckShowPalm;
    const hint = tracks.length === 0 ? S.handNotVisible : this.hintText();
    this.screens.setHandcheck(text, hint);
    if (this.grabOnDomCard(grabs)) this.beginCountdown(() => this.startGame());
  }

  private updateCountdown(dt: number): void {
    this.countdownLeft -= dt;
    const n = Math.max(0, Math.ceil(this.countdownLeft / 1000));
    if (n !== this.countdownShown && n > 0) {
      this.countdownShown = n;
      this.screens.countdown(n);
      this.sfx.countdown(false);
    }
    if (this.countdownLeft <= 0) {
      const done = this.countdownDone;
      this.countdownDone = null;
      this.sfx.countdown(true);
      done?.();
    }
  }

  private updatePlaying(dt: number, grabs: GrabEvent[]): void {
    const s = this.session;
    if (!s) return;
    const handVisible = this.mode === 'pointer' ? true : this.tracks.tracks.length > 0;
    s.update(dt, handVisible);
    if (grabs.length > 0) {
      const cards = this.hitCards();
      const m = hitMargin(this.vp, false);
      for (const g of grabs) {
        const id = grabTarget(cards, g.pos, g.prevOpenPos, m);
        this.lastGrab = { pos: g.pos, target: id === null ? null : this.cardWord(id), t: g.t };
        if (id !== null) s.grab(id);
      }
    }
    this.hud.setHint(this.mode === 'pointer' ? null : this.hintText());
    this.handleEvents(s.drainEvents());
  }

  private updatePaused(): void {
    const s = this.session;
    if (!s || s.paused !== 'nohand' || this.mode === 'pointer') return;
    // 손이 OPEN으로 0.5초 확정되면 3·2·1 뒤 이어서(spec 5.7)
    const ok = this.tracks.tracks.some(
      (t) => t.gesture.confirmed === 'OPEN' && this.now - t.gesture.confirmedAt >= GAME.RESUME_OPEN_MS,
    );
    if (ok) this.resumeGame();
  }

  private updateResult(grabs: GrabEvent[]): void {
    if (this.mode === 'pointer') return;
    if (this.grabOnDomCard(grabs)) this.againFromResult();
  }

  private handleEvents(events: SessionEvent[]): void {
    const s = this.session;
    if (!s) return;
    for (const e of events) {
      switch (e.type) {
        case 'question':
          this.hud.hideReveal();
          this.hud.setClue(e.q.clue);
          this.hud.setProgress(e.index + 1, s.total, s.score);
          this.speech.say(e.q.clue);
          break;
        case 'correct': {
          const card = s.cards.find((c) => c.id === e.cardId);
          if (card) {
            const r = s.rectOf(card);
            this.effects.burst(r.x + r.w / 2, r.y + r.h / 2);
            this.hud.popScore(V2.gain(e.score), r.x + r.w / 2, r.y, 'gain');
          }
          this.sfx.correct();
          this.speech.say(e.q.word);
          this.hud.flash(e.firstTry ? S.great : S.goodJob, 'good', 1200);
          if (e.combo >= GAME.COMBO_FROM) this.hud.showCombo(S.combo(e.combo));
          this.hud.setProgress(s.index + 1, s.total, s.score);
          break;
        }
        case 'wrong': {
          this.sfx.wrong();
          this.hud.flash(S.tryAgain, 'bad', 700);
          // 실제로 깎인 점수가 있을 때만 빨간 "−20"(spec 5.2-3 v2)
          const card = s.cards.find((c) => c.id === e.cardId);
          if (card && e.deducted > 0) {
            const r = s.rectOf(card);
            this.hud.popScore(V2.penalty(e.deducted), r.x + r.w / 2, r.y, 'loss');
          }
          this.hud.setProgress(s.index + 1, s.total, s.score);
          break;
        }
        case 'miss':
          this.hud.showReveal(e.q.word, e.q.ko);
          break;
        case 'autopause':
          this.pauseGame('nohand');
          break;
        case 'finished':
          this.finish();
          return;
      }
    }
  }

  // ───────────── 그리기 ─────────────

  private resize(): void {
    const W = Math.max(1, Math.round(window.innerWidth));
    const H = Math.max(1, Math.round(window.innerHeight));
    this.vp = { W, H };
    this.stage.resize(this.vp);
    this.cursorLayer.resize(this.vp);
    this.hud.resize(W, H);
    this.session?.setViewport(this.vp);
    this.render(performance.now());
  }

  private cursors(): DrawCursor[] {
    if (this.mode === 'pointer') {
      const hov = this.pointer.hover;
      return hov && this.screen === 'playing' ? [{ id: 1, pos: hov, C: 0, closed: false, offscreen: false }] : [];
    }
    return this.tracks.tracks.map((t) => ({
      id: t.id,
      pos: t.pos,
      C: t.fist?.C ?? 0,
      closed: t.gesture.confirmed === 'CLOSED',
      offscreen: t.offscreen,
    }));
  }

  private render(t: number): void {
    const ctx = this.stage.ctx;
    this.stage.clear();
    const s = this.session;
    const cursors = this.cursors();
    if (s && (this.screen === 'playing' || this.screen === 'paused' || this.screen === 'countdown')) {
      const m = hitMargin(this.vp, this.mode === 'pointer');
      const cards = this.hitCards();
      const aimedIds = new Set<number>();
      for (const c of cursors) {
        if (c.offscreen || c.closed) continue;
        const id = cardAt(cards, c.pos, m);
        if (id !== null) aimedIds.add(id);
      }
      const draw: DrawCard[] = s.cards.map((c) => ({
        id: c.id,
        word: c.q.word,
        ko: c.q.ko,
        rect: s.rectOf(c),
        status: c.status,
        statusMs: c.statusMs,
        aimed: aimedIds.has(c.id),
      }));
      drawCards(ctx, draw);
      this.effects.draw(ctx);
    }
    const cctx = this.cursorLayer.ctx;
    this.cursorLayer.clear();
    if (this.debug) {
      this.renderFps = this.debug.tickFrame(t);
      this.debug.drawTracks(cctx, this.tracks.tracks);
      this.debug.update({
        renderFps: this.renderFps,
        mp: this.mp ? this.mp.stats() : null,
        tracks: this.tracks.tracks,
        mode: this.mode,
        screen: this.screen,
        blocked: blockedRequestCount(),
        voice: this.speech.describe(),
        voiceHint: this.speech.qualityHint(),
        bag: this.bagInfo(),
      });
    }
    if (this.screen !== 'start' && this.screen !== 'loading' && this.screen !== 'error') drawCursors(cctx, cursors);
  }

  // ───────────── 테스트 훅 ─────────────

  private mpStats(): MediapipeStats | null {
    return this.mp ? this.mp.stats() : null;
  }

  private state(): TestState {
    const s = this.session;
    const measure = makeMeasure(this.stage.ctx);
    const rectOf = (r: DOMRect | null): Rect | null => (r ? { x: r.left, y: r.top, w: r.width, h: r.height } : null);
    const n = s ? s.cards.length : 0;
    const metrics = n > 0 ? cardMetrics(this.vp, n) : null;
    return {
      screen: this.screen,
      mode: this.mode,
      band: this.band,
      now: this.now,
      question: s ? s.index + 1 : 0,
      total: s ? s.total : 0,
      score: s ? s.score : 0,
      combo: s ? s.combo : 0,
      phase: s ? s.phase : null,
      paused: s ? s.paused : null,
      clue: s?.current?.answer.clue ?? null,
      difficulty: s ? s.difficulty : this.difficulty,
      fallMs: s?.current?.fallMs ?? null,
      voice: this.speech.describe(),
      answer: s?.current?.answer.word ?? null,
      bandH: s ? s.bandH() : cardMetrics(this.vp, 3).bandH,
      viewport: { ...this.vp },
      cards: s
        ? s.cards.map((c) => {
            const r = s.rectOf(c);
            const fontPx = metrics ? cachedCardFontSize(this.stage.ctx, c.q.word, metrics.cardW, metrics.cardH) : 0;
            return {
              id: c.id,
              word: c.q.word,
              correct: c.correct,
              rect: r,
              alive: c.status === 'falling',
              status: c.status,
              p: c.p,
              grabbable: s.grabbable(c),
              fontPx,
              textW: measure(c.q.word, fontPx),
            };
          })
        : [],
      results: s
        ? s.results.map((r) => ({ word: r.q.word, mark: r.mark, score: r.score, deducted: r.deducted, wrongs: r.wrongs.slice(), fallMs: r.fallMs }))
        : [],
      tracks: this.tracks.tracks.map((t) => ({
        id: t.id,
        x: t.pos.x,
        y: t.pos.y,
        state: t.gesture.confirmed,
        C: t.fist?.C ?? null,
        offscreen: t.offscreen,
      })),
      grabCount: this.grabCount,
      lastGrab: this.lastGrab,
      grabCardRect: rectOf(this.screens.grabCardRect()),
      result: this.lastResult,
      error: this.lastError,
      detectCount: this.mpStats()?.detectCount ?? 0,
      delegate: this.mpStats()?.delegate ?? '-',
      loadingPct: this.loadingPct,
      blockedRequests: blockedRequestCount(),
      cameraActive: this.camera.active,
      clueInfo: this.hud.clueInfo(),
      bag: this.bagInfo(),
    };
  }

  private testApi(): Parameters<typeof installTestHooks>[0] {
    return {
      state: () => this.state(),
      loadReplay: (frames) => {
        this.replay.load(frames, this.now);
      },
      step: (ms) => this.step(ms),
      forceError: (kind) => this.forceError(kind),
      probeLayout: (clue, word) => {
        const prev = this.hud.clueInfo();
        void prev;
        this.hud.show(true);
        const oldScreen = this.screen;
        const cur = this.session?.current?.answer.clue ?? '';
        this.hud.setClue(clue);
        const info = this.hud.clueInfo();
        this.hud.setClue(cur);
        this.hud.show(oldScreen === 'playing' || oldScreen === 'paused' || (oldScreen === 'countdown' && this.session !== null));
        const metrics = cardMetrics(this.vp, 4);
        const measure = makeMeasure(this.stage.ctx);
        const fontPx = cachedCardFontSize(this.stage.ctx, word, metrics.cardW, metrics.cardH);
        return { clueLines: info.lines, clueFontPx: info.fontPx, clueHeight: info.height, bandH: info.bandH, cardW: metrics.cardW, cardFontPx: fontPx, cardTextW: measure(word, fontPx) };
      },
    };
  }
}
