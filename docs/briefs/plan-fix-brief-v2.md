# Plan 수정 지침 v2 — taxi 오답 짝(N2)

작성: 2026-11-26, 코디네이터
대상: Plan 서브에이전트 (Opus 5.5, 추론 강도 높음)

## 배경
Review 재검토(`review.md` 9절)의 새 권장 N2: taxi 문제(transport-06, "A car with a driver. You pay to ride it.")에 subway·train이 16~20% 함께 나와 헷갈릴 수 있다. N1(한국어 줄바꿈)은 코드만 고치면 되므로 Plan 몫이 아니다.
사용자 결정(2026-11-26): 남은 권장 2건을 고친다(사용자 답 원문: "고치기"). 방법은 코디네이터가 Review의 첫 번째 안을 골랐다: **설명은 그대로 두고 avoid에 `subway, train`을 더한다**.

## 수정 범위
- `/Users/sungchul/Desktop/play2/영어게임/spec.md` 하나만. 임시 스크립트는 scratchpad `plan-fix2` 폴더.

## 할 일
1. 부록 A transport-06 taxi의 avoid를 `bus,subway,train`으로.
2. V1~V9 재검사, 판 구성 흉내(학년군별 씨앗 5,000개)로 taxi 문제의 오답 후보가 모자라지 않은지(같은 주제 오답 수 5.3 규칙), 남은 오답이 답이 되지 않는지 확인.
3. 개정 기록·15절에 사용자 결정 원문과 코디네이터 선택을 나눠 적는다.

## 보고 (한국어, 짧게)
바꾼 줄 전/후, 검사 결과, 사용자 결정 필요(있으면).
