import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import questionsJson from '../../src/data/questions.json';
import extraJson from '../../src/data/vocab/clue-extra.json';
import { validateQuestions, type ClueExtra } from '../../src/data/validate.ts';
import { clueMentions, lemmas, tokenize } from '../../src/data/words.ts';
import type { Question, QuestionsFile } from '../../src/game/types.ts';

const root = resolve(__dirname, '..', '..');
const data = questionsJson as QuestionsFile;
const extra = extraJson as ClueExtra;
const vocab = readFileSync(resolve(root, 'src/data/vocab/elementary-2022.txt'), 'utf8').split('\n');
const spec = readFileSync(resolve(root, 'spec.md'), 'utf8');

/** spec.md 부록 A 표를 직접 읽는다 */
function specRows(): string[][] {
  const a = spec.indexOf('## 부록 A.');
  const b = spec.indexOf('## 부록 B.');
  return spec
    .slice(a, b)
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

describe('data (spec 7)', () => {
  it('validate.ts V1~V9 위반 0', () => {
    const r = validateQuestions(data, vocab, extra);
    expect(r.errors).toEqual([]);
    expect(r.stats.total).toBe(161);
    expect(r.stats.band34).toBe(84);
    expect(r.stats.band56).toBe(77);
    expect(r.stats.coreRatio).toBeGreaterThanOrEqual(0.95);
  });

  it('부록 A 표와 questions.json이 모든 칸에서 같다(161문항)', () => {
    const rows = specRows();
    expect(rows.length).toBe(161);
    expect(data.questions.length).toBe(161);
    expect(data.version).toBe(1);
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
    const b = spec.indexOf('## 부록 B.');
    const c = spec.indexOf('## 부록 C.');
    const line = spec
      .slice(b, c)
      .split('\n')
      .find((l) => l.startsWith('a, about,'))!;
    const words = line.split(',').map((s) => s.trim()).filter(Boolean);
    expect(words.length).toBe(819);
    expect(vocab.filter((l) => l.length > 0)).toEqual(words);
  });

  it('clue-extra.json이 spec 7.3과 같다', () => {
    expect(extra.secondary).toEqual(['pet', 'wing', 'ride', 'bug', 'honey', 'round', 'lay', 'sweet', 'lot', 'person', 'through', 'plant', 'other', 'wheel', 'string', 'shoot', 'net', 'once']);
    expect(extra.interjection).toEqual(['meow', 'woof', 'oink', 'quack']);
    expect(extra.proper).toEqual(['monday', 'tuesday', 'saturday', 'sunday']);
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
      const errs = withQuestion((q) => (q.clue = 'It is a very big animal and it can run fast.'), 10);
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
    it('V6 목록 밖 낱말', () => expect(has(withQuestion((q) => (q.clue = 'A small feline. It says meow.')), 'V6')).toBe(true));
    it('V6 secondary 3개', () => expect(has(withQuestion((q) => (q.clue = 'A pet bug with honey.')), 'V6')).toBe(true));
    it('V7 정답이 목록에 없음', () => expect(has(withQuestion((q) => (q.word = 'zebra')), 'V7')).toBe(true));
    it('V8 avoid가 문항에 없음', () => expect(has(withQuestion((q) => (q.avoid = ['unicorn'])), 'V8')).toBe(true));
    it('V9 문항 수 부족', () => {
      const d = clone();
      d.questions = d.questions.slice(0, 60);
      const errs = validateQuestions(d, vocab, extra).errors;
      expect(has(errs, 'V9')).toBe(true);
    });
  });

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
