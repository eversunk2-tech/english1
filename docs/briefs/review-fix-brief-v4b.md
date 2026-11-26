# Review 재검토 지침 v4b — Review 14절 수정 확인

작성: 2026-11-26, 코디네이터
대상: Review 서브에이전트 (Opus 5.5)

## 배경
14절(v4 Very Hard) "수정 필요" → 사용자 "모두 고치기". Plan이 spec을 고쳤다(부록 D ingredient·snack·poem 설명, 7.4 V5b 예외 `notDerived`, V5c 새 규칙과 그 다듬기, Very Hard 평균 4.38/4.42초, 16.1·16.2·16.4·16.8 X7, 15절). Build가 X7과 덧붙임을 반영했다(npm run check 통과 보고, 단위 163, e2e 108).

## 범위
`review.md`만 — 끝에 "## 15. 재검토 v4b (2026-11-26)" 절(1절 판정 아래 한 줄 가능). 코드·spec 수정, git 쓰기, npm install 금지. 임시 파일은 scratchpad `review-v4b`. 서버는 끈다.

## 확인할 것
1. `npm run check` 재현(종료 코드), `git diff`(마지막 커밋 `370b2b9` 이후 — v4 전체가 아직 커밋 전) 중 이번 수정분이 범위 안인지.
2. 세 문항: `veryhard.json` = 부록 D, 함께 나오는 같은 주제 오답(pepper·mushroom·lemon·strawberry·cookie 등)이 새 설명으로 정말 답이 안 되는지(판 구성 흉내), 새 설명이 자연스러운 영어인지. snack 설명의 "chips", ingredient의 "Eggs, milk, sugar"가 Very Hard 풀의 다른 정답과 겹쳐 노출·혼동을 만들지 않는지.
3. V5b 예외·V5c: spec 7.4 문장대로 독립 계산해 부록 A·D 전체 결과가 코드와 같은지, poem↔poet은 잡고 this↔thirsty·airport↔airplanes 등은 안 잡는지, 오답 고르기·판 구성 불변.
4. 떨어지는 시간 독립 계산(Very Hard 4.38/4.42초 등)이 spec·코드와 같은지, 최소 시간 보장.
5. 회귀: 14절의 다른 결론(점수, 화면 4종, 저장 키, 극악 아님)이 여전히 맞는지 — 필요한 만큼 다시 확인. 콘솔 오류 0, 외부 요청 0.

## 보고 (한국어, 짧게)
판정(`통과`/`수정 필요`), 지난 지적별 결과, 새 반드시/권장, 사용자 결정 필요.
