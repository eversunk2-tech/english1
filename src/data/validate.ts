// spec 7.4: 문항 기계 검사 V1~V9. 순수 — 단위 테스트와 scripts/check-data.mjs가 함께 쓴다.
import { buildPlans, pickDistractors, avoidIndex, distractorPool, stageFor } from '../game/questions.ts';
import { mulberry32 } from '../game/rng.ts';
import { TOPICS, type BandChoice, type Question, type QuestionsFile } from '../game/types.ts';
import { clueMentions, lemmas, tokenize } from './words.ts';

export interface ClueExtra {
  secondary: string[];
  interjection: string[];
  proper: string[];
}

export interface ValidationReport {
  errors: string[];
  stats: {
    total: number;
    band34: number;
    band56: number;
    tokens: number;
    /** ⓐ·ⓑ·감탄사·요일 비율 */
    coreRatio: number;
    secondaryTokens: number;
  };
}

const TOPIC_SET = new Set<string>(TOPICS);

export function makeVocabSet(lines: readonly string[]): Set<string> {
  return new Set(lines.map((l) => l.trim().toLowerCase()).filter((l) => l.length > 0));
}

function inVocab(t: string, vocab: Set<string>): boolean {
  for (const l of lemmas(t)) if (vocab.has(l)) return true;
  return false;
}

/** ⓑ 초등 목록 두 낱말의 합성(각 조각 2자 이상) */
function isCompound(t: string, vocab: Set<string>): boolean {
  for (const l of lemmas(t)) {
    for (let i = 2; i <= l.length - 2; i++) {
      if (vocab.has(l.slice(0, i)) && vocab.has(l.slice(i))) return true;
    }
  }
  return false;
}

function inList(t: string, list: readonly string[]): boolean {
  for (const l of lemmas(t)) if (list.includes(l)) return true;
  return false;
}

export function validateQuestions(
  data: QuestionsFile,
  vocabLines: readonly string[],
  extra: ClueExtra,
): ValidationReport {
  const errors: string[] = [];
  const vocab = makeVocabSet(vocabLines);
  const qs = data.questions;
  const ids = new Set<string>();
  const words = new Set<string>();
  let tokens = 0;
  let core = 0;
  let secondaryTokens = 0;

  for (const q of qs) {
    const at = `[${q.id}]`;
    // V1
    if (!/^[a-z]+-\d{2}$/.test(q.id)) errors.push(`V1 ${at} id 형식이 틀림`);
    if (ids.has(q.id)) errors.push(`V1 ${at} id 중복`);
    ids.add(q.id);
    if (q.id.split('-')[0] !== q.topic) errors.push(`V1 ${at} id 앞부분과 topic(${q.topic})이 다름`);
    // V2
    if (!/^[a-z]{2,10}$/.test(q.word)) errors.push(`V2 ${at} word 형식(${q.word})`);
    if (words.has(q.word)) errors.push(`V2 ${at} word 중복(${q.word})`);
    words.add(q.word);
    // V3
    if (q.band !== '3-4' && q.band !== '5-6') errors.push(`V3 ${at} band(${String(q.band)})`);
    if (!TOPIC_SET.has(q.topic)) errors.push(`V3 ${at} topic(${q.topic})`);
    if (typeof q.ko !== 'string' || !/[가-힣]/.test(q.ko)) errors.push(`V3 ${at} ko에 한글이 없음`);
    // V4
    const clue = q.clue ?? '';
    if (!/^[A-Z]/.test(clue)) errors.push(`V4 ${at} 설명이 대문자로 시작하지 않음`);
    if (!clue.endsWith('.')) errors.push(`V4 ${at} 설명이 .로 끝나지 않음`);
    if (!/^[A-Za-z ,.'?!]*$/.test(clue)) errors.push(`V4 ${at} 설명에 쓸 수 없는 글자`);
    const toks = tokenize(clue);
    const maxWords = q.band === '3-4' ? 8 : 10;
    if (toks.length > maxWords) errors.push(`V4 ${at} 설명 낱말 수 ${toks.length} > ${maxWords}`);
    // V5
    if (clueMentions(clue, q.word)) errors.push(`V5 ${at} 설명에 정답(${q.word}) 또는 같은 어근이 들어 있음`);
    // V6
    let secInClue = 0;
    for (const t of toks) {
      tokens += 1;
      if (inVocab(t, vocab) || isCompound(t, vocab)) {
        core += 1;
        continue;
      }
      if (inList(t, extra.interjection) || inList(t, extra.proper)) {
        core += 1;
        continue;
      }
      if (inList(t, extra.secondary)) {
        secInClue += 1;
        secondaryTokens += 1;
        continue;
      }
      errors.push(`V6 ${at} 설명 낱말 "${t}"이 초등 목록·허용 목록에 없음`);
    }
    if (secInClue > 2) errors.push(`V6 ${at} secondary 낱말 ${secInClue}개(>2)`);
    // V7
    const wordOk =
      inVocab(q.word, vocab) ||
      (q.base !== null && q.base.split('+').every((p) => vocab.has(p.trim().toLowerCase())));
    if (!wordOk) errors.push(`V7 ${at} 정답(${q.word})이 초등 목록에 없고 base로도 설명되지 않음`);
  }

  // V8
  for (const q of qs) {
    for (const a of q.avoid) {
      if (!words.has(a)) errors.push(`V8 [${q.id}] avoid "${a}"가 문항에 없음`);
    }
  }

  const coreRatio = tokens > 0 ? core / tokens : 1;
  if (coreRatio < 0.95) errors.push(`V6 전체 초등 어휘 비율 ${(coreRatio * 100).toFixed(1)}% < 95%`);

  // V9
  const band34 = qs.filter((q) => q.band === '3-4').length;
  const band56 = qs.filter((q) => q.band === '5-6').length;
  if (qs.length < 100) errors.push(`V9 문항 수 ${qs.length} < 100`);
  if (band34 < 50) errors.push(`V9 3~4학년군 ${band34} < 50`);
  if (band56 < 50) errors.push(`V9 5~6학년군 ${band56} < 50`);
  const avoid = avoidIndex(qs);
  const maxCards = Math.max(...[1, 4, 7].map((n) => stageFor(n).cards));
  for (const band of ['3-4', '5-6', 'all'] as BandChoice[]) {
    const dPool = distractorPool(qs, band);
    const answers = band === 'all' ? qs : qs.filter((q) => q.band === band);
    for (const q of answers) {
      const rng = mulberry32(1);
      const d = pickDistractors(q, dPool, maxCards - 1, 2, rng, avoid);
      if (!d) errors.push(`V9 [${q.id}] 학년군 ${band}에서 오답 ${maxCards - 1}개를 고를 수 없음`);
    }
    // 한 판을 실제로 만들 수 있는가
    try {
      buildPlans(qs, band, mulberry32(7));
    } catch (e) {
      errors.push(`V9 학년군 ${band}에서 한 판을 만들 수 없음: ${String(e)}`);
    }
  }

  return {
    errors,
    stats: { total: qs.length, band34, band56, tokens, coreRatio, secondaryTokens },
  };
}

export type { Question };
