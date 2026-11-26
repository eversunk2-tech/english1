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

export type Difficulty = 'easy' | 'normal' | 'hard' | 'veryhard';
export const DIFFICULTY_NAMES: readonly Difficulty[] = ['easy', 'normal', 'hard', 'veryhard'];

/** 난이도 하나의 규칙 (spec 5.3.2, 5.5) */
export interface DifficultyConfig {
  stages: readonly StageConfig[];
  /** 정답 점수 배율 */
  scoreMultiplier: number;
  /** 오답 한 번의 감점(배율을 곱하지 않는 고정 값) */
  wrongPenalty: number;
  /** v9: 한 판 10문제 중 "한 단계 위" 문항 수(spec 5.3.2·5.6.1 ①-2) */
  upCount: number;
  /** v9: 한 단계 위 문항이 나올 수 있는 첫 문제 번호(1부터, 그 번호~10번 중). upCount가 0이면 null */
  upFrom: number | null;
}

/** 게임 규칙 (spec 5.2~5.7) */
export const GAME = deepFreeze({
  QUESTIONS_PER_GAME: 10,
  /** 난이도별 단계 표 (spec 5.3.2, v9 값: Easy 그대로, Normal·Hard·Very Hard 단계마다 0.5초 빠르게 + 같은 주제 오답 한 장 더 + 한 단계 위 문항) */
  DIFFICULTIES: {
    easy: {
      stages: [
        { fromQuestion: 1, cards: 3, fallMs: 8500, sameTopicDistractors: 0 },
        { fromQuestion: 4, cards: 4, fallMs: 7000, sameTopicDistractors: 1 },
        { fromQuestion: 7, cards: 4, fallMs: 6000, sameTopicDistractors: 2 },
      ],
      scoreMultiplier: 1.0,
      wrongPenalty: 10,
      upCount: 0,
      upFrom: null,
    },
    normal: {
      stages: [
        { fromQuestion: 1, cards: 3, fallMs: 6500, sameTopicDistractors: 1 },
        { fromQuestion: 4, cards: 4, fallMs: 5500, sameTopicDistractors: 2 },
        { fromQuestion: 7, cards: 4, fallMs: 4500, sameTopicDistractors: 2 },
      ],
      scoreMultiplier: 1.2,
      wrongPenalty: 20,
      upCount: 2,
      upFrom: 7,
    },
    hard: {
      stages: [
        { fromQuestion: 1, cards: 4, fallMs: 5000, sameTopicDistractors: 2 },
        { fromQuestion: 4, cards: 4, fallMs: 4000, sameTopicDistractors: 2 },
        { fromQuestion: 7, cards: 4, fallMs: 3500, sameTopicDistractors: 3 },
      ],
      scoreMultiplier: 1.5,
      wrongPenalty: 30,
      upCount: 4,
      upFrom: 4,
    },
    /** v4: 학년과 상관없이 Very Hard 전용 풀(부록 D)에서만 정답·오답(spec 5.3.1·5.6). v9: 중학 6 + 심화 4(4~10번 중) */
    veryhard: {
      stages: [
        { fromQuestion: 1, cards: 4, fallMs: 4500, sameTopicDistractors: 3 },
        { fromQuestion: 4, cards: 4, fallMs: 3500, sameTopicDistractors: 3 },
        { fromQuestion: 7, cards: 4, fallMs: 3000, sameTopicDistractors: 3 },
      ],
      scoreMultiplier: 2.0,
      wrongPenalty: 40,
      upCount: 4,
      upFrom: 4,
    },
  } as Record<Difficulty, DifficultyConfig>,
  /** 공정성 바닥 (spec 5.3.3): T_need = BASE + n×WORD[d][band] + MOVE + GRAB, 바닥 = ceil(T_need×100/85/10)×10 */
  FALL_FLOOR: {
    BASE_MS: 300,
    /** 낱말당 읽기(v9): 난이도 × 문항 band — 나오지 않는 칸은 Hard와 같은 값(spec 5.3.3 표) */
    WORD_MS: {
      easy: { '3-4': 350, '5-6': 300, vh: 250 },
      normal: { '3-4': 350, '5-6': 300, vh: 250 },
      hard: { '3-4': 300, '5-6': 250, vh: 200 },
      veryhard: { '3-4': 300, '5-6': 250, vh: 200 },
    } as Record<Difficulty, Record<'3-4' | '5-6' | 'vh', number>>,
    MOVE_MS: 1000,
    GRAB_MS: 400,
    COMFORT_P: 0.85,
    /** v9 물리적 하한(spec 5.3.4): (COMFORT_P − P_VISIBLE) × 떨어지는 시간 ≥ 1850ms (알아채기 0.3 + 손 옮기기 1.0 + 쥐기·인식 0.55) */
    PHYS_MIN_MS: 1850,
    /** 카드가 띠 아래로 나와 잡히기 시작하는 진행도(테스트용, spec 5.3.3) */
    P_VISIBLE: 0.06,
  },
  DEFAULT_DIFFICULTY: 'normal' as Difficulty,
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
  /** v8: 섞은 카드 더미 — 바퀴 경계에서 뒤로 미루는 최근 정답 수(3판, spec 5.6.1 ②③) */
  BAG_COOLDOWN: 30,
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

/** 영어 읽어 주기 (spec 5.9.2, v7) */
export const SPEECH = deepFreeze({
  RATE: 0.9,
  PITCH: 1,
  /** 목록이 비어 있을 때(wait) 기다리는 가장 긴 시간 */
  VOICE_WAIT_MS: 1000,
  /** 인터넷 목소리가 이 안에 onstart를 내지 못하면 실패 → 기기 안 목소리로 다시 */
  REMOTE_START_TIMEOUT_MS: 1500,
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
  /** v4: Very Hard 최고 점수(학년과 상관없이 한 칸) — v9부터 읽지도 쓰지도 않는다(옛 기록) */
  bestVeryHard: 'catchword.best.veryhard',
  /** v9: Normal·Hard·Very Hard 최고 점수 새 칸 catchword.best.v9.<band>.<normal|hard>, catchword.best.v9.veryhard (spec 5.5) */
  bestV9Prefix: 'catchword.best.v9.',
  /** v8: 섞은 카드 더미 catchword.bag.<3-4|5-6|vh-mid|vh-adv> (spec 5.6.1 ②, v9) */
  bagPrefix: 'catchword.bag.',
  /** v8의 Very Hard 더미 키 — v9에서 vh-mid·vh-adv로 나눠 옮기고 지운다(spec 5.6.1 ⑦-2). 옮기기에만 쓴다. */
  legacyBagVeryHard: 'catchword.bag.veryhard',
  /** v4 최근 정답 키 — v8에서 더미로 한 번 옮기고 지운다(spec 5.6.1 ⑦). 옮기기에만 쓴다. */
  legacyRecent: 'catchword.recent',
  legacyRecentVeryHard: 'catchword.recent.veryhard',
  sound: 'catchword.sound',
  /** 마지막으로 고른 난이도 easy|normal|hard (spec 5.5 v2) */
  difficulty: 'catchword.difficulty',
} as const);
