# Embed 지침 v8 — 섞은 카드 더미 커밋·푸시

작성: 2026-11-26, 코디네이터
대상: Embed 서브에이전트 (Sonnet)

## 배경
v8(문제를 모두 한 번씩 낸 뒤 반복하는 섞은 카드 더미, `?seed=`는 `?test=1`일 때만) Review 19절 **통과**(반드시 수정 0건).

## 할 일 (프로젝트 루트 `/Users/sungchul/Desktop/play2/영어게임`, 항상 따옴표)
1. `git status` 확인. 예상: `spec.md`, `review.md`, `src/config.ts`, `src/game/bag.ts`(새), `src/game/questions.ts`, `src/data/validate.ts`, `src/app/params.ts`, `src/app/App.ts`, `src/platform/bagStore.ts`(새), `src/platform/storage.ts`, `src/debug/testHooks.ts`, `src/debug/debugOverlay.ts`, `tests/**`, `docs/briefs/*v8*`. `src/data/*.json`은 바뀌지 않았어야 한다. 예상 밖 파일·비밀값이 있으면 멈추고 보고.
2. `npm run check` 종료 코드 0 직접 확인(`; echo "EXIT=$?"`). 실패면 커밋하지 말고 보고.
3. 커밋 하나(한국어 제목 예: "문제를 모두 한 번씩 낸 뒤 반복(섞은 카드 더미), seed는 테스트 모드에서만" + 본문 몇 줄, Review 19절 통과). 메시지 끝에 빈 줄 다음 정확히:
   `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
4. `git push origin main`(강제 푸시 금지).
5. CI·"Deploy to GitHub Pages" 끝까지 기다리기(`gh run watch <id> --repo eversunk2-tech/english1 --exit-status`; API 오류면 `gh run view`). **CI 재실행 금지** — 실패하면 원인 줄과 테스트 이름 보고.
6. 배포 성공이면 사이트 200, HTML의 JS 이름이 로컬 `dist/`와 같은지, 배포된 JS에 `catchword.bag`가 있는지 확인.

## 하지 않는 것
코드·문서 수정, 강제 푸시, 브랜치·태그, 저장소 설정 변경, CI 재실행.

## 보고 (한국어, 짧게)
커밋 해시(전체), 파일 수, `npm run check` 종료 코드와 숫자, 푸시, 워크플로별 첫 시도 결과, 배포 확인.
