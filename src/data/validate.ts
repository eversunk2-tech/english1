// spec 7.4: 문항 기계 검사 V1~V10·V5b, Very Hard 검사 VH-V1~V10(spec 16.4, v9 VH-V10). 순수 — 단위 테스트와 scripts/check-data.mjs가 함께 쓴다.
import { buildGamePlans, pickDistractors, avoidIndex, distractorPoolFor } from '../game/questions.ts';
import { DIFFICULTY_NAMES, GAME } from '../config.ts';
import { mulberry32, type Rng } from '../game/rng.ts';
import { bagPool, drawGame, drawSpecFor, emptyBag, type BagPools } from '../game/bag.ts';
import type { Difficulty } from '../config.ts';
import { TOPICS, type BandChoice, type Question, type QuestionPlan, type QuestionsFile } from '../game/types.ts';
import { clueMentions, derivedRoots, lemmas, sameRootTokens, tokenize } from './words.ts';

/** 빈 더미에서 한 판의 정답을 뽑아 계획을 만든다(실제 게임과 같은 순서 — v9 drawSpecFor·drawGame·buildGamePlans, spec 5.6.1 ①-2) */
function buildPlansFromEmptyBags(pools: BagPools, band: BandChoice, d: Difficulty, rng: Rng): QuestionPlan[] {
  const spec = drawSpecFor(band, d);
  const { answers, levels } = drawGame(spec, (name) => ({ name, pool: bagPool(name, pools), state: emptyBag() }), rng);
  return buildGamePlans(pools, band, d, rng, answers, levels);
}

/** 한 판이 10문제이고 한 단계 위 문제가 upCount개, 모두 upFrom번 이후인가 */
function checkGamePlans(plans: readonly QuestionPlan[], d: Difficulty): string | null {
  const cfg = GAME.DIFFICULTIES[d];
  if (plans.length !== GAME.QUESTIONS_PER_GAME) return `문제 ${plans.length}개(≠ ${GAME.QUESTIONS_PER_GAME})`;
  const ups = plans.map((p, i) => (p.level === 'up' ? i + 1 : 0)).filter((n) => n > 0);
  if (ups.length !== cfg.upCount) return `한 단계 위 문제 ${ups.length}개(≠ ${cfg.upCount})`;
  if (cfg.upFrom !== null && ups.some((n) => n < (cfg.upFrom as number))) return `한 단계 위 문제가 ${cfg.upFrom}번보다 앞`;
  if (new Set(plans.map((p) => p.answer.id)).size !== plans.length) return '한 판 안 정답 중복';
  return null;
}

export interface ClueExtra {
  secondary: string[];
  interjection: string[];
  proper: string[];
  /** v3(spec 7.6.5): 5~6학년군 정답으로 쓸 수 있는 중학 권장(**) 낱말 */
  answerSecondary?: string[];
  /** v4(spec 16.4): Very Hard 정답 중 "심화"(기본 어휘 표시 없는 등급) 낱말 */
  veryhardAdvanced?: string[];
  /** v4b(spec 7.4 V5b 보완): 접사를 떼면 우연히 초등 낱말이 되는 가짜 어근 — V5b ②를 건너뜀 */
  notDerived?: string[];
}

/** V10: 5~6학년군 정답 중 answerSecondary 낱말 비율 상한 */
export const ANSWER_SECONDARY_MAX_RATIO = 0.2;

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
    /** v3: 5~6학년군 정답 중 ** 낱말(answerSecondary) 수와 비율 */
    answerSecondaryCount: number;
    answerSecondaryRatio: number;
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

/**
 * 부록 A 검사. veryhard(부록 D)를 주면 V9의 판 구성 흉내에 Normal·Hard의 한 단계 위 중학 문항까지 넣는다(v9).
 * 주지 않으면 Very Hard 더미가 필요한 조합(학년군 5-6·all의 Normal·Hard)은 흉내에서 건너뛴다.
 */
export function validateQuestions(
  data: QuestionsFile,
  vocabLines: readonly string[],
  extra: ClueExtra,
  veryhard?: QuestionsFile,
): ValidationReport {
  const errors: string[] = [];
  const vocab = makeVocabSet(vocabLines);
  const answerSecondary = new Set((extra.answerSecondary ?? []).map((w) => w.toLowerCase()));
  const notDerived = new Set((extra.notDerived ?? []).map((w) => w.toLowerCase()));
  // V5 보완(spec 7.4 v3b)의 "실제 낱말": 초등 목록(부록 B) · clue-extra.json의 목록 · 문항 낱말
  const realWords = new Set<string>([
    ...vocab,
    ...extra.secondary,
    ...extra.interjection,
    ...extra.proper,
    ...answerSecondary,
    ...data.questions.map((q) => q.word),
  ].map((w) => w.toLowerCase()));
  const isRealWord = (l: string): boolean => realWords.has(l);
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
    // V5(v3b 보완): ④ "정답 안에 들어 있음"은 실제 낱말(토큰 자신·초등 목록·clue-extra 목록·문항 낱말)일 때만
    if (clueMentions(clue, q.word, isRealWord)) errors.push(`V5 ${at} 설명에 정답(${q.word}) 또는 같은 어근이 들어 있음`);
    // V5b(spec 7.4 v4, v4b 예외 notDerived): 정답의 어근(base 조각·파생 접사를 뗀 기본형)이 설명에 들어 있으면 실패
    for (const r of derivedRoots(q.word, q.base, vocab, notDerived)) {
      if (clueMentions(clue, r, isRealWord)) errors.push(`V5b ${at} 설명에 정답(${q.word})의 어근 "${r}"이 들어 있음`);
    }
    // V5c(spec 7.4 v4b): 같은 어근의 다른 낱말(poem ↔ poet)
    for (const t of sameRootTokens(clue, q.word, vocab)) errors.push(`V5c ${at} 설명 낱말 "${t}"이 정답(${q.word})과 같은 뿌리`);
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
    // V7'(spec 7.6.5): V7을 만족하거나, 5~6학년군이고 answerSecondary에 있으면 통과.
    // 3~4학년군 정답이 answerSecondary에 있으면 위반.
    const inAnswerSecondary = answerSecondary.has(q.word);
    if (inAnswerSecondary && q.band === '3-4') {
      errors.push(`V7' ${at} 3~4학년군 정답(${q.word})이 중학 권장(**) 정답 목록(answerSecondary)에 있음`);
    }
    const wordOk =
      inVocab(q.word, vocab) ||
      (q.base !== null && q.base.split('+').every((p) => vocab.has(p.trim().toLowerCase()))) ||
      (q.band === '5-6' && inAnswerSecondary);
    if (!wordOk) errors.push(`V7' ${at} 정답(${q.word})이 초등 목록에 없고 base·answerSecondary로도 설명되지 않음`);
  }

  // V8
  for (const q of qs) {
    for (const a of q.avoid) {
      if (!words.has(a)) errors.push(`V8 [${q.id}] avoid "${a}"가 문항에 없음`);
    }
  }

  // V10(spec 7.6.5): 5~6학년군 정답 중 answerSecondary 비율 ≤ 20%, answerSecondary 낱말은 모두 문항에 쓰여야 함
  const band56Words = qs.filter((q) => q.band === '5-6').map((q) => q.word);
  const answerSecondaryCount = band56Words.filter((w) => answerSecondary.has(w)).length;
  const answerSecondaryRatio = band56Words.length > 0 ? answerSecondaryCount / band56Words.length : 0;
  if (answerSecondaryRatio > ANSWER_SECONDARY_MAX_RATIO) {
    errors.push(
      `V10 5~6학년군 정답 중 중학 권장(**) 낱말 ${answerSecondaryCount}/${band56Words.length} = ${(answerSecondaryRatio * 100).toFixed(1)}% > 20%`,
    );
  }
  for (const w of answerSecondary) {
    if (!words.has(w)) errors.push(`V10 answerSecondary 낱말 "${w}"이 어느 문항의 정답으로도 쓰이지 않음`);
  }

  const coreRatio = tokens > 0 ? core / tokens : 1;
  if (coreRatio < 0.95) errors.push(`V6 전체 초등 어휘 비율 ${(coreRatio * 100).toFixed(1)}% < 95%`);

  // V9
  const band34 = qs.filter((q) => q.band === '3-4').length;
  const band56 = qs.filter((q) => q.band === '5-6').length;
  if (qs.length < 100) errors.push(`V9 문항 수 ${qs.length} < 100`);
  if (band34 < 50) errors.push(`V9 3~4학년군 ${band34} < 50`);
  if (band56 < 50) errors.push(`V9 5~6학년군 ${band56} < 50`);
  const pools: BagPools = { main: qs, veryhard: veryhard?.questions ?? [], advanced: extra.veryhardAdvanced ?? [] };
  const avoid = avoidIndex(qs);
  const nonVh = DIFFICULTY_NAMES.filter((x) => x !== 'veryhard');
  const maxCards = Math.max(...nonVh.flatMap((d) => GAME.DIFFICULTIES[d].stages.map((s) => s.cards)));
  const maxSame = Math.max(...nonVh.flatMap((d) => GAME.DIFFICULTIES[d].stages.map((s) => s.sameTopicDistractors)));
  for (const band of ['3-4', '5-6', 'all'] as BandChoice[]) {
    // 학년군의 기본 정답 + (3-4면) 한 단계 위 5~6 정답 — 오답 풀은 정답 문항의 수준으로(spec 5.6 v9)
    const answers = band === 'all' ? qs : band === '3-4' ? qs : qs.filter((q) => q.band === band);
    for (const q of answers) {
      const rng = mulberry32(1);
      const dPool = distractorPoolFor(q, band, pools);
      const d = pickDistractors(q, dPool, maxCards - 1, maxSame, rng, avoid);
      if (!d) errors.push(`V9 [${q.id}] 학년군 ${band}에서 오답 ${maxCards - 1}개를 고를 수 없음`);
    }
    // 한 판을 실제로 만들 수 있는가(Easy·Normal·Hard, v9 뽑기 — Very Hard는 자기 풀만 쓰므로 validateVeryHard가 본다)
    for (const d of nonVh) {
      const spec = drawSpecFor(band, d);
      const needsVh = [...spec.base, ...spec.up].some((n) => n === 'vh-mid' || n === 'vh-adv');
      if (needsVh && !veryhard) continue;
      try {
        const bad = checkGamePlans(buildPlansFromEmptyBags(pools, band, d, mulberry32(7)), d);
        if (bad) errors.push(`V9 학년군 ${band}·난이도 ${d}의 한 판: ${bad}`);
      } catch (e) {
        errors.push(`V9 학년군 ${band}·난이도 ${d}에서 한 판을 만들 수 없음: ${String(e)}`);
      }
    }
  }

  return {
    errors,
    stats: { total: qs.length, band34, band56, tokens, coreRatio, secondaryTokens, answerSecondaryCount, answerSecondaryRatio },
  };
}

export type { Question };

// ───────────── Very Hard 검사 (spec 16.1·16.4, v4) ─────────────

/** VH-V10(v9, spec 16.4·18.5): 심화 문항 ≥ 40, 중학 문항 ≥ 60, 심화 비율 ≤ 45% */
export const VERYHARD_ADVANCED_MIN = 40;
export const VERYHARD_MID_MIN = 60;
export const VERYHARD_ADVANCED_MAX_RATIO = 0.45;
/** VH-V6: 설명 하나의 ** 낱말 상한 */
export const VERYHARD_CLUE_SECONDARY_MAX = 3;
export const VERYHARD_MIN_TOTAL = 90;
export const VERYHARD_MIN_PER_TOPIC = 3;

export interface VeryHardReport {
  errors: string[];
  stats: {
    total: number;
    advancedCount: number;
    /** v9: 중학(심화 목록에 없는) 문항 수 */
    midCount: number;
    advancedRatio: number;
    tokens: number;
    /** 설명 토큰 중 초등(*)·중학(**)·허용(고유 명사·언어명·의성어) 비율 */
    elementaryRatio: number;
    secondaryRatio: number;
    allowedRatio: number;
    maxSecondaryInClue: number;
    topics: Record<string, number>;
  };
}

/**
 * Very Hard 문항 검사. main은 부록 A 문항(겹침 검사·실제 낱말용), elementaryLines는 부록 B, secondaryLines는 부록 E.
 */
export function validateVeryHard(
  vh: QuestionsFile,
  main: QuestionsFile,
  elementaryLines: readonly string[],
  secondaryLines: readonly string[],
  extra: ClueExtra,
): VeryHardReport {
  const errors: string[] = [];
  const elementary = makeVocabSet(elementaryLines);
  const secondary = makeVocabSet(secondaryLines);
  const advanced = new Set((extra.veryhardAdvanced ?? []).map((w) => w.toLowerCase()));
  const notDerived = new Set((extra.notDerived ?? []).map((w) => w.toLowerCase()));
  const allowed = [...extra.proper, ...extra.interjection];
  const mainWords = new Set(main.questions.map((q) => q.word));
  const qs = vh.questions;
  const realWords = new Set<string>(
    [...elementary, ...secondary, ...extra.secondary, ...allowed, ...advanced, ...qs.map((q) => q.word), ...mainWords].map((w) =>
      w.toLowerCase(),
    ),
  );
  const isRealWord = (l: string): boolean => realWords.has(l);
  const ids = new Set<string>();
  const words = new Set<string>();
  let tokens = 0;
  let nElem = 0;
  let nSec = 0;
  let nAllowed = 0;
  let maxSecondaryInClue = 0;
  const topics: Record<string, number> = {};

  for (const q of qs) {
    const at = `[${q.id}]`;
    topics[q.topic] = (topics[q.topic] ?? 0) + 1;
    // VH-V1
    const m = /^vh-([a-z]+)-\d{2}$/.exec(q.id);
    if (!m) errors.push(`VH-V1 ${at} id 형식이 틀림`);
    else if (m[1] !== q.topic) errors.push(`VH-V1 ${at} id 가운데와 topic(${q.topic})이 다름`);
    if (ids.has(q.id)) errors.push(`VH-V1 ${at} id 중복`);
    ids.add(q.id);
    // VH-V2
    if (!/^[a-z]{2,11}$/.test(q.word)) errors.push(`VH-V2 ${at} word 형식(${q.word})`);
    if (words.has(q.word)) errors.push(`VH-V2 ${at} word 중복(${q.word})`);
    if (mainWords.has(q.word)) errors.push(`VH-V2 ${at} 부록 A 낱말과 겹침(${q.word})`);
    words.add(q.word);
    // VH-V3(형식): band·topic·ko
    if (q.band !== 'vh') errors.push(`VH-V3 ${at} band가 "vh"가 아님(${String(q.band)})`);
    if (!TOPIC_SET.has(q.topic)) errors.push(`VH-V3 ${at} topic(${q.topic})`);
    if (typeof q.ko !== 'string' || !/[가-힣]/.test(q.ko)) errors.push(`VH-V3 ${at} ko에 한글이 없음`);
    // VH-V4 (V4와 같음, 10낱말 이하)
    const clue = q.clue ?? '';
    if (!/^[A-Z]/.test(clue)) errors.push(`VH-V4 ${at} 설명이 대문자로 시작하지 않음`);
    if (!clue.endsWith('.')) errors.push(`VH-V4 ${at} 설명이 .로 끝나지 않음`);
    if (!/^[A-Za-z ,.'?!]*$/.test(clue)) errors.push(`VH-V4 ${at} 설명에 쓸 수 없는 글자`);
    const toks = tokenize(clue);
    if (toks.length > 10) errors.push(`VH-V4 ${at} 설명 낱말 수 ${toks.length} > 10`);
    // VH-V5 (V5·V5b와 같음)
    if (clueMentions(clue, q.word, isRealWord)) errors.push(`VH-V5 ${at} 설명에 정답(${q.word}) 또는 같은 어근이 들어 있음`);
    for (const r of derivedRoots(q.word, q.base, elementary, notDerived)) {
      if (clueMentions(clue, r, isRealWord)) errors.push(`VH-V5 ${at} 설명에 정답(${q.word})의 어근 "${r}"이 들어 있음(V5b)`);
    }
    for (const t of sameRootTokens(clue, q.word, elementary)) errors.push(`VH-V5 ${at} 설명 낱말 "${t}"이 정답(${q.word})과 같은 뿌리(V5c)`);
    // VH-V6: 토큰마다 초등(*)·중학(**)·허용 목록. ** 낱말 3개까지, 표시 없는 등급은 쓰지 않음
    let secInClue = 0;
    for (const t of toks) {
      tokens += 1;
      if (inVocab(t, elementary) || isCompound(t, elementary)) {
        nElem += 1;
        continue;
      }
      if (inList(t, allowed)) {
        nAllowed += 1;
        continue;
      }
      if (inVocab(t, secondary)) {
        nSec += 1;
        secInClue += 1;
        continue;
      }
      errors.push(`VH-V6 ${at} 설명 낱말 "${t}"이 초등·중학 목록·허용 목록에 없음`);
    }
    maxSecondaryInClue = Math.max(maxSecondaryInClue, secInClue);
    if (secInClue > VERYHARD_CLUE_SECONDARY_MAX) {
      errors.push(`VH-V6 ${at} 설명의 중학(**) 낱말 ${secInClue}개(>${VERYHARD_CLUE_SECONDARY_MAX})`);
    }
    // VH-V7: 정답이 부록 E(또는 base가 부록 E)에 있거나 veryhardAdvanced에 있음
    const wordOk =
      inVocab(q.word, secondary) ||
      (q.base !== null && q.base.split('+').every((p) => secondary.has(p.trim().toLowerCase()))) ||
      advanced.has(q.word);
    if (!wordOk) errors.push(`VH-V7 ${at} 정답(${q.word})이 중학 목록(부록 E)·심화 목록에 없음`);
    if (advanced.has(q.word) && inVocab(q.word, secondary)) {
      errors.push(`VH-V7 ${at} 심화 목록의 정답(${q.word})이 중학 목록에도 있음`);
    }
  }

  // V5b 보완(spec 7.4 v4b): notDerived의 낱말은 모두 문항(부록 A·D)의 정답이어야 한다
  for (const w of notDerived) {
    if (!words.has(w) && !mainWords.has(w)) errors.push(`V5b notDerived 낱말 "${w}"이 부록 A·D 어느 문항의 정답도 아님`);
  }

  // VH-V8: avoid가 Very Hard 풀 안
  for (const q of qs) {
    for (const a of q.avoid) if (!words.has(a)) errors.push(`VH-V8 [${q.id}] avoid "${a}"가 Very Hard 풀에 없음`);
  }

  // VH-V10(v9): 심화 문항 ≥ 40·중학 문항 ≥ 60(각 더미가 10판 이상 버팀), 심화 비율 ≤ 45%, 목록 낱말은 모두 쓰임
  const advancedCount = qs.filter((q) => advanced.has(q.word)).length;
  const midCount = qs.length - advancedCount;
  const advancedRatio = qs.length > 0 ? advancedCount / qs.length : 0;
  if (advancedCount < VERYHARD_ADVANCED_MIN) errors.push(`VH-V10 심화 문항 ${advancedCount} < ${VERYHARD_ADVANCED_MIN}`);
  if (midCount < VERYHARD_MID_MIN) errors.push(`VH-V10 중학 문항 ${midCount} < ${VERYHARD_MID_MIN}`);
  if (advancedRatio > VERYHARD_ADVANCED_MAX_RATIO) {
    errors.push(`VH-V10 심화 정답 ${advancedCount}/${qs.length} = ${(advancedRatio * 100).toFixed(1)}% > 45%`);
  }
  for (const w of advanced) if (!words.has(w)) errors.push(`VH-V10 veryhardAdvanced 낱말 "${w}"이 어느 문항에도 쓰이지 않음`);

  // VH-V9: 문항 ≥ 90, 주제마다 ≥ 3, 모든 문항에서 오답 3개를 고를 수 있고 한 판을 만들 수 있음
  if (qs.length < VERYHARD_MIN_TOTAL) errors.push(`VH-V9 문항 수 ${qs.length} < ${VERYHARD_MIN_TOTAL}`);
  for (const [t, n] of Object.entries(topics)) {
    if (n < VERYHARD_MIN_PER_TOPIC) errors.push(`VH-V9 주제 ${t} 문항 ${n} < ${VERYHARD_MIN_PER_TOPIC}`);
  }
  const avoid = avoidIndex(qs);
  for (const q of qs) {
    if (!pickDistractors(q, qs, 3, 3, mulberry32(1), avoid)) errors.push(`VH-V9 [${q.id}] 오답 3개를 고를 수 없음`);
  }
  try {
    const vhPools: BagPools = { main: main.questions, veryhard: qs, advanced: [...advanced] };
    const bad = checkGamePlans(buildPlansFromEmptyBags(vhPools, 'all', 'veryhard', mulberry32(7)), 'veryhard');
    if (bad) errors.push(`VH-V9 Very Hard 한 판: ${bad}`);
  } catch (e) {
    errors.push(`VH-V9 Very Hard 한 판을 만들 수 없음: ${String(e)}`);
  }

  return {
    errors,
    stats: {
      total: qs.length,
      advancedCount,
      midCount,
      advancedRatio,
      tokens,
      elementaryRatio: tokens ? nElem / tokens : 1,
      secondaryRatio: tokens ? nSec / tokens : 0,
      allowedRatio: tokens ? nAllowed / tokens : 0,
      maxSecondaryInClue,
      topics,
    },
  };
}
