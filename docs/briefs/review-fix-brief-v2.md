# Review 재검토 지침 v2 — N1·N2 수정 확인

작성: 2026-11-26, 코디네이터
대상: Review 서브에이전트 (Opus 5.5)

## 배경
Plan(spec 부록 A taxi avoid `bus,subway,train`, 개정 기록 "Plan 수정 v2")과 Build(`build-fix-brief-v2.md`: 한국어 어절 묶음 `keepWords` + `word-break: keep-all`, questions.json 재생성, E4 N1 테스트 추가)가 고쳤다고 보고했다. 지금 바뀐 것은 `git diff`(마지막 커밋 `2e9b3d1` 이후)로 볼 수 있다.

## 수정 범위
- `review.md`만. 맨 끝에 "## 10. 재검토 2 (2026-11-26)" 절을 덧붙인다(기존 내용 유지, 1절 판정 아래 한 줄 덧붙임 가능).
- 코드·spec 수정, git 쓰기(add/commit/stash/checkout 등), npm install 금지. git은 status·diff·log 읽기만.
- 임시 파일은 scratchpad `review-fix2` 폴더: `/private/tmp/claude-501/-Users-sungchul-Desktop-play2-----/7bd2217c-e14d-425c-9176-0b2e64f9c244/scratchpad/review-fix2`. 띄운 서버는 끈다.

## 확인할 것
1. `npm run check` 직접 재현.
2. `git diff`가 N1·N2 범위 밖을 건드리지 않았는지.
3. N1: 화면 3종 + 600×900에서 오류·시작·일시정지·결과·손 확인 화면을 직접 스크린샷으로 열어, 한국어가 낱말 가운데서 끊기지 않는지, 어절 묶음(nowrap) 때문에 가로 넘침·가로 스크롤이 생기지 않는지. `keepWords`가 텍스트를 innerHTML로 넣는다면 문구에 HTML 특수문자가 있을 때 안전한지(XSS·깨짐). 화면 읽기 프로그램(접근성)에 문구가 이상하게 읽히지 않는지.
4. N2: questions.json = 부록 A, taxi 문제에 bus·subway·train이 함께 나오지 않음, 오답 후보 부족 없음.
5. 회귀: 콘솔 오류 0, 외부 요청 0, E1~E7.

## 재검토 절 형식
판정(`통과`/`수정 필요`), 돌린 명령과 결과, N1·N2 확인 결과, 새 반드시 수정/권장, 사용자 결정 필요.

## 보고 (한국어, 짧게)
판정, 새 반드시 수정, 새 권장, 사용자 결정 필요.
