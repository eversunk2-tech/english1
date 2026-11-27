# Review 지침 v10 — 남은 작은 일 검증

작성: 2026-11-27, 코디네이터
대상: Review 서브에이전트 (Sonnet) — 새 서브에이전트, Build와 분리

## 배경
사용자 요청 "남은 작은 일들도 고쳐줘" → 지침 `docs/briefs/fix-brief-v10-small.md`의 S1~S4.
- Plan 보고(검증 대상, 근거 아님): spec 부록 D chin·beard avoid, 18.5 H1 문장, 5.6·18.5·18.6 "100%" → "99.7%(decade만 2장)", 17.5-3 START 자리(약 11px 아래, 판정 방식은 v9와 같음), 12.4-15 ① 두 줄 까닭(굵기 900), 개정 기록·15절. 계산: 장수 기준 기대 채움 1 − (4/48)/30 = 99.72%, avoid 앞뒤 같음.
- Build 보고: `src/data/veryhard.json:254·274` avoid, `tests/unit/questions.test.ts` 새 테스트 "Very Hard: chin과 beard는 서로의 오답 카드로 나오지 않는다". `npm run check` EXIT 0(단위 239+skip 1, e2e 183).
- 변경: `git diff`(마지막 커밋 `eb2249f` 이후).

## 범위
`review.md` 끝에 "## 24. v10 남은 작은 일 검증 (2026-11-27)" 절만(1절 판정 아래 한 줄 가능). 코드·spec 수정, git 쓰기, npm install 금지. 임시 파일은 scratchpad `review-v10`: `/private/tmp/claude-501/-Users-sungchul-Desktop-play2-----/7bd2217c-e14d-425c-9176-0b2e64f9c244/scratchpad/review-v10`. 서버는 끈다. 프로젝트 경로 한글·NFD → 따옴표.

## 확인할 것
1. `npm run check` 재현(종료 코드 직접), `git diff` 범위가 spec.md·veryhard.json·tests뿐인지.
2. S1: avoid 양방향, 새 테스트가 avoid를 빼면 실패하는지(scratchpad 사본으로 가능하면), chin·beard의 같은 주제 후보가 3개 이상 남아 오답 고르기에 문제 없는지, 다른 문항 동작이 바뀌지 않았는지.
3. S2: 99.7% 숫자를 직접(간단한 흉내든 계산이든) 확인. spec의 다른 곳에 "100%" 같은 옛 주장이 남았는지.
4. S3·S4: 문장이 review.md 23절 측정과 맞는지.

## 보고 (한국어, 짧게)
판정(`통과`/`수정 필요`), 돌린 명령과 결과, 반드시 수정(파일:줄·방향), 권장.
