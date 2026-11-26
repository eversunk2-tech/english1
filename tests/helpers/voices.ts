// 목소리 목록 예(spec 12.1 voicePick ①·⑦·⑧·⑫, 12.2 E9 — v7). 테스트 전용.
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

/** 인터넷 목소리(localService false) */
export const remote = (name: string, lang: string, o: Partial<FakeVoice> = {}): FakeVoice => v(name, lang, { localService: false, ...o });

/**
 * spec 12.1 voicePick ⑫ — 이 맥 Chrome 목록(v7): `유나` ko-KR default local + ①의 en-US 28개 + `Daniel` en-GB local
 * + remote: Google Deutsch de-DE, Google US English en-US, Google UK English Female·Male en-GB, Google 한국의 ko-KR, Google 日本語 ja-JP
 */
export function macChromeVoices(): FakeVoice[] {
  return [
    v('유나', 'ko-KR', { default: true }),
    ...MAC_EN_US_NAMES.map((n) => v(n, 'en-US')),
    v('Daniel', 'en-GB'),
    remote('Google Deutsch', 'de-DE'),
    remote('Google US English', 'en-US'),
    remote('Google UK English Female', 'en-GB'),
    remote('Google UK English Male', 'en-GB'),
    remote('Google 한국의', 'ko-KR'),
    remote('Google 日本語', 'ja-JP'),
  ];
}

/** spec 12.1 voicePick ⑦ — 윈도 크롬 예: Microsoft David·Zira·Mark local, Google US English·Google UK English Female remote */
export function windowsChromeVoices(): FakeVoice[] {
  return [
    v('Microsoft David - English (United States)', 'en-US'),
    v('Microsoft Zira - English (United States)', 'en-US'),
    v('Microsoft Mark - English (United States)', 'en-US'),
    remote('Google US English', 'en-US'),
    remote('Google UK English Female', 'en-GB'),
  ];
}

/** spec 12.1 voicePick ⑧ — 엣지 예: Microsoft David·Zira·Mark local + Aria·Jenny·Sonia Online (Natural) remote, Google 없음 */
export function edgeVoices(): FakeVoice[] {
  return [
    v('Microsoft David - English (United States)', 'en-US'),
    v('Microsoft Zira - English (United States)', 'en-US'),
    v('Microsoft Mark - English (United States)', 'en-US'),
    remote('Microsoft Aria Online (Natural) - English (United States)', 'en-US'),
    remote('Microsoft Jenny Online (Natural) - English (United States)', 'en-US'),
    remote('Microsoft Sonia Online (Natural) - English (United Kingdom)', 'en-GB'),
  ];
}
