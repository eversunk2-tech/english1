// spec 7.4·7.6.5·16.4: 문항 기계 검사 보고서(npm run check:data). 부록 A 문항과 Very Hard 문항 중 하나라도 위반이 있으면 종료 코드 1.
// src/data/validate.ts를 Node의 TypeScript 형 지우기(type stripping)로 바로 불러 쓴다(Node 22.18+ / 24).
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateQuestions, validateVeryHard } from '../src/data/validate.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
/** @param {string} p */
const read = (p) => readFileSync(join(root, p), 'utf8');
const data = JSON.parse(read('src/data/questions.json'));
const vh = JSON.parse(read('src/data/veryhard.json'));
const vocab = read('src/data/vocab/elementary-2022.txt').split('\n');
const secondary = read('src/data/vocab/secondary-2022.txt').split('\n');
const extra = JSON.parse(read('src/data/vocab/clue-extra.json'));

/** @param {number} x */
const pct = (x) => `${(x * 100).toFixed(1)}%`;
let failed = false;

// v9: 부록 D를 함께 넘겨 Normal·Hard의 한 단계 위(중학) 문항까지 판 구성 흉내(V9)에 넣는다
const { errors, stats } = validateQuestions(data, vocab, extra, vh);
console.log("문항 검사 (spec 7.4 V1~V9·V5b·V5c, 7.6.5 V7'·V10)");
console.log(`- 문항 ${stats.total}개 (3~4학년군 ${stats.band34}, 5~6학년군 ${stats.band56})`);
console.log(
  `- 5~6학년군 정답 중 중학 권장(**) 낱말 ${stats.answerSecondaryCount}/${stats.band56}개 = ${pct(stats.answerSecondaryRatio)} (기준 20% 이하, V10)`,
);
console.log(`- 설명 낱말 ${stats.tokens}개, 초등 어휘(합성어·감탄사·요일 포함) 비율 ${pct(stats.coreRatio)}, secondary ${stats.secondaryTokens}개`);
if (errors.length === 0) console.log('- 위반 0건');
else {
  failed = true;
  console.log(`- 위반 ${errors.length}건`);
  for (const e of errors) console.log(`  ${e}`);
}

const r = validateVeryHard(vh, data, vocab, secondary, extra);
console.log('');
console.log('Very Hard 문항 검사 (spec 16.4 VH-V1~V10, V5b·V5c 포함)');
console.log(`- 문항 ${r.stats.total}개, 주제 ${Object.keys(r.stats.topics).length}개`);
console.log(`- Very Hard: 중학 ${r.stats.midCount} · 심화 ${r.stats.advancedCount}(${pct(r.stats.advancedRatio)}) (기준 심화 ≥ 40·중학 ≥ 60·심화 ≤ 45%, VH-V10 v9)`);
console.log(
  `- 설명 낱말 ${r.stats.tokens}개: 초등 ${pct(r.stats.elementaryRatio)}, 중학 ${pct(r.stats.secondaryRatio)}, 허용 ${pct(r.stats.allowedRatio)}, 설명당 중학 낱말 최대 ${r.stats.maxSecondaryInClue}개`,
);
if (r.errors.length === 0) console.log('- 위반 0건');
else {
  failed = true;
  console.log(`- 위반 ${r.errors.length}건`);
  for (const e of r.errors) console.log(`  ${e}`);
}
process.exit(failed ? 1 : 0);
