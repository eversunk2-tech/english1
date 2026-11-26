# Plan 수정 지침 v4b — Review 14절 Very Hard 문항 고치기

작성: 2026-11-26, 코디네이터
대상: Plan 서브에이전트 (Opus 5.5, 추론 강도 높음)

## 배경
Review 14절(v4 Very Hard) "수정 필요". 사용자 결정(2026-11-26): **"모두 고치기"** — ingredient(반드시), snack, poem(권장) 3문항.

## 할 일 (spec.md만)
1. `review.md` 14절을 읽는다.
2. 부록 D에서 세 문항의 **설명을 바꾼다**(추천 방향: 함께 나오는 같은 주제 오답이 답이 되지 않게, avoid로 막기보다 설명으로 가르기 — 같은 주제 오답 후보를 남기기 위해):
   - vh-food-07 ingredient: Review 예 "Eggs, milk, and sugar for a cake are these." 같은 범주 문장. pepper·mushroom·lemon·strawberry·snack이 답이 되지 않는지.
   - vh-food-06 snack: strawberry·lemon 등이 답이 되지 않게.
   - vh-school-03 poem: poet 같은 같은 어근 낱말 없이.
   - Very Hard 설명 규칙(VH-V1~V10, V5b)과 판 구성 흉내(같은 주제 오답 2~3장, 씨앗 수천)로 확인. 필요하면 avoid도 쓰되 오답 후보 부족 0.
3. 선택: Review가 말한 V5b 가짜 어근(busy→bus, shoulder→should)을 줄이는 규칙 보완이 간단하면 7.4에 적는다(지금 걸리는 문항은 없음). poem↔poet 같은 경우를 V5b가 잡을 수 있는지도 검토해 가능하면 규칙에 넣는다.
4. 개정 기록과 15절에 사용자 답 원문("모두 고치기")과 바꾼 표(id, 전/후, 이유)를 적는다.

## 덧붙임 (2026-11-26) — Build X7 뒤 발견
1. v4b로 세 설명이 길어져 Very Hard 7~10번 실제 평균이 4.36초 → **4.38초**가 됐다(Build 계산, 늘어나는 81/90·최대 4.95초는 그대로). 5.3.3·16.2 등 이 수치를 쓰는 곳을 직접 다시 계산해 고친다.
2. V5c가 spec 문장 그대로면 흔한 짧은 낱말(예: "this")이 thirsty·thief·thin 같은 정답과 "같은 뿌리"로 잡힌다(앞 3글자 같음, 지금 데이터는 위반 0). 기능어·흔한 낱말 제외나 길이 조건 등으로 V5c를 다듬어, poem↔poet은 여전히 잡고 this↔thirsty류는 잡지 않게 7.4를 고친다. 부록 A·D 전체에 대해 다듬은 규칙의 결과를 다시 계산(위반 0).

## 범위
spec.md만. 코드·git 쓰기 금지. 임시 스크립트는 scratchpad `plan-v4b`.

## 보고 (한국어, 짧게)
바꾼 문항 표, 규칙 변경(있으면), 검사 결과, 사용자 결정 필요(있으면).
