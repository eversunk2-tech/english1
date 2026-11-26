// 모든 조정 값을 한 곳에 모은다(spec 4.6, 5.3~5.5, 10절). [추정] 값은 S7에서 실제 태블릿으로 고칠 수 있다.
// 모든 상수 객체는 깊게 얼린다 — 실행 중(테스트 훅 포함) 규칙 값을 바꿀 수 없게(spec 12.2, review M2).

type DeepReadonly<T> = T extends (infer U)[]
  ? readonly DeepReadonly<U>[]
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

export function deepFreeze<T>(obj: T): DeepReadonly<T> {
  if (obj !== null && typeof obj === 'object' && !Object.isFrozen(obj)) {
    for (const v of Object.values(obj as object)) deepFreeze(v);
    Object.freeze(obj);
  }
  return obj as DeepReadonly<T>;
}

/** 손 인식·판정 매개변수 (spec 4.6) */
export const HAND = deepFreeze({
  R_OPEN: 1.8,
  R_FIST: 0.9,
  FIST_ENTER: 0.7,
  FIST_MIN_FINGER: 0.45,
  OPEN_EXIT: 0.35,
  CONFIRM_FRAMES: 2,
  CONFIRM_MS: 50,
  ARM_OPEN_MS: 150,
  LOST_MS: 250,
  PREV_OPEN_LOOKBACK_MS: 400,
  HIT_MARGIN_MIN_PX: 24,
  HIT_MARGIN_RATIO: 0.035,
  TOUCH_HIT_MARGIN_PX: 8,
  PALM_TOO_FAR: 0.035,
  PALM_TOO_CLOSE: 0.2,
  PALM_IGNORE: 0.025,
  SECOND_HAND_RATIO: 0.6,
  TRACK_MATCH_RATIO: 0.25,
  MIN_HAND_DETECTION_CONF: 0.6,
  MIN_HAND_PRESENCE_CONF: 0.6,
  MIN_TRACKING_CONF: 0.5,
  NUM_HANDS: 2,
  MAX_TRACKS: 2,
  /** 커서 평활(spec 3.4): α = clamp(ALPHA_MIN + d / (ALPHA_DIST_RATIO · D), ALPHA_MIN, ALPHA_MAX) */
  SMOOTH_ALPHA_MIN: 0.25,
  SMOOTH_ALPHA_MAX: 0.85,
  SMOOTH_DIST_RATIO: 0.05,
} as const);

/** 한 문제 단계 (spec 5.3) */
export interface StageConfig {
  /** 이 단계가 시작하는 문제 번호(1부터) */
  fromQuestion: number;
  cards: number;
  fallMs: number;
  sameTopicDistractors: number;
}

/** 게임 규칙 (spec 5.2~5.7) */
export const GAME = deepFreeze({
  QUESTIONS_PER_GAME: 10,
  STAGES: [
    { fromQuestion: 1, cards: 3, fallMs: 9000, sameTopicDistractors: 0 },
    { fromQuestion: 4, cards: 4, fallMs: 7500, sameTopicDistractors: 1 },
    { fromQuestion: 7, cards: 4, fallMs: 6500, sameTopicDistractors: 2 },
  ] as readonly StageConfig[],
  START_DELAYS_MS: [0, 600, 1200, 1800] as readonly number[],
  CORRECT_NEXT_MS: 1500,
  MISS_SHOW_MS: 2000,
  WRONG_SHAKE_MS: 300,
  FADE_MS: 400,
  SCORE_FIRST_TRY: 100,
  SCORE_RETRY: 50,
  SPEED_BONUS_MAX: 50,
  COMBO_FROM: 3,
  COMBO_BONUS: 20,
  NO_HAND_PAUSE_MS: 3000,
  RESUME_OPEN_MS: 500,
  COUNTDOWN_MS: 3000,
  MAX_DT_MS: 100,
  RECENT_MAX: 20,
  DEFAULT_BAND: '3-4',
} as const);

/** 배치 (spec 5.4) */
export const LAYOUT = deepFreeze({
  BAND_RATIO: 0.16,
  BAND_MIN: 88,
  BAND_MAX: 150,
  LANE_LEFT: 0.06,
  LANE_RIGHT: 0.94,
  LANE_GAP_PX: 16,
  CARD_MAX_W_RATIO: 0.24,
  CARD_MAX_W_PX: 300,
  CARD_H_RATIO: 0.12,
  CARD_H_MIN: 64,
  CARD_H_MAX: 110,
  JITTER: 0.6,
  FONT_RATIO: 0.48,
  FONT_MIN_PX: 18,
  TEXT_PAD_PX: 24,
} as const);

/** 성능 (spec 10절) */
export const PERF = deepFreeze({
  CAMERA_WIDTH: 640,
  CAMERA_HEIGHT: 480,
  CAMERA_FPS: 30,
  SLOW_DETECT_MS: 40,
  FAST_DETECT_MS: 25,
  DETECT_AVG_WINDOW: 30,
  GPU_FAIL_CHECKS: 5,
  DPR_MAX: 2,
  PARTICLES_MAX: 120,
} as const);

/** 손 인식 파일 (spec 2.4) */
export const ASSETS = deepFreeze({
  MEDIAPIPE_VERSION: '1.2.3',
  WASM_DIR: 'mediapipe/1.2.3',
  MODEL_PATH: 'models/hand_landmarker.task',
  MODEL_SIZE: 7819105,
} as const);

/** localStorage 키 (spec 5.5, 5.6, 5.9) */
export const STORAGE_KEYS = deepFreeze({
  bestPrefix: 'catchword.best.',
  recent: 'catchword.recent',
  sound: 'catchword.sound',
} as const);
