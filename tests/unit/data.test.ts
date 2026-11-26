import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import questionsJson from '../../src/data/questions.json';
import extraJson from '../../src/data/vocab/clue-extra.json';
import veryhardJson from '../../src/data/veryhard.json';
import { validateQuestions, validateVeryHard, type ClueExtra } from '../../src/data/validate.ts';
import { clueMentions, derivedRoots, lemmas, sameRootTokens, tokenize } from '../../src/data/words.ts';
import type { Question, QuestionsFile } from '../../src/game/types.ts';

const root = resolve(__dirname, '..', '..');
const data = questionsJson as QuestionsFile;
const extra = extraJson as ClueExtra;
const vocab = readFileSync(resolve(root, 'src/data/vocab/elementary-2022.txt'), 'utf8').split('\n');
const secondaryVocab = readFileSync(resolve(root, 'src/data/vocab/secondary-2022.txt'), 'utf8').split('\n');
const vhData = veryhardJson as QuestionsFile;
const spec = readFileSync(resolve(root, 'spec.md'), 'utf8');

/** spec.md에서 제목이 정확히 heading으로 시작하는 절 하나만(다음 '## ' 제목 전까지) 잘라 낸다 — '## 부록 A-v3' 같은 다른 절은 들어가지 않는다 */
function section(heading: string): string {
  const a = spec.indexOf(`\n${heading}`);
  expect(a).toBeGreaterThan(0);
  const next = spec.indexOf('\n## ', a + 1);
  return spec.slice(a, next < 0 ? undefined : next);
}

/** spec.md 부록 A 표를 직접 읽는다 */
function specRows(): string[][] {
  return section('## 부록 A.')
    .split('\n')
    .filter((l) => /^\| [a-z]+-\d{2} \|/.test(l))
    .map((l) => l.split('|').slice(1, -1).map((s) => s.trim()));
}

function clone(): QuestionsFile {
  return JSON.parse(JSON.stringify(data)) as QuestionsFile;
}

function withQuestion(mut: (q: Question) => void, idx = 0): string[] {
  const d = clone();
  mut(d.questions[idx]!);
  return validateQuestions(d, vocab, extra).errors;
}

/**
 * 검사기(validateQuestions·validateVeryHard)를 통째로 다시 도는 묶음의 테스트별 시간 제한(vitest 기본 5초 대신).
 * 근거: 배포 러너(run 45878021468 attempt 1)에서 이 묶음은 로컬보다 약 5.6배 느려 테스트 하나가 최대 2.7초(로컬 0.5초)였다.
 * 30초면 러너 실측·추정의 3배 이상 여유. 검사 내용·위반 예시는 그대로다.
 */
const SLOW_TIMEOUT_MS = 30_000;

describe('data (spec 7)', () => {
  it('validate.ts V1~V9 위반 0 (v9: 부록 D를 함께 넘겨 Normal·Hard 한 단계 위까지 판 구성 흉내)', () => {
    const r = validateQuestions(data, vocab, extra, vhData);
    expect(r.errors).toEqual([]);
    // v3(spec 7.6): 230문항 = 3~4학년군 143 + 5~6학년군 87, 5~6의 ** 정답 16/87 = 18.4%
    expect(r.stats.total).toBe(230);
    expect(r.stats.band34).toBe(143);
    expect(r.stats.band56).toBe(87);
    expect(r.stats.answerSecondaryCount).toBe(16);
    expect(Number((r.stats.answerSecondaryRatio * 100).toFixed(1))).toBe(18.4);
    expect(r.stats.coreRatio).toBeGreaterThanOrEqual(0.95);
  });

  it('부록 A 표와 questions.json이 모든 칸에서 같다(230문항, v3)', () => {
    const rows = specRows();
    expect(rows.length).toBe(230);
    expect(data.questions.length).toBe(230);
    expect(data.version).toBe(2);
    // v3b(spec 7.3·7.6.5): source 문구
    expect(data.source).toBe('2022 개정 영어과 교육과정 [별표 3] 기본 어휘(초등 * 중심 + 5~6학년군 중학 ** 일부)');
    expect(spec.includes(`"source": "${data.source}"`)).toBe(true);
    rows.forEach((cells, i) => {
      const [id, word, band, topic, ko, clue, avoid, base] = cells;
      const q = data.questions[i]!;
      expect(q.id).toBe(id);
      expect(q.word).toBe(word);
      expect(q.band).toBe(band === '3~4' ? '3-4' : band === '5~6' ? '5-6' : `bad:${band}`);
      expect(q.topic).toBe(topic);
      expect(q.ko).toBe(ko);
      expect(q.clue).toBe(clue);
      expect(q.avoid).toEqual(avoid === '' ? [] : avoid!.split(','));
      expect(q.base).toBe(base === '' ? null : base);
      expect(Object.keys(q).sort()).toEqual(['avoid', 'band', 'base', 'clue', 'id', 'ko', 'topic', 'word']);
    });
  });

  it('부록 B 단어 목록(819개)이 vocab 파일과 같다', () => {
    const line = section('## 부록 B.')
      .split('\n')
      .find((l) => l.startsWith('a, about,'))!;
    const words = line.split(',').map((s) => s.trim()).filter(Boolean);
    expect(words.length).toBe(819);
    expect(vocab.filter((l) => l.length > 0)).toEqual(words);
  });

  it('clue-extra.json이 spec 7.3 + 7.6.5(v3 더함)와 같다', () => {
    expect(extra.secondary).toEqual([
      'pet', 'wing', 'ride', 'bug', 'honey', 'round', 'lay', 'sweet', 'lot', 'person', 'through', 'plant', 'other', 'wheel', 'string', 'shoot', 'net', 'once',
      'thin', 'wild', 'pray', 'loud', 'truth', 'stamp', 'happen', 'piece', 'planet', 'meal', 'bow',
    ]);
    // v4(spec 16.4): ribbit, 언어명·지명 6개, veryhardAdvanced
    expect(extra.interjection).toEqual(['meow', 'woof', 'oink', 'quack', 'ribbit']);
    expect(extra.proper).toEqual(['monday', 'tuesday', 'saturday', 'sunday', 'christmas', 'mars', 'italian', 'english', 'korean', 'chinese', 'pacific', 'asia', 'africa']);
    // v4(spec 16.1) 심화 23개 + v9(spec 18.5) 새 심화 25개 = 48개(순서는 부록 D 표 순서 — 아래 부록 D 테스트가 확인)
    const v4Advanced = [
      'insect', 'goat', 'ingredient', 'thumb', 'athlete', 'passenger', 'professor', 'vocabulary', 'ladder', 'continent', 'harbor', 'tunnel',
      'gallery', 'passport', 'submarine', 'orchestra', 'rhythm', 'anniversary', 'generous', 'grateful', 'celebrate', 'explore', 'translate',
    ];
    const v9Advanced = [
      'chin', 'heel', 'beard', 'corn', 'wheat', 'author', 'mayor', 'nephew', 'geography', 'biology', 'soap', 'stove', 'costume',
      'cave', 'breeze', 'horizon', 'statue', 'fountain', 'ferry', 'choir', 'microphone', 'decade', 'loyal', 'clap', 'nod',
    ];
    expect(v9Advanced.length).toBe(25);
    expect([...(extra.veryhardAdvanced ?? [])].sort()).toEqual([...v4Advanced, ...v9Advanced].sort());
    expect(extra.veryhardAdvanced!.length).toBe(48);
    expect(extra.answerSecondary).toEqual([
      'giraffe', 'dolphin', 'whale', 'medicine', 'fever', 'dentist', 'calendar', 'island', 'desert', 'planet', 'airport', 'museum', 'village', 'hungry', 'angry', 'invent',
    ]);
    // spec 7.6.5에 적힌 answerSecondary 목록 글자와 같다
    expect(spec.includes(`\`answerSecondary\`: \`${JSON.stringify(extra.answerSecondary)}\``)).toBe(true);
  });

  describe('위반 예시를 일부러 넣으면 잡아낸다', () => {
    const has = (errs: string[], code: string): boolean => errs.some((e) => e.startsWith(code));
    it('V1 id 형식', () => expect(has(withQuestion((q) => (q.id = 'Animal-1')), 'V1')).toBe(true));
    it('V1 id 앞부분 ≠ topic', () => expect(has(withQuestion((q) => (q.id = 'food-99')), 'V1')).toBe(true));
    it('V2 word 중복', () => expect(has(withQuestion((q) => (q.word = 'dog')), 'V2')).toBe(true));
    it('V2 word 형식', () => expect(has(withQuestion((q) => (q.word = 'Cat')), 'V2')).toBe(true));
    it('V3 band', () => expect(has(withQuestion((q) => ((q as { band: string }).band = '1-2')), 'V3')).toBe(true));
    it('V3 ko 한글 없음', () => expect(has(withQuestion((q) => (q.ko = 'cat')), 'V3')).toBe(true));
    it('V4 소문자 시작', () => expect(has(withQuestion((q) => (q.clue = 'a small pet. It says meow.')), 'V4')).toBe(true));
    it('V4 쓸 수 없는 글자', () => expect(has(withQuestion((q) => (q.clue = 'A small pet: it says meow.')), 'V4')).toBe(true));
    it('V4 11낱말 설명(5~6)', () => {
      const idx56 = data.questions.findIndex((q) => q.band === '5-6');
      const errs = withQuestion((q) => (q.clue = 'It is a very big animal and it can run fast.'), idx56);
      expect(has(errs, 'V4')).toBe(true);
    });
    it('V4 9낱말 설명(3~4)', () => {
      const errs = withQuestion((q) => (q.clue = 'A small pet that says meow at the door.'));
      expect(has(errs, 'V4')).toBe(true);
    });
    it('V5 정답이 든 설명', () => expect(has(withQuestion((q) => (q.clue = 'A small cat. It says meow.')), 'V5')).toBe(true));
    it('V5 같은 어근(birthday ⊃ day)', () => {
      const idx = data.questions.findIndex((q) => q.word === 'birthday');
      expect(has(withQuestion((q) => (q.clue = 'A happy day with cake.'), idx), 'V5')).toBe(true);
    });
    it('V5 보완(v3b): fever "…gets very hot."는 통과(very → ver 같은 가짜 조각은 ④에 안 걸림)', () => {
      const fever = data.questions.find((q) => q.word === 'fever')!;
      expect(fever.clue).toBe('When you are sick, your body gets very hot.');
      // 오답 고르기용 넓은 규칙으로는 걸리지만(그대로 둠, spec 5.6) V5 검사에서는 통과
      expect(clueMentions(fever.clue, 'fever')).toBe(true);
      const errs = validateQuestions(clone(), vocab, extra).errors;
      expect(errs.filter((e) => e.startsWith('V5'))).toEqual([]);
      // 같은 보완으로 this → thi ⊂ thirsty 도 V5(④)에 걸리지 않는다. V5b·V5c(다듬은 문장)도 통과 — V5 계열 전체를 본다
      const idx = data.questions.findIndex((q) => q.word === 'thirsty');
      expect(withQuestion((q) => (q.clue = 'You feel this and want water.'), idx).filter((e) => e.startsWith('V5'))).toEqual([]);
    });
    it('V5 보완(v3b): birthday 설명에 진짜 낱말 "day"를 넣으면 여전히 V5 실패', () => {
      const idx = data.questions.findIndex((q) => q.word === 'birthday');
      const errs = withQuestion((q) => (q.clue = 'A party with cake and presents on this day.'), idx);
      expect(errs.some((e) => e.startsWith('V5') && e.includes('birthday'))).toBe(true);
      // basketball ⊃ ball 도 그대로 잡는다
      const bi = data.questions.findIndex((q) => q.word === 'basketball');
      expect(has(withQuestion((q) => (q.clue = 'Players throw a big ball into a high ring.'), bi), 'V5')).toBe(true);
    });
    it('V6 목록 밖 낱말', () => expect(has(withQuestion((q) => (q.clue = 'A small feline. It says meow.')), 'V6')).toBe(true));
    it('V6 secondary 3개', () => expect(has(withQuestion((q) => (q.clue = 'A pet bug with honey.')), 'V6')).toBe(true));
    it('V7 정답이 목록에 없음', () => expect(has(withQuestion((q) => (q.word = 'zebra')), 'V7')).toBe(true));
    it("V7' 3~4학년군 정답에 중학 권장 낱말(museum)", () => {
      const d = clone();
      // museum 문항을 3~4학년군으로 바꾼다
      const m = d.questions.find((q) => q.word === 'museum')!;
      m.band = '3-4';
      const errs = validateQuestions(d, vocab, extra).errors;
      expect(errs.some((e) => e.startsWith("V7'") && e.includes('museum'))).toBe(true);
    });
    it("V7' 5~6학년군 ** 정답도 answerSecondary에 없으면 위반", () => {
      const d = clone();
      const ex = { ...extra, answerSecondary: (extra.answerSecondary ?? []).filter((w) => w !== 'giraffe') };
      const errs = validateQuestions(d, vocab, ex).errors;
      expect(errs.some((e) => e.startsWith("V7'") && e.includes('giraffe'))).toBe(true);
    });
    it('V10 5~6학년군 ** 정답 비율 21% → 위반', () => {
      const d = clone();
      // 5~6학년군 * 정답 2개를 ** 낱말로 바꿔 18/87 → 18.4%를 넘기고, 목록에도 더해 V7'은 통과시킨다
      const star = d.questions.filter((q) => q.band === '5-6' && !(extra.answerSecondary ?? []).includes(q.word));
      const extraWords = ['tunnel', 'volcano'];
      star.slice(0, 2).forEach((q, i) => (q.word = extraWords[i]!));
      const ex = { ...extra, answerSecondary: [...(extra.answerSecondary ?? []), ...extraWords] };
      const r = validateQuestions(d, vocab, ex);
      expect(r.stats.answerSecondaryCount).toBe(18);
      expect(r.stats.answerSecondaryRatio).toBeCloseTo(18 / 87, 9);
      expect(18 / 87).toBeGreaterThan(0.2);
      expect(r.errors.some((e) => e.startsWith('V10') && e.includes('20%'))).toBe(true);
    });
    it('V10 answerSecondary 낱말이 어느 문항에도 안 쓰이면 위반', () => {
      const ex = { ...extra, answerSecondary: [...(extra.answerSecondary ?? []), 'volcano'] };
      const errs = validateQuestions(clone(), vocab, ex).errors;
      expect(errs.some((e) => e.startsWith('V10') && e.includes('volcano'))).toBe(true);
    });
    it('V8 avoid가 문항에 없음', () => expect(has(withQuestion((q) => (q.avoid = ['unicorn'])), 'V8')).toBe(true));
    it('V9 문항 수 부족', () => {
      const d = clone();
      d.questions = d.questions.slice(0, 60);
      const errs = validateQuestions(d, vocab, extra).errors;
      expect(has(errs, 'V9')).toBe(true);
    });
  }, SLOW_TIMEOUT_MS);

  describe('V5b(spec 7.4 v4): 정답의 어근(base 조각·파생 접사를 뗀 기본형)이 설명에 있으면 실패', () => {
    const has = (errs: string[], code: string): boolean => errs.some((e) => e.startsWith(code));
    it('어근 후보 계산', () => {
      const elem = new Set(vocab.map((v) => v.trim().toLowerCase()));
      expect(derivedRoots('scientist', null, elem)).toContain('science'); // scient+ist → t→ce
      expect(derivedRoots('farmer', null, elem)).toContain('farm');
      expect(derivedRoots('teacher', 'teach', elem)).toContain('teach');
      expect(derivedRoots('birthday', 'birth+day', elem)).toEqual(expect.arrayContaining(['birth', 'day']));
      expect(derivedRoots('dangerous', null, elem)).toContain('danger');
    });
    it('scientist의 옛 설명 "This person does science tests to learn new things."는 V5b 실패, 새 설명은 통과', () => {
      const i = data.questions.findIndex((q) => q.word === 'scientist');
      expect(data.questions[i]!.clue).toBe('This person does tests to find out how things work.');
      const errs = withQuestion((q) => (q.clue = 'This person does science tests to learn new things.'), i);
      expect(errs.some((e) => e.startsWith('V5b') && e.includes('science'))).toBe(true);
      expect(validateQuestions(clone(), vocab, extra).errors.filter((e) => e.startsWith('V5'))).toEqual([]);
    });
    it('v4b 예외 notDerived: busy·shoulder는 ②(접사 떼기)를 건너뜀 — busy 설명에 "bus"가 있어도 V5b 통과', () => {
      expect(extra.notDerived).toEqual(['busy', 'shoulder']);
      const elem = new Set(vocab.map((v) => v.trim().toLowerCase()));
      const nd = new Set(extra.notDerived);
      expect(derivedRoots('busy', null, elem)).toContain('bus'); // 예외가 없으면 가짜 어근 bus
      expect(derivedRoots('busy', null, elem, nd)).toEqual([]);
      expect(derivedRoots('shoulder', null, elem)).toContain('should');
      expect(derivedRoots('shoulder', null, elem, nd)).toEqual([]);
      const i = data.questions.findIndex((q) => q.word === 'busy');
      const clue = 'You have many things to do, even on the bus.';
      const errs = withQuestion((q) => (q.clue = clue), i);
      // V5b·V5c는 통과. ("bus"는 V5 ②가 따로 잡는다 — busy의 어간이 bus라서. 그래서 V5 자체는 넓히지 못함)
      expect(errs.filter((e) => e.startsWith('V5b') || e.startsWith('V5c'))).toEqual([]);
      expect(errs.some((e) => e.startsWith('V5 '))).toBe(true);
      // 예외 목록이 없으면 같은 설명이 V5b에 걸린다(예외가 실제로 일함)
      const d = clone();
      d.questions[i]!.clue = clue;
      const noEx = validateQuestions(d, vocab, { ...extra, notDerived: [] }).errors;
      expect(noEx.some((e) => e.startsWith('V5b') && e.includes('"bus"'))).toBe(true);
    });
    it('V5c(v4b, 다듬은 문장): 길이 같고 4자 이상·끝 한 글자만 다름·초등 낱말 아님·기능어 아님일 때만 실패', () => {
      const elem = new Set(vocab.map((v) => v.trim().toLowerCase()));
      expect(sameRootTokens('A poet writes it. It has short lines.', 'poem', elem)).toEqual(['poet']);
      // this ↔ thirsty·thief·thin: 길이가 다르거나 기능어라 통과
      for (const w of ['thirsty', 'thief', 'thin']) expect(sameRootTokens('You feel this and want water.', w, elem)).toEqual([]);
      expect(sameRootTokens('This and that.', 'thit', elem)).toEqual([]); // 기능어(this)는 길이가 같아도 빠짐
      expect(sameRootTokens('Airplanes take off and land here.', 'airport', elem)).toEqual([]);
      expect(sameRootTokens('It runs on tracks.', 'train', elem)).toEqual([]);
      expect(sameRootTokens('Someone took my things.', 'thief', elem)).toEqual([]);
      expect(sameRootTokens('A cat sat.', 'cats', elem)).toEqual([]); // 3자 토큰(길이가 다름)
      expect(sameRootTokens('I like to read a book.', 'reap', elem)).toEqual([]); // read는 초등 낱말
      // 부록 A에도 적용: bear 설명에 beat(** 낱말) → V5c (Plan이 본 유일한 짝)
      const i = data.questions.findIndex((q) => q.word === 'bear');
      expect(has(withQuestion((q) => (q.clue = 'A big animal. Its heart can beat slowly in winter.'), i), 'V5c')).toBe(true);
    });
    it('farmer 설명에 "farm"을 넣으면 V5b 실패', () => {
      const i = data.questions.findIndex((q) => q.word === 'farmer');
      expect(has(withQuestion((q) => (q.clue = 'This person works on a farm.'), i), 'V5b')).toBe(true);
    });
  }, SLOW_TIMEOUT_MS);

  describe('Very Hard(spec 16.4·부록 D·E)', () => {
    const vhRows = (): string[][] =>
      section('## 부록 D.')
        .split('\n')
        .filter((l) => /^\| vh-[a-z]+-\d{2} \|/.test(l))
        .map((l) => l.split('|').slice(1, -1).map((s) => s.trim()));
    const vclone = (): QuestionsFile => JSON.parse(JSON.stringify(vhData)) as QuestionsFile;
    const vrun = (mut: (d: QuestionsFile) => void, ex: ClueExtra = extra): string[] => {
      const d = vclone();
      mut(d);
      return validateVeryHard(d, data, vocab, secondaryVocab, ex).errors;
    };
    const has = (errs: string[], code: string): boolean => errs.some((e) => e.startsWith(code));

    it('부록 D 표와 veryhard.json이 모든 칸에서 같다(119문항, v9), 심화 낱말 48개 = veryhardAdvanced', () => {
      const rows = vhRows();
      expect(rows.length).toBe(119);
      expect(vhData.questions.length).toBe(119);
      // v4b(spec 15절): 고친 세 문항
      const byWord = (w: string) => vhData.questions.find((q) => q.word === w)!.clue;
      expect(byWord('ingredient')).toBe('Eggs, milk, and sugar for a cake are these.');
      expect(byWord('snack')).toBe('Cookies and chips are this. We eat it between meals.');
      expect(byWord('poem')).toBe('Beautiful words in short lines, like a song.');
      expect(vhData.source).toBe('2022 개정 영어과 교육과정 [별표 3] 기본 어휘(중학 ** 중심 + 그 외 등급 일부)');
      const advanced: string[] = [];
      rows.forEach((cells, i) => {
        const [id, word, level, topic, ko, clue, avoid, base] = cells;
        const q = vhData.questions[i]!;
        expect(q.id).toBe(id);
        expect(q.word).toBe(word);
        expect(q.band).toBe('vh');
        expect(q.topic).toBe(topic);
        expect(q.ko).toBe(ko);
        expect(q.clue).toBe(clue);
        expect(q.avoid).toEqual(avoid === '' ? [] : avoid!.split(','));
        expect(q.base).toBe(base === '' ? null : base);
        expect(Object.keys(q).sort()).toEqual(['avoid', 'band', 'base', 'clue', 'id', 'ko', 'topic', 'word']);
        expect(['중학', '심화']).toContain(level);
        if (level === '심화') advanced.push(word!);
      });
      expect(advanced).toEqual(extra.veryhardAdvanced);
      expect(advanced.length).toBe(48);
      // v9(spec 18.5): 헷갈리는 새 짝 avoid(양방향) — 부록 D 3행(oven, tunnel, orchestra)이 바뀜
      const avoidOf = (w: string) => vhData.questions.find((q) => q.word === w)!.avoid;
      expect(avoidOf('oven')).toEqual(['stove']);
      expect(avoidOf('stove')).toEqual(['oven']);
      expect(avoidOf('tunnel')).toEqual(['cave']);
      expect(avoidOf('cave')).toEqual(['tunnel']);
      expect(avoidOf('orchestra')).toEqual(['choir']);
      expect(avoidOf('choir')).toEqual(['orchestra']);
      expect(avoidOf('corn')).toEqual(['wheat']);
      expect(avoidOf('wheat')).toEqual(['corn']);
    });

    it('부록 E(중학 ** 1,215개 형태)가 secondary-2022.txt와 같다', () => {
      const line = section('## 부록 E.').split('\n').find((l) => l.startsWith('able, absolute,'))!;
      const words = line.split(',').map((s) => s.trim()).filter(Boolean);
      expect(words.length).toBe(1215);
      expect(secondaryVocab.filter((l) => l.length > 0)).toEqual(words);
    });

    it('VH-V1~V10 위반 0(v9 VH-V10), 중학 71 · 심화 48 = 40.3%, 설명당 중학 낱말 최대 3개, 주제별 문항 수', () => {
      const r = validateVeryHard(vhData, data, vocab, secondaryVocab, extra);
      expect(r.errors).toEqual([]);
      expect(r.stats.total).toBe(119);
      expect(r.stats.advancedCount).toBe(48);
      expect(r.stats.midCount).toBe(71);
      expect(Number((r.stats.advancedRatio * 100).toFixed(1))).toBe(40.3);
      expect(r.stats.maxSecondaryInClue).toBeLessThanOrEqual(3);
      // spec 18.5: 설명 낱말 초등 92.6%, 중학 6.5%, 허용 0.9%
      expect(Number((r.stats.elementaryRatio * 100).toFixed(1))).toBe(92.6);
      expect(Number((r.stats.secondaryRatio * 100).toFixed(1))).toBe(6.5);
      expect(Number((r.stats.allowedRatio * 100).toFixed(1))).toBe(0.9);
      expect(r.stats.topics).toEqual({
        animal: 6, food: 9, body: 11, people: 12, school: 9, home: 10, clothes: 5,
        nature: 11, place: 10, transport: 6, music: 5, time: 4, feeling: 10, action: 11,
      });
      expect(r.stats.topics.sports ?? 0).toBe(0);
    });

    it('위반 예시를 일부러 넣으면 잡아낸다', () => {
      expect(has(vrun((d) => (d.questions[0]!.id = 'vh-food-99')), 'VH-V1')).toBe(true);
      expect(has(vrun((d) => (d.questions[0]!.word = 'elephant')), 'VH-V2')).toBe(true); // 부록 A 낱말과 겹침
      expect(has(vrun((d) => (d.questions[0]!.word = 'hippopotamus')), 'VH-V2')).toBe(true); // 12자
      expect(has(vrun((d) => (d.questions[0]!.clue = 'It looks like a horse with black and white lines all over.')), 'VH-V4')).toBe(true);
      expect(has(vrun((d) => (d.questions[0]!.clue = 'A zebra is a horse with lines.')), 'VH-V5')).toBe(true);
      // nervous(base nerve)의 설명에 nerve → V5b
      expect(
        vrun((d) => {
          const q = d.questions.find((x) => x.word === 'nervous')!;
          q.clue = 'You feel this when your nerve is weak.';
        }).some((e) => e.startsWith('VH-V5') && e.includes('nerve')),
      ).toBe(true);
      // 표시 없는 등급(심화) 낱말을 설명에 쓰면 VH-V6
      expect(has(vrun((d) => (d.questions[0]!.clue = 'It looks like a horse on a continent.')), 'VH-V6')).toBe(true);
      // v4b: poem의 옛 설명 "A poet writes it. It has short lines." → V5c(같은 뿌리)
      const poem = vrun((d) => {
        const q = d.questions.find((x) => x.word === 'poem')!;
        q.clue = 'A poet writes it. It has short lines.';
      });
      expect(poem.some((e) => e.startsWith('VH-V5') && e.includes('V5c') && e.includes('poet'))).toBe(true);
      // notDerived 낱말은 부록 A·D 어느 문항의 정답이어야 한다
      expect(has(vrun(() => undefined, { ...extra, notDerived: [...(extra.notDerived ?? []), 'volcano'] }), 'V5b')).toBe(true);
      // shoulder 설명에 "should"가 있어도 V5b(가짜 어근)에는 걸리지 않는다
      const sh = vrun((d) => {
        const q = d.questions.find((x) => x.word === 'shoulder')!;
        q.clue = 'You should carry a bag on it.';
      });
      // V5b·V5c는 통과("should"는 shoulder와 길이가 달라 V5c에 안 걸림). V5 자체는 ③(어간 should로 시작)이 따로 잡는다
      expect(sh.filter((e) => e.includes('(V5b)') || e.includes('(V5c)'))).toEqual([]);
      expect(sh.some((e) => e.startsWith('VH-V5') && !e.includes('(V5'))).toBe(true);
      // 중학 낱말 4개 → VH-V6
      const four = vrun((d) => (d.questions[0]!.clue = 'A wild animal with a thin coat runs among valleys.'));
      expect(four.some((e) => e.startsWith('VH-V6') && e.includes('낱말 4개'))).toBe(true);
      // 정답이 어느 목록에도 없음 → VH-V7
      expect(has(vrun((d) => (d.questions[0]!.word = 'xylophone')), 'VH-V7')).toBe(true);
      expect(has(vrun((d) => (d.questions[0]!.avoid = ['cat'])), 'VH-V8')).toBe(true);
      expect(has(vrun((d) => (d.questions = d.questions.slice(0, 80))), 'VH-V9')).toBe(true);
      // v9 VH-V10: 심화 39개(목록에서 9개를 빼 중학으로) → 심화 < 40
      const adv = extra.veryhardAdvanced ?? [];
      const few = vrun(() => undefined, { ...extra, veryhardAdvanced: adv.slice(0, 39) });
      expect(few.some((e) => e.startsWith('VH-V10') && e.includes('심화 문항 39 < 40'))).toBe(true);
      // 심화 50%(중학 12개를 심화로: 60/119 = 50.4%) → 비율 > 45%, 중학 59 < 60
      const mids = vhData.questions.filter((q) => !adv.includes(q.word)).map((q) => q.word);
      const half = vrun(() => undefined, { ...extra, veryhardAdvanced: [...adv, ...mids.slice(0, 12)] });
      expect(half.some((e) => e.startsWith('VH-V10') && e.includes('60/119') && e.includes('45%'))).toBe(true);
      expect(half.some((e) => e.startsWith('VH-V10') && e.includes('중학 문항 59 < 60'))).toBe(true);
      // 지금 데이터(48/119 = 40.3%)는 통과 — 옛 v4 기준(30%)이었다면 걸렸을 값
      expect(vrun(() => undefined).filter((e) => e.startsWith('VH-V10'))).toEqual([]);
      expect(has(vrun(() => undefined, { ...extra, veryhardAdvanced: [...(extra.veryhardAdvanced ?? []), 'volcano'] }), 'VH-V10')).toBe(true);
    });
  }, SLOW_TIMEOUT_MS);

  it('토큰·기본형 규칙(spec 7.4)', () => {
    expect(tokenize("She is your father's wife.")).toEqual(['she', 'is', 'your', 'father', 'wife']);
    expect(lemmas('running').has('run')).toBe(true);
    expect(lemmas('teachers').has('teach')).toBe(true);
    expect(lemmas('students').has('study')).toBe(true);
    expect(lemmas('flies').has('fly')).toBe(true);
    expect(lemmas('went').has('go')).toBe(true);
    expect(clueMentions('A long yellow fruit. Monkeys love it.', 'monkey')).toBe(true);
    expect(clueMentions('A long yellow fruit. Monkeys love it.', 'banana')).toBe(false);
    expect(clueMentions('Students learn here with their teachers.', 'teacher')).toBe(true);
    expect(clueMentions('A party with cake and presents, once a year.', 'birthday')).toBe(false);
  });
});
