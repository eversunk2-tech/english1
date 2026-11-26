// 목소리 목록 예(spec 12.1 voicePick ①·⑥~⑧, 12.2 E9). 테스트 전용.
export interface FakeVoice {
  name: string;
  lang: string;
  default: boolean;
  localService: boolean;
  voiceURI: string;
}

export const v = (name: string, lang: string, o: Partial<FakeVoice> = {}): FakeVoice => ({
  name,
  lang,
  default: false,
  localService: true,
  voiceURI: `x-${name}`,
  ...o,
});

/** 이 맥(macOS 27.2.1) en-US 28개 — spec 12.1 ① */
export const MAC_EN_US_NAMES = [
  'Albert', 'Bad News', 'Bahh', 'Bells', 'Boing', 'Bubbles', 'Cellos', 'Eddy', 'Flo', 'Fred', 'Good News', 'Grandma',
  'Grandpa', 'Jester', 'Junior', 'Kathy', 'Organ', 'Ralph', 'Reed', 'Rocko', 'Samantha', 'Sandy', 'Shelley',
  'Superstar', 'Trinoids', 'Whisper', 'Wobble', 'Zarvox',
];

/** ① 이 맥 목록 + 다른 언어 섞음(Albert가 맨 앞 — 고치기 전 코드는 첫 en-US인 Albert를 골랐다) */
export function macVoices(): FakeVoice[] {
  return [
    v('Yuna', 'ko-KR', { default: true }),
    ...MAC_EN_US_NAMES.map((n) => v(n, 'en-US')),
    v('Kyoko', 'ja-JP'),
    v('Thomas', 'fr-FR'),
  ];
}
