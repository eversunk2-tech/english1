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

/** V5: 낱말 L(설명 토큰의 기본형 후보 하나)이 정답 word와 겹치는가 */
export function lemmaHitsWord(l: string, word: string): boolean {
  if (l === word) return true; // ①
  const ws = stemOf(word);
  if (l.length >= 3 && ws.length > 0 && l.startsWith(ws)) return true; // ②
  const ls = stemOf(l);
  if (ls.length >= 4 && word.startsWith(ls)) return true; // ③
  if (l.length >= 3 && word.includes(l)) return true; // ④
  return false;
}

/** V5: 설명(clue)에 word가 (같은 어근 포함) 들어 있는가 */
export function clueMentions(clue: string, word: string): boolean {
  for (const t of tokenize(clue)) {
    for (const l of lemmas(t)) {
      if (lemmaHitsWord(l, word)) return true;
    }
  }
  return false;
}
