# Build 수정 지침 v1 — Review v1 반영

작성: 2026-11-26, 코디네이터
대상: Build 서브에이전트 (Opus 5.5) — S1~S6을 만든 그 Build

## 1. 배경
Review v1(`review.md`) 판정은 "수정 필요"(반드시 3, 권장 13). 사용자 결정에 따라 Plan이 `spec.md`를 고쳤다(맨 위 개정 기록과 15절 참고: 부록 A 16문항, 문구, 2.3·3.1·8.2·11·12.2).
먼저 `review.md` 3·4절과 `spec.md`의 바뀐 절을 읽는다.

## 2. 할 일
**반드시**
1. **M1** 결과 화면 [다시 하기]/AGAIN → 카운트다운 중 탭 숨김 → 영영 멈춤. review.md M1의 고치는 방향대로(카운트다운 전 `endSession()`, `onHidden`·`pauseGame`에서 끝난 판 막기). 이 상황을 E2에 테스트로 추가(고치기 전 코드에서는 실패해야 하는 테스트).
2. **M2** `window.__eg.config`로 규칙 값 변경 가능. 훅에서 빼거나 복사본만 넘기고, `config.ts` 상수를 깊게 `Object.freeze`. "훅으로 규칙을 바꿀 수 없다"는 테스트 추가.
3. **문항 반영(M3)**: `src/data/questions.json`을 새 부록 A와 글자 그대로 같게(스크립트로 옮기기). `data.test.ts`의 부록 A 비교가 통과해야 한다.
4. **문구**: spec 6.2·8.2대로. 오류 화면 제목을 모든 오류 공통 "시작하지 못했어요"로(R4 해결). 확정된 3개 문구가 spec 글자와 같은지 확인.

**권장(이번에 함께)**
5. R1 `?clock=manual`은 `?test=1`일 때만(spec 11·12.2).
6. R3 카메라 트랙 `ended`(우리가 끄지 않았는데) → 오류 화면 busy, [다시 시도]는 카메라만 다시 열고 모델은 다시 받지 않음(spec 3.1·8.2). 가능하면 E4에 테스트.
7. R5 `package.json` `engines.node` `>=22.18`(spec 2.3).
8. R6 tsconfig를 브라우저 코드(`src/`, Node 타입 없음)와 테스트·설정·스크립트용으로 나눈다. `npm run typecheck`가 둘 다 검사하게.
9. R7 `cardFontSize`/`measureText` 결과를 단어·카드 크기별로 저장해 다시 쓰기.
10. R9 `serve-dist.mjs` 잘못된 `%` 인코딩 → 400.
11. R11 `pagehide`에서 `dispose()`(HandLandmarker `close()`, 카메라 정지) 부르기 — 단 networkGuard가 `close()` 때 통계 전송도 막는지 확인.
12. R12 E3 거울 확인 기대값을 저장소 `mapToScreen` 대신 spec 3.3 식으로 테스트 안에서 따로 계산.
13. R13 CI 트리거를 `main` push + pull_request로(같은 커밋 두 번 방지).
- R2는 M1로 해결되는지 확인만. R10은 하지 않는다.

## 덧붙임 (2026-11-26)
- 사용자 결정으로 Plan이 부록 A의 time-09 tomorrow 설명을 "Today is Monday, so Tuesday will be this."로 바꾸는 중이다. `questions.json`은 **마지막에 spec.md 부록 A에서 다시 옮겨** 이 변경까지 반영한다(부록 A 비교 테스트로 확인). 코디네이터가 Plan 완료를 따로 알려 준다.

## 3. 수정 범위 (엄수)
- 지난 지침(`build-brief-v1.md`) 2절과 같다: 코드·테스트·설정·워크플로·scripts·public. `spec.md`, `CLAUDE.md`, `docs/briefs/**`, `review.md`는 고치지 않는다. git 금지.
- 임시 파일은 scratchpad: `/private/tmp/claude-501/-Users-sungchul-Desktop-play2-----/7bd2217c-e14d-425c-9176-0b2e64f9c244/scratchpad/build-fix`
- 띄운 서버는 끝나면 끈다.

## 4. 보고 (최종 메시지, 한국어)
- 항목별(1~13) 한 일, 파일:줄, 추가한 테스트 이름
- 마지막 `npm run check` 결과 숫자(단위 통과/실패/건너뜀, check:data, e2e 프로젝트별)
- spec과 다르게 한 것, 사용자 결정 필요, 확인하지 못한 것
