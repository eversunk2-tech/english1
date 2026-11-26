// 화면 문구 전부(spec 6.1). 안내·버튼·오류는 한국어, 게임 이름·설명·단어·짧은 반응은 영어.
import type { Difficulty } from '../config.ts';
import type { BandChoice } from '../game/types.ts';

export type ErrorKind =
  | 'insecure'
  | 'denied'
  | 'notfound'
  | 'busy'
  | 'download'
  | 'init'
  | 'other';

/** spec 8.2 오류 문구 */
export const ERROR_MESSAGES: Record<ErrorKind, string> = {
  insecure: '이 주소에서는 카메라를 쓸 수 없어요. https:// 로 시작하는 주소로 열어 주세요.',
  denied:
    "카메라 사용이 허락되지 않았어요. 주소창 옆(또는 설정 › Safari › 카메라)에서 카메라를 '허용'으로 바꾼 뒤 [다시 시도]를 눌러 주세요.",
  notfound: '카메라를 찾지 못했어요. 카메라가 있는 태블릿에서 열어 주세요.',
  busy: '다른 앱이 카메라를 쓰고 있어요. 다른 앱을 닫고 [다시 시도]를 눌러 주세요.',
  download: '손 인식 파일을 받지 못했어요. 인터넷 연결을 확인하고 [다시 시도]를 눌러 주세요.',
  init: '이 기기에서는 손 인식을 시작하지 못했어요. 터치로 할 수 있어요.',
  other: '카메라를 켜지 못했어요. [다시 시도]를 누르거나 터치로 해 보세요.',
};

/** spec 9절 개인정보 안내 */
export const PRIVACY_NOTICE =
  '카메라 영상은 이 태블릿 안에서 손 위치를 찾는 데만 쓰여요. 저장하거나 다른 곳으로 보내지 않아요.';

/** spec 9절 v7: 개인정보 안내 둘째 줄(영어 읽어 주기와 인터넷 목소리) */
export const PRIVACY_VOICE_NOTICE = '영어 읽어 주기는 인터넷 목소리(Google 등)를 쓸 수 있어요. 이때 영어 문제 문장만 보내져요.';

/** spec 5.9.1 디버그·5.9.3 ①: ?debug=1 화면에서 애플 기기 안 보통 목소리일 때만 보이는 한 줄 */
export const VOICE_QUALITY_HINT = '더 자연스러운 목소리: 고품질 영어 목소리를 내려받으세요';

export const S = {
  // 시작 화면 (spec 6.2)
  title: 'Catch the Word!',
  subtitle: '영어 설명을 읽고, 맞는 단어를 손으로 잡아요!',
  bandLabel: '학년',
  band34: '3~4학년',
  band56: '5~6학년',
  bandAll: '모두',
  soundLabel: '소리',
  soundOn: '켬',
  soundOff: '끔',
  startCamera: '카메라로 시작',
  startTouch: '터치로 하기',
  standHint: '태블릿을 가슴 높이에 세우고, 한 걸음 반(1~1.5m) 떨어져 서요',
  privacy: PRIVACY_NOTICE,
  privacyVoice: PRIVACY_VOICE_NOTICE,
  cameraOn: '카메라 켜짐',

  // 준비 화면
  loadingCamera: '카메라를 켜는 중…',
  loadingModel: (pct: number): string => `손 인식 준비 중… ${pct}%`,
  loadingFirstTime: '(처음 한 번은 조금 걸려요)',

  // 손 확인 화면 (spec 5.1)
  handcheckShowPalm: '손바닥을 펴서 보여 주세요',
  handcheckGrab: '이제 START 위에서 주먹을 꽉 쥐어 보세요',
  handcheckTouch: 'START 카드를 눌러 시작해요',
  handNotVisible: '손이 보이지 않아요',
  comeCloser: '조금 더 가까이 와 주세요',
  stepBack: '조금 뒤로 가 주세요',
  startCard: 'START',

  // 놀이 화면
  score: 'Score',
  pause: '일시정지',
  questionNo: (n: number, total: number): string => `${n} / ${total}`,
  great: 'Great!',
  goodJob: 'Good job!',
  tryAgain: 'Try again!',
  answerIs: 'The answer is',
  combo: (n: number): string => `Combo ×${n}!`,

  // 일시정지 (spec 5.7)
  pausedTitle: '잠깐 멈췄어요',
  pausedNoHand: '손을 화면에 보여 주세요',
  pausedNoHandResume: '손바닥을 펴서 보여 주면 이어서 해요',
  resume: '계속하기',
  home: '처음으로',

  // 결과 (spec 5.8)
  resultTitle: '결과',
  resultCorrect: (n: number, total: number): string => `${n} / ${total}`,
  resultCorrectLabel: '맞힌 문제',
  resultBest: '최고 점수',
  newRecord: 'New record!',
  reviewWord: '단어',
  reviewKo: '뜻',
  reviewClue: '설명',
  reviewMark: '결과',
  playAgain: '다시 하기',
  restArm: '팔을 잠깐 쉬어요',
  playAgainCard: 'AGAIN',

  // 오류 (spec 8.2)
  retry: '다시 시도',
  errorTitle: '시작하지 못했어요',
  errorDetail: (name: string): string => `오류: ${name}`,

  // 디버그
  debugRecord: '녹화',
  debugStop: '저장',
} as const;

/** 난이도 이름(spec 6.2 v2): 큰 영어 + 작은 한국어 */
export const DIFFICULTY_LABELS: Record<Difficulty, { en: string; ko: string }> = {
  easy: { en: 'Easy', ko: '쉬움' },
  normal: { en: 'Normal', ko: '보통' },
  hard: { en: 'Hard', ko: '어려움' },
  veryhard: { en: 'Very Hard', ko: '매우 어려움' },
};

/** 한 단계 위 단어의 이름(spec 6.2 v9 `{위}`): 학년군 3~4이면 `5~6학년`, 5~6·모두이면 `중학` */
export function upLevelName(band: BandChoice): string {
  return band === '3-4' ? '5~6학년' : '중학';
}

/** 고른 난이도·학년군의 한 줄 설명(spec 6.2 v9 — 학년군을 바꾸면 바로 바뀐다) */
export function difficultyDesc(d: Difficulty, band: BandChoice): string {
  switch (d) {
    case 'easy':
      return '천천히 떨어져요. 처음 하는 친구에게 좋아요.';
    case 'normal':
      return `조금 빨라요. ${upLevelName(band)} 단어가 2개 섞여 나와요.`;
    case 'hard':
      return `빠르고 헷갈려요. ${upLevelName(band)} 단어가 4개 나와요!`;
    case 'veryhard':
      return '중학·심화 단어가 아주 빠르게! 최고의 도전!';
  }
}

/** 결과 화면 도전 권유(spec 5.8 v2): 첫 시도 정답 8개 이상일 때 */
export const CHALLENGE_LINES: Record<Difficulty, string> = {
  easy: '다음엔 Normal에 도전해 볼까요?',
  normal: '다음엔 Hard에 도전해 볼까요?',
  hard: '다음엔 Very Hard에 도전해 볼까요?',
  veryhard: 'Very Hard도 거뜬해요! 최고 점수에 도전해 봐요.',
};

/** Very Hard를 고르면 흐려진 학년 줄 아래 안내(spec 6.2 v4 → v9) */
export const VERYHARD_BAND_NOTE = 'Very Hard는 학년과 상관없이 중학·심화 단어로 나와요';

export const BAND_LABELS: Record<BandChoice, string> = {
  '3-4': '3~4학년',
  '5-6': '5~6학년',
  all: '모두',
};

/** 점수 부호 표시: +142, 0, −20 (빼기는 U+2212) */
export function signed(n: number): string {
  if (n > 0) return `+${n}`;
  if (n < 0) return `\u2212${-n}`;
  return '0';
}

const V2_WRONG_LABEL = '오답:';

export const V2 = {
  difficultyLabel: '난이도',
  /** 감점 숫자(영어 쪽 짧은 반응, spec 6.1): −20 */
  penalty: (n: number): string => `\u2212${n}`,
  gain: (n: number): string => `+${n}`,
  /** 결과 화면 머리: "5~6학년 · Hard", Very Hard는 "Very Hard · 중학·심화 단어"(spec 5.8 v4 → v9) */
  resultCombo: (band: BandChoice, d: Difficulty): string =>
    d === 'veryhard' ? `${DIFFICULTY_LABELS.veryhard.en} · 중학·심화 단어` : `${BAND_LABELS[band]} · ${DIFFICULTY_LABELS[d].en}`,
  reviewScore: '점수',
  /** 표 위 요약 줄: "오답 3번 (−60)", 오답이 없으면 "오답 0번" */
  wrongSummary: (count: number, deducted: number): string =>
    count > 0 && deducted > 0 ? `오답 ${count}번 (\u2212${deducted})` : `오답 ${count}번`,
  /** 복습 표 문제 칸 아래 작은 빨간 글씨: "오답 1번 −20" */
  wrongRow: (count: number, deducted: number): string =>
    deducted > 0 ? `오답 ${count}번 \u2212${deducted}` : `오답 ${count}번`,
  wrongWords: (words: readonly string[]): string => `${V2_WRONG_LABEL} ${words.join(', ')}`,
  /** "오답:" 머리(한국어) — 단어 부분만 lang="en"으로 따로 감싼다(review V2-R1) */
  wrongWordsLabel: V2_WRONG_LABEL,
  /** ?debug=1 결과 화면: 문제별 잡은 시각·설명 낱말 수·떨어지는 시간 */
  debugRow: (grabSec: number | null, words: number, fallSec: number): string =>
    `${grabSec === null ? '놓침' : `잡은 시각 ${grabSec.toFixed(1)}초`} · ${words}낱말 · 떨어지는 시간 ${fallSec.toFixed(2)}초`,
} as const;

/** 복습 표 표시 (spec 5.8): ○ 첫 시도 정답, △ 오답 뒤 정답, × 놓침 */
export const MARKS = { first: '○', retry: '△', miss: '×' } as const;
