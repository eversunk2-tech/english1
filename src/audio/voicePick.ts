// spec 5.9.1(v5): 영어 읽어 주기 목소리 고르기. 순수 함수 — 장난용 목소리(Albert 등)를 고르지 않는다.

export interface VoiceLike {
  name: string;
  lang: string;
  default: boolean;
  localService: boolean;
  voiceURI: string;
}

export type VoiceChoice<V extends VoiceLike = VoiceLike> =
  | { mode: 'voice'; voice: V; grade: Grade }
  | { mode: 'lang-only' }
  | { mode: 'skip' };

/** A 고품질, B 알려진 표준, C 그 밖, D 맨 뒤(기계음·캐릭터) */
export type Grade = 'A' | 'B' | 'C' | 'D';

/** ① 장난용(애플 novelty) — 어느 경우에도 고르지 않음 */
export const NOVELTY_VOICES: ReadonlySet<string> = new Set([
  'albert', 'bad news', 'bahh', 'bells', 'boing', 'bubbles', 'cellos', 'good news', 'jester', 'organ',
  'superstar', 'trinoids', 'whisper', 'wobble', 'zarvox',
  // 옛 이름
  'deranged', 'hysterical', 'pipe organ', 'princess',
]);

/** ② 맨 뒤(다른 목소리가 없을 때만): Eloquence 계열 + 옛 MacinTalk */
export const LAST_RESORT_VOICES: ReadonlySet<string> = new Set([
  'eddy', 'flo', 'grandma', 'grandpa', 'reed', 'rocko', 'sandy', 'shelley',
  'fred', 'junior', 'kathy', 'ralph',
]);

/** ③ B 등급: 알려진 성인 표준 목소리(애플·마이크로소프트). 구글은 full이 'google '으로 시작 */
export const STANDARD_VOICES: ReadonlySet<string> = new Set([
  'samantha', 'ava', 'allison', 'susan', 'tom', 'nathan', 'zoe', 'evan', 'joelle', 'nicky', 'noelle', 'daniel',
  'kate', 'serena', 'arthur', 'martha', 'karen', 'lee', 'moira', 'tessa', 'rishi', 'veena', 'aman', 'tara',
  'zira', 'david', 'mark', 'hazel', 'george',
]);

/** lang 정리: '_' → '-', 소문자 */
export function normLang(lang: string): string {
  return (lang ?? '').replace(/_/g, '-').toLowerCase();
}

/** 이름 정리: full = 소문자 전체, base = ' - '부터·첫 ' ('부터 끝까지 지우고 앞의 'microsoft '·'apple '을 뗀 것 */
export function voiceNames(name: string): { full: string; base: string } {
  const full = (name ?? '').toLowerCase().trim();
  let base = full;
  const dash = base.indexOf(' - ');
  if (dash >= 0) base = base.slice(0, dash);
  const paren = base.indexOf(' (');
  if (paren >= 0) base = base.slice(0, paren);
  base = base.trim();
  for (const p of ['microsoft ', 'apple ']) if (base.startsWith(p)) base = base.slice(p.length);
  return { full, base: base.trim() };
}

export function voiceGrade(name: string): Grade {
  const { full, base } = voiceNames(name);
  if (LAST_RESORT_VOICES.has(base)) return 'D';
  if (full.includes('premium') || full.includes('enhanced') || full.includes('natural')) return 'A';
  if (STANDARD_VOICES.has(base) || full.startsWith('google ')) return 'B';
  return 'C';
}

export function isNovelty(name: string): boolean {
  return NOVELTY_VOICES.has(voiceNames(name).base);
}

function langRank(lang: string): number {
  if (lang === 'en-us') return 0;
  if (lang === 'en-gb') return 1;
  return 2;
}

const GRADE_RANK: Record<Grade, number> = { A: 0, B: 1, C: 2, D: 3 };

/** spec 5.9.1 ④ 순서로 줄 세워 첫 번째를 고른다 */
export function chooseVoice<V extends VoiceLike>(voices: readonly V[]): VoiceChoice<V> {
  if (!voices || voices.length === 0) return { mode: 'lang-only' };
  const english = voices
    .map((v, i) => ({ v, i, lang: normLang(v.lang) }))
    .filter((x) => x.lang.startsWith('en'));
  if (english.length === 0) return { mode: 'skip' };
  const usable = english.filter((x) => !isNovelty(x.v.name));
  if (usable.length === 0) return { mode: 'lang-only' };
  const ranked = usable
    .map((x) => ({ ...x, grade: voiceGrade(x.v.name) }))
    .sort((a, b) => {
      const d = Number(a.grade === 'D') - Number(b.grade === 'D'); // 1. D가 아닌 것 먼저
      if (d) return d;
      const l = langRank(a.lang) - langRank(b.lang); // 2. en-us → en-gb → 그 밖
      if (l) return l;
      const g = GRADE_RANK[a.grade] - GRADE_RANK[b.grade]; // 3. A → B → C
      if (g) return g;
      const df = Number(!!b.v.default) - Number(!!a.v.default); // 4. default
      if (df) return df;
      const lo = Number(!!b.v.localService) - Number(!!a.v.localService); // 5. localService
      if (lo) return lo;
      return a.i - b.i; // 6. 목록 순서
    });
  const top = ranked[0]!;
  return { mode: 'voice', voice: top.v, grade: top.grade };
}

/** 디버그 표시: name (lang, local/remote, 등급) · mode */
export function describeChoice(c: VoiceChoice): string {
  if (c.mode !== 'voice') return c.mode;
  const v = c.voice;
  return `${v.name} (${v.lang}, ${v.localService ? 'local' : 'remote'}, ${c.grade}) · voice`;
}
