// spec 5.9.1(v5 → v7): 영어 읽어 주기 목소리 고르기. 순수 함수 — 장난용 목소리(Albert 등)를 고르지 않는다.
// v7: 등급 A·N·G·B·C·D, Google(G)을 표준(B)보다 먼저(단 "Microsoft 목록" = 윈도는 B가 G보다 먼저 — U1),
// 목소리를 정하지 않고 말하는 lang-only를 없앰(빈 목록 → wait, 쓸 영어 목소리 없음 → skip), excludeRemote.
// UA·navigator는 보지 않는다(인자만).

export interface VoiceLike {
  name: string;
  lang: string;
  default: boolean;
  localService: boolean;
  voiceURI: string;
}

export type VoiceChoice<V extends VoiceLike = VoiceLike> =
  | { mode: 'voice'; voice: V; grade: Grade }
  | { mode: 'wait' }
  | { mode: 'skip' };

/** A 애플 고품질, N Microsoft Natural, G Google, B 알려진 표준, C 그 밖, D 맨 뒤(기계음·캐릭터) */
export type Grade = 'A' | 'N' | 'G' | 'B' | 'C' | 'D';

export interface ChooseOptions {
  /** true면 localService === false(인터넷 목소리)를 모두 뺀 뒤 고른다(spec 5.9.2 "인터넷 목소리 끔" 뒤) */
  excludeRemote?: boolean;
}

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

/** ③ B 등급: 알려진 성인 표준 목소리(애플·마이크로소프트). 구글은 v7부터 G */
export const STANDARD_VOICES: ReadonlySet<string> = new Set([
  'samantha', 'ava', 'allison', 'susan', 'tom', 'nathan', 'zoe', 'evan', 'joelle', 'nicky', 'noelle', 'daniel',
  'kate', 'serena', 'arthur', 'martha', 'karen', 'lee', 'moira', 'tessa', 'rishi', 'veena', 'aman', 'tara',
  'zira', 'david', 'mark', 'hazel', 'george',
]);

/** 마이크로소프트 표준 목소리 기본 이름(애플 목소리가 아님 — 고품질 안내 판단용) */
const MICROSOFT_BASES: ReadonlySet<string> = new Set(['zira', 'david', 'mark', 'hazel', 'george']);

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

/** spec 5.9.1 ③ 표: 위에서부터 먼저 맞는 것 */
export function voiceGrade(name: string): Grade {
  const { full, base } = voiceNames(name);
  if (LAST_RESORT_VOICES.has(base)) return 'D';
  if (full.includes('premium') || full.includes('enhanced')) return 'A';
  if (full.includes('natural')) return 'N';
  if (full.startsWith('google ')) return 'G';
  if (STANDARD_VOICES.has(base)) return 'B';
  return 'C';
}

export function isNovelty(name: string): boolean {
  return NOVELTY_VOICES.has(voiceNames(name).base);
}

/** "Microsoft 목록"(윈도): 목록 전체(언어 상관없이)에 full이 'microsoft '로 시작하는 목소리가 하나라도 있음 */
export function isMicrosoftList(voices: readonly VoiceLike[]): boolean {
  return voices.some((v) => voiceNames(v.name).full.startsWith('microsoft '));
}

function langRank(lang: string): number {
  if (lang === 'en-us') return 0;
  if (lang === 'en-gb') return 1;
  return 2;
}

/** ④-3 등급 순서: A → N → G → B → C (Microsoft 목록이면 A → N → B → G → C). D는 ④-1에서 이미 맨 뒤 */
const GRADE_RANK: Record<Grade, number> = { A: 0, N: 1, G: 2, B: 3, C: 4, D: 5 };
const GRADE_RANK_MICROSOFT: Record<Grade, number> = { A: 0, N: 1, B: 2, G: 3, C: 4, D: 5 };

/** spec 5.9.1 ④ 순서로 줄 세워 첫 번째를 고른다 */
export function chooseVoice<V extends VoiceLike>(voices: readonly V[], opts: ChooseOptions = {}): VoiceChoice<V> {
  if (!voices || voices.length === 0) return { mode: 'wait' };
  const rank = isMicrosoftList(voices) ? GRADE_RANK_MICROSOFT : GRADE_RANK;
  const usable = voices
    .map((v, i) => ({ v, i, lang: normLang(v.lang) }))
    .filter((x) => x.lang.startsWith('en'))
    .filter((x) => !isNovelty(x.v.name))
    .filter((x) => !(opts.excludeRemote && x.v.localService === false));
  if (usable.length === 0) return { mode: 'skip' };
  const ranked = usable
    .map((x) => ({ ...x, grade: voiceGrade(x.v.name) }))
    .sort((a, b) => {
      const d = Number(a.grade === 'D') - Number(b.grade === 'D'); // 1. D가 아닌 것 먼저
      if (d) return d;
      const l = langRank(a.lang) - langRank(b.lang); // 2. en-us → en-gb → 그 밖
      if (l) return l;
      const g = rank[a.grade] - rank[b.grade]; // 3. 등급
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

/** 디버그 표시: name (lang, local/remote, 등급) · voice | wait | skip */
export function describeChoice(c: VoiceChoice): string {
  if (c.mode !== 'voice') return c.mode;
  const v = c.voice;
  return `${v.name} (${v.lang}, ${v.localService ? 'local' : 'remote'}, ${c.grade}) · voice`;
}

/** 애플 목소리로 보이는가(voiceURI 'com.apple…' 또는 알려진 애플 이름 — 마이크로소프트·구글 제외) */
export function isAppleVoice(v: VoiceLike): boolean {
  const { full, base } = voiceNames(v.name);
  if (full.startsWith('microsoft ') || full.startsWith('google ')) return false;
  if ((v.voiceURI ?? '').toLowerCase().includes('com.apple')) return true;
  if (MICROSOFT_BASES.has(base)) return false;
  return STANDARD_VOICES.has(base) || LAST_RESORT_VOICES.has(base);
}

/** spec 5.9.1 디버그·5.9.3: 고른 목소리가 애플 기기 안 목소리인데 A 등급이 아니면(B·C·D이고 local) 고품질 안내 */
export function needsQualityHint(c: VoiceChoice): boolean {
  if (c.mode !== 'voice') return false;
  if (c.grade !== 'B' && c.grade !== 'C' && c.grade !== 'D') return false;
  return c.voice.localService === true && isAppleVoice(c.voice);
}
