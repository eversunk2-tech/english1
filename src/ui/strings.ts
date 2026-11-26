// 화면 문구 전부(spec 6.1). 안내·버튼·오류는 한국어, 게임 이름·설명·단어·짧은 반응은 영어.

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

/** 복습 표 표시 (spec 5.8): ○ 첫 시도 정답, △ 오답 뒤 정답, × 놓침 */
export const MARKS = { first: '○', retry: '△', miss: '×' } as const;
