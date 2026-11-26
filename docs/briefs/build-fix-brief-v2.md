# Build 수정 지침 v2 — N1 줄바꿈, N2 taxi 반영

작성: 2026-11-26, 코디네이터
대상: Build 서브에이전트 (Opus 5.5)

## 배경
Review 재검토(`review.md` 9절)의 새 권장 2건을 사용자가 고치기로 했다("고치기").
- **N1**: 한국어 오류 문구가 낱말 가운데서 끊김("주세" / "요."). 한국어 문단에 `word-break: keep-all`(필요하면 `overflow-wrap: anywhere`로 아주 긴 낱말 넘침 방지).
- **N2**: Plan이 spec.md 부록 A transport-06 taxi의 avoid를 `bus,subway,train`으로 고쳤다(개정 기록 "Plan 수정 v2"). `questions.json`을 부록 A에서 다시 옮긴다.

## 할 일
1. N1: `src/styles.css`에서 한국어 문구가 나오는 곳(오류·안내·일시정지·결과·시작 화면 등)에 줄바꿈 규칙. 영어 설명 띠·카드 글자에는 영향이 없어야 한다(E6 통과 유지). 화면 3종(1180×820, 820×1180, 1024×768)에서 오류 화면을 스크린샷으로 직접 열어 확인. 가능하면 오류 문구가 낱말 중간에서 끊기지 않는지 확인하는 e2e 검사(예: 각 줄 끝이 공백·문장부호 경계인지)를 E4에 더한다.
2. N2: `questions.json` 재생성, `npm run check:data`, data.test 통과.
3. `npm run check` 전부 통과.

## 수정 범위 (엄수)
- `src/**`, `tests/**`만(필요하면 `scripts/**`). `spec.md`, `CLAUDE.md`, `docs/**`, `review.md`는 고치지 않는다.
- **git 금지**(이제 저장소가 있다 — `git add`·`commit`·`stash`·`checkout` 등 모두 하지 않는다. `git status`·`git diff` 읽기만 허용).
- 임시 파일은 scratchpad `build-fix2` 폴더: `/private/tmp/claude-501/-Users-sungchul-Desktop-play2-----/7bd2217c-e14d-425c-9176-0b2e64f9c244/scratchpad/build-fix2`. 띄운 서버는 끈다.

## 보고 (한국어)
바꾼 파일:줄, 추가 테스트, `npm run check` 숫자, 스크린샷 경로, 확인하지 못한 것.
