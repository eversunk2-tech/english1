// spec 7.4의 토큰 규칙·기본형 후보 L(t)·"정답 단어가 설명에 들어감"(V5) 규칙. 순수.
// validate.ts(기계 검사)와 game/questions.ts(오답 고르기, spec 5.6)가 함께 쓴다.

/** 소문자로 바꾸고 [a-z]+('[a-z]+)?로 자른 뒤 끝의 's를 뗀다 */
export function tokenize(text: string): string[] {
  const m = text.toLowerCase().match(/[a-z]+('[a-z]+)?/g) ?? [];
  return m.map((t) => (t.endsWith("'s") ? t.slice(0, -2) : t));
}

const IRREGULAR: Record<string, string> = {
  me: 'i',
  my: 'i',
  mine: 'i',
  us: 'we',
  our: 'we',
  your: 'you',
  his: 'he',
  him: 'he',
  her: 'she',
  its: 'it',
  them: 'they',
  their: 'they',
  these: 'this',
  those: 'that',
  is: 'be',
  are: 'be',
  am: 'be',
  was: 'be',
  were: 'be',
  been: 'be',
  has: 'have',
  had: 'have',
  does: 'do',
  did: 'do',
  goes: 'go',
  went: 'go',
  made: 'make',
  ate: 'eat',
  children: 'child',
  women: 'woman',
  men: 'man',
  mice: 'mouse',
  feet: 'foot',
  teeth: 'tooth',
  an: 'a',
  student: 'study',
  students: 'study',
};

/** [떼는 끝, 붙이는 끝] */
const SUFFIXES: readonly (readonly [string, string])[] = [
  ['ies', 'y'],
  ['es', ''],
  ['s', ''],
  ['ied', 'y'],
  ['ed', ''],
  ['ed', 'e'],
  ['d', ''],
  ['ing', ''],
  ['ing', 'e'],
  ['iest', 'y'],
  ['est', ''],
  ['est', 'e'],
  ['ier', 'y'],
  ['er', ''],
  ['er', 'e'],
  ['ly', ''],
  ['y', ''],
  ['ful', ''],
  ['iful', 'y'],
];

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);

function oneStep(t: string): Set<string> {
  const out = new Set<string>();
  const irr = IRREGULAR[t];
  if (irr) out.add(irr);
  for (const [suf, rep] of SUFFIXES) {
    if (!t.endsWith(suf) || t.length <= suf.length) continue;
    const stem = t.slice(0, -suf.length);
    const base = stem + rep;
    if (base.length >= 2) out.add(base);
    // 끝 자음이 겹치면 하나 뗀 것도 후보(running → runn → run)
    if (rep === '' && stem.length >= 3) {
      const a = stem[stem.length - 1] as string;
      const b = stem[stem.length - 2] as string;
      if (a === b && !VOWELS.has(a)) out.add(stem.slice(0, -1));
    }
  }
  return out;
}

/** 기본형 후보 L(t): t 자신 + 불규칙 + 접미사 떼기, 그 결과에 한 번 더 적용 */
export function lemmas(t: string): Set<string> {
  const out = new Set<string>([t]);
  const first = oneStep(t);
  for (const f of first) {
    out.add(f);
    for (const g of oneStep(f)) out.add(g);
  }
  return out;
}

/** 어간: 끝의 e 또는 y를 뗀 것 */
export function stemOf(word: string): string {
  return word.endsWith('e') || word.endsWith('y') ? word.slice(0, -1) : word;
}

/**
 * V5: 낱말 L(설명 토큰의 기본형 후보 하나)이 정답 word와 겹치는가.
 * @param containsOk ④(정답 안에 들어 있음)를 적용할지. 주지 않으면 늘 적용(오답 고르기용 넓은 규칙).
 */
export function lemmaHitsWord(l: string, word: string, containsOk: boolean = true): boolean {
  if (l === word) return true; // ①
  const ws = stemOf(word);
  if (l.length >= 3 && ws.length > 0 && l.startsWith(ws)) return true; // ②
  const ls = stemOf(l);
  if (ls.length >= 4 && word.startsWith(ls)) return true; // ③
  if (containsOk && l.length >= 3 && word.includes(l)) return true; // ④
  return false;
}

/**
 * 설명(clue)에 word가 (같은 어근 포함) 들어 있는가.
 * - isRealWord를 주지 않으면(오답 고르기, spec 5.6) 넓은 규칙 그대로: ④를 모든 기본형 후보에 적용.
 * - isRealWord를 주면(V5 기계 검사, spec 7.4 v3b 보완) ④는 그 후보가 토큰 자신이거나 실제 낱말일 때만 적용 —
 *   "very" → "ver" ⊂ fever 같은 가짜 조각으로 잘못 걸리지 않게 한다. ①②③은 그대로.
 */
export function clueMentions(clue: string, word: string, isRealWord?: (l: string) => boolean): boolean {
  for (const t of tokenize(clue)) {
    for (const l of lemmas(t)) {
      const containsOk = isRealWord === undefined || l === t || isRealWord(l);
      if (lemmaHitsWord(l, word, containsOk)) return true;
    }
  }
  return false;
}

/** V5b(spec 7.4 v4)의 파생 접사 */
export const DERIVATION_SUFFIXES: readonly string[] = ['ist', 'er', 'or', 'ian', 'ous', 'ful', 'y', 'ness', 'ly'];

/**
 * V5b: 정답의 어근 후보 — ① base를 '+'로 나눈 조각 ② 정답 끝에서 파생 접사 하나를 뗀 기본형
 * (뗀 결과 3자 이상; 그대로·끝에 e·끝 i→y·끝 t→ce 가운데 초등 목록에 있는 것).
 */
export function derivedRoots(
  word: string,
  base: string | null,
  elementary: ReadonlySet<string>,
  notDerived: ReadonlySet<string> = new Set(),
): string[] {
  const out = new Set<string>();
  if (base) for (const p of base.split('+')) if (p.trim()) out.add(p.trim().toLowerCase());
  // v4b: 접사를 떼서 우연히 초등 낱말이 되는 가짜 어근(busy→bus, shoulder→should)은 ②를 건너뛰고 ①(base)만 본다
  if (notDerived.has(word)) {
    out.delete(word);
    return [...out];
  }
  for (const suf of DERIVATION_SUFFIXES) {
    if (!word.endsWith(suf)) continue;
    const stem = word.slice(0, -suf.length);
    if (stem.length < 3) continue;
    const cands = [stem, `${stem}e`];
    if (stem.endsWith('i')) cands.push(`${stem.slice(0, -1)}y`);
    if (stem.endsWith('t')) cands.push(`${stem.slice(0, -1)}ce`);
    for (const c of cands) if (elementary.has(c)) out.add(c);
  }
  out.delete(word);
  return [...out];
}

/** V5c에서 빼는 기능어 21개(spec 7.4) */
export const V5C_FUNCTION_WORDS: ReadonlySet<string> = new Set([
  'this', 'that', 'these', 'those', 'then', 'than', 'them', 'they', 'their', 'there',
  'what', 'when', 'where', 'which', 'with', 'will', 'your', 'have', 'from', 'some', 'very',
]);

/**
 * V5c(spec 7.4 v4b, 같은 날 다듬은 문장, 검사 전용): 같은 뿌리의 다른 낱말이 설명에 들어 있는가.
 * 설명 토큰 t(기본형으로 바꾸지 않은 그대로)가 ① 정답과 길이가 같고 4자 이상 ② 마지막 한 글자만 다르고
 * ③ 초등 목록(부록 B)의 낱말이 아니고 ④ 기능어 목록에 없으면 걸린다(예: poem ↔ poet).
 * 걸린 토큰을 돌려준다. 오답 고르기에는 쓰지 않는다.
 */
export function sameRootTokens(clue: string, word: string, elementary: ReadonlySet<string>): string[] {
  const out: string[] = [];
  if (word.length < 4) return out;
  for (const t of tokenize(clue)) {
    if (t.length !== word.length || t === word) continue;
    if (t.slice(0, -1) !== word.slice(0, -1)) continue;
    if (elementary.has(t) || V5C_FUNCTION_WORDS.has(t)) continue;
    out.push(t);
  }
  return out;
}
