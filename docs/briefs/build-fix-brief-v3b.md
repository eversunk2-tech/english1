# Build 수정 지침 v3b — W4 + 점수 숫자 겹침

작성: 2026-11-26, 코디네이터
대상: Build 서브에이전트 (Opus 5.5)

## 배경
Review 12절 "수정 필요" → 사용자 "모두 고치기". Plan이 spec을 고쳤다(개정 기록·15절·13절 W4·7.3·7.4 V5 보완·7.6.5).

## 할 일
1. **W4**(spec 13절): `questions.json`을 부록 A에서 다시 옮기기(6문항: forest, coat, hero, lazy, office, fever) + `source` 문구(spec 7.3·7.6.5), `validate.ts` V5 보완(spec 7.4 — V5에서만 "정답 안의 낱말" 규칙을 실제 낱말로 한정, 오답 고르기 규칙은 그대로), data.test에 V5 보완 테스트(spec이 말한 2개: fever/very 같은 가짜 걸림은 통과, birthday⊃day 같은 진짜는 위반).
2. **Review 12절 권장 — 점수 숫자 겹침**: 정답·감점 때 떠오르는 "+점수"/"−20"이 설명 띠 글자 위에 0.8초 겹치지 않게(예: 떠오르는 범위를 놀이 영역 안으로 제한). 화면 4종 스크린샷으로 직접 확인. 가능하면 e2e에 겹치지 않음 확인 추가.
3. `npm run check` 전부 통과.

## 범위 (엄수)
`src/**`, `tests/**`, 필요하면 `scripts/**`. spec·docs·review.md 수정, git 쓰기, npm install 금지. 임시 파일은 scratchpad `build-v3b`. 서버는 끈다.

## 보고 (한국어)
항목별 파일:줄, `npm run check` 숫자, 스크린샷 경로, spec과 다르게 한 것, 사용자 결정 필요.
