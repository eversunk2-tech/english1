// spec 7.4: 문항 기계 검사 보고서(npm run check:data). 위반이 있으면 종료 코드 1.
// src/data/validate.ts를 Node의 TypeScript 형 지우기(type stripping)로 바로 불러 쓴다(Node 22.18+ / 24).
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateQuestions } from '../src/data/validate.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(readFileSync(join(root, 'src/data/questions.json'), 'utf8'));
const vocab = readFileSync(join(root, 'src/data/vocab/elementary-2022.txt'), 'utf8').split('\n');
const extra = JSON.parse(readFileSync(join(root, 'src/data/vocab/clue-extra.json'), 'utf8'));

const { errors, stats } = validateQuestions(data, vocab, extra);
console.log('문항 검사 (spec 7.4 V1~V9)');
console.log(`- 문항 ${stats.total}개 (3~4학년군 ${stats.band34}, 5~6학년군 ${stats.band56})`);
console.log(`- 설명 낱말 ${stats.tokens}개, 초등 어휘(합성어·감탄사·요일 포함) 비율 ${(stats.coreRatio * 100).toFixed(1)}%, secondary ${stats.secondaryTokens}개`);
if (errors.length === 0) {
  console.log('- 위반 0건');
  process.exit(0);
}
console.log(`- 위반 ${errors.length}건`);
for (const e of errors) console.log(`  ${e}`);
process.exit(1);
