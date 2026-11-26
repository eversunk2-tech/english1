# Review 재검토 지침 v3b — Review 12절 수정 확인

작성: 2026-11-26, 코디네이터
대상: Review 서브에이전트 (Opus 5.5)

## 배경
Review 12절(v3) "수정 필요" → 사용자 "모두 고치기". Plan이 spec을 고쳤고(부록 A 6문항, 7.3·7.4 V5 보완·7.6.5 source, 13절 W4, 15절), Build가 W4(questions.json·source·V5 보완·data.test)와 점수 숫자 겹침(hud.ts, e2e)을 고쳤다고 보고했다(npm run check 통과, 단위 148, e2e 102).

## 범위
`review.md`만 — 끝에 "## 13. 재검토 v3b (2026-11-26)" 절(1절 판정 아래 한 줄 가능). 코드·spec 수정, git 쓰기, npm install 금지. 임시 파일은 scratchpad `review-v3b`. 서버는 끈다.

## 확인할 것
1. `npm run check` 재현, `git diff`(마지막 커밋 `0b6cfc7` 이후 — v3 전체가 아직 커밋 전이다) 중 이번 수정분이 범위 안인지.
2. 6문항: questions.json = 부록 A, 지난 지적(forest↔mountain 반드시, coat·hero·lazy·office·fever 권장)이 해결됐는지 판 구성 흉내로. Plan이 스스로 더한 coat↔belt, lazy↔sad와 새 coat 설명("We wear it over our clothes in winter.")이 타당한지, coat 문제에 함께 나오는 shoes·socks·pants·dress가 정말 답이 안 되는지.
3. V5 보완: spec 7.4 문장대로인지, 진짜 노출(birthday⊃day 등)은 여전히 잡는지, 가짜(fever⊃ver)는 통과하는지, 오답 고르기 규칙이 그대로인지(판 구성 불변) — 230문항 전체에 대해 보완 전후 V5 결과 차이를 직접 계산.
4. 점수 숫자: 화면 4종에서 정답·감점 숫자가 설명 띠 글자에 겹치지 않는지 스크린샷 직접 확인. 감점 숫자도 같은지(e2e는 정답 숫자만 본다고 함).
5. Build가 언급한 "Try again!" 색 변화가 문제인지 판단(권장 여부만).
6. 회귀: 콘솔 오류 0, 외부 요청 0, 지난 12절의 다른 결론(난이도 상승 표, fallMs 독립 계산)이 여전히 맞는지.

## 절 형식 / 보고 (한국어, 짧게)
판정(`통과`/`수정 필요`), 지난 지적별 결과 표, 새 반드시/권장, 사용자 결정 필요.
