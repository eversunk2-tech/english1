# Build 수정 지침 v4b — X7 (Very Hard 3문항, V5b 예외, V5c)

작성: 2026-11-26, 코디네이터
대상: Build 서브에이전트 (Opus 5.5)

## 배경
Review 14절 수정 → 사용자 "모두 고치기". Plan이 spec을 고쳤다: 부록 D ingredient·snack·poem 설명, 7.4 V5b 예외(`notDerived`)와 V5c(새), 16.4, 16.8 X7, 15절.

## 할 일 (spec 16.8 X7)
1. `veryhard.json`을 부록 D에서 다시 옮기기(3문항 설명).
2. `clue-extra.json`에 `notDerived`(spec 그대로).
3. `validate.ts`: V5b 예외, V5c(spec 7.4 문장 그대로 — 검사 전용, 오답 고르기 불변, 부록 A·Very Hard 둘 다). 테스트 예시(spec이 말한 3개 이상: 옛 poem 설명은 V5c 실패, airport↔airplanes 같은 것은 통과, busy/shoulder는 V5b에서 걸리지 않음).
4. `npm run check` 전부 통과(종료 코드 0 직접 확인).

## 덧붙임 (2026-11-26)
- Plan이 spec을 고쳤다: Very Hard 7~10번 평균 4.38초(4~6번 4.42초) — `difficulty.test`의 ±0.03 허용을 없애고 spec 수치와 정확히 맞추기. 7.4 V5c를 다듬음(길이 같고 4자 이상, 마지막 한 글자만 다름, 초등 목록 아님, 기능어 21개 제외) — `words.ts`·`validate.ts`를 spec 문장대로 고치고 X7 테스트 예시 4개(thirsty + this → 통과 포함). 이전 테스트를 좁혔던 곳(thirsty V5만, busy/shoulder V5b만)은 가능하면 다시 전체 검사로 넓힌다.

## 범위 (엄수)
`src/**`, `tests/**`, 필요하면 `scripts/**`. spec·docs·review.md 수정, git 쓰기, npm install 금지. 임시 파일은 scratchpad `build-v4b`. 서버는 끈다.

## 보고 (한국어, 짧게)
파일:줄, 추가 테스트, `npm run check` 숫자, spec과 다르게 한 것.
