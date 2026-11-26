// ?test=1일 때만 window.__eg (spec 12.2). 읽기·입력·시계만 — 게임 규칙을 바꾸지 못한다.
// 규칙 값(config)은 내보내지 않는다(review M2). state()는 JSON 복사본이다.
import type { ErrorKind } from '../camera/errors.ts';
import type { HandFrame, Point2 } from '../hand/tracker.ts';
import type { Rect } from '../game/types.ts';

export interface TestCard {
  id: number;
  word: string;
  correct: boolean;
  rect: Rect;
  alive: boolean;
  status: string;
  p: number;
  grabbable: boolean;
  fontPx: number;
  textW: number;
}

export interface TestState {
  screen: string;
  mode: string;
  band: string;
  now: number;
  question: number;
  total: number;
  score: number;
  combo: number;
  phase: string | null;
  paused: string | null;
  clue: string | null;
  answer: string | null;
  bandH: number;
  viewport: { W: number; H: number };
  cards: TestCard[];
  results: { word: string; mark: string; score: number }[];
  tracks: { id: number; x: number; y: number; state: string; C: number | null; offscreen: boolean }[];
  grabCount: number;
  lastGrab: { pos: Point2; target: string | null; t: number } | null;
  grabCardRect: Rect | null;
  result: { best: number; newRecord: boolean } | null;
  error: { kind: string; name: string } | null;
  detectCount: number;
  delegate: string;
  loadingPct: number;
  blockedRequests: number;
  cameraActive: boolean;
  clueInfo: { lines: number; fontPx: number; height: number; bandH: number };
}

export interface LayoutProbe {
  clueLines: number;
  clueFontPx: number;
  clueHeight: number;
  bandH: number;
  cardW: number;
  cardFontPx: number;
  cardTextW: number;
}

export interface TestApi {
  state: () => TestState;
  loadReplay: (frames: HandFrame[]) => void;
  step: (ms: number) => void;
  forceError: (kind: ErrorKind) => void;
  /** 읽기 전용 배치 재기: 이 설명·단어가 지금 화면에서 몇 줄·몇 px로 그려지는가(E6) */
  probeLayout: (clue: string, word: string) => LayoutProbe;
}

declare global {
  interface Window {
    __eg?: {
      state: () => TestState;
      loadReplay: (frames: HandFrame[]) => void;
      clock: { step: (ms: number) => void };
      forceError: (kind: ErrorKind) => void;
      probeLayout: (clue: string, word: string) => LayoutProbe;
    };
  }
}

export function installTestHooks(api: TestApi): void {
  window.__eg = {
    state: () => JSON.parse(JSON.stringify(api.state())) as TestState,
    loadReplay: (frames) => api.loadReplay(frames),
    clock: { step: (ms) => api.step(ms) },
    forceError: (kind) => api.forceError(kind),
    probeLayout: (clue, word) => api.probeLayout(clue, word),
  };
  // 훅 객체 자체도 얼려 함수를 바꿔 끼울 수 없게 한다(spec 12.2)
  Object.freeze(window.__eg);
  Object.freeze(window.__eg.clock);
}
