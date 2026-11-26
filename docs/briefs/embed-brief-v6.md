# Embed 지침 v6 — 영어 목소리 고르기(v5) 커밋·푸시

작성: 2026-11-26, 코디네이터
대상: Embed 서브에이전트 (Sonnet)

## 배경
v5(영어 읽어 주기가 장난용 "Albert" 대신 자연스러운 목소리를 고름) Review 16절 **통과**(반드시 수정 0건).

## 할 일 (프로젝트 루트 `/Users/sungchul/Desktop/play2/영어게임`, 항상 따옴표)
1. `git status`로 바뀐 파일 확인. 예상: `spec.md`, `review.md`, `src/audio/voicePick.ts`(새), `src/audio/speech.ts`, `src/debug/debugOverlay.ts`, `src/debug/testHooks.ts`, `src/app/App.ts`, `tests/unit/voicePick.test.ts`·`speech.test.ts`(새), `tests/e2e/e9-voice.spec.ts`(새), `tests/helpers/voices.ts`(새), `docs/briefs/*`. `src/data/*`는 바뀌지 않았어야 한다. 비밀값·예상 밖 큰 파일이 있으면 멈추고 보고.
2. `npm run check` 종료 코드 0 직접 확인(`; echo "EXIT=$?"`). 실패면 커밋하지 말고 보고.
3. 커밋 하나(한국어 제목 예: "영어 읽어 주기 목소리 고르기 고침(Albert → Samantha 등)" + 본문 몇 줄, Review 16절 통과). 메시지 끝에 빈 줄 다음 정확히:
   `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
4. `git push origin main`(강제 푸시 금지).
5. CI·"Deploy to GitHub Pages" 끝까지 기다리기(`gh run watch <id> --repo eversunk2-tech/english1 --exit-status`; API 오류면 `gh run view`). 실패면 원인 줄 보고.
6. 배포 성공이면 사이트 200, HTML의 JS 이름이 로컬 `dist/`와 같은지, 배포된 JS에 `Samantha`와 `Zarvox`(제외 목록)가 들어 있는지 확인.

## 하지 않는 것
코드·문서 수정, 강제 푸시, 브랜치·태그, 저장소 설정 변경.

## 보고 (한국어)
커밋 해시(전체), 파일 수, `npm run check` 종료 코드와 숫자, 푸시, 워크플로별 결과, 배포 확인.
