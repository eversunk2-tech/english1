# Embed 지침 — 느린 단위 테스트 안정화 커밋·푸시

작성: 2026-11-27, 코디네이터
대상: Embed 서브에이전트 (Sonnet)

## 배경
느린 단위 테스트 안정화(테스트만 수정) — Review 21절 **통과**(반드시 수정 0건).
**주의: 다른 서브에이전트(UI 디자인 Plan v6)가 지금 `spec.md`, `docs/design/v6/**`, `docs/briefs/plan-brief-v6-ui.md`를 고치고 있다. 이 파일들은 이번 커밋에 넣지 않는다.**

## 할 일 (프로젝트 루트 `/Users/sungchul/Desktop/play2/영어게임`, 항상 따옴표)
1. `git status` 확인. 이번 커밋에 넣을 것은 **정확히** 다음뿐: `tests/unit/bag.test.ts`, `tests/unit/questions.test.ts`, `tests/unit/data.test.ts`, `tests/unit/session.test.ts`, `review.md`, `docs/briefs/build-brief-unit-slow.md`, `docs/briefs/review-brief-unit-slow.md`, `docs/briefs/embed-brief-unit-slow.md`. `git add -A`를 쓰지 말고 이 경로만 하나씩 `git add`한다. `src/**`가 바뀌어 있으면 멈추고 보고.
2. `npm run check` 종료 코드 0 직접 확인(파이프 없이 `; echo "EXIT=$?"`). 실패면 커밋하지 말고 보고. (spec.md가 작업 중이라 data.test가 spec을 읽다 실패하면 — 그것은 디자인 쪽 변경 탓일 수 있으니 실패 내용을 그대로 보고하고 멈춘다.)
3. `git diff --cached --stat`로 넣은 파일이 위 목록뿐인지 확인 후 커밋 하나(한국어 제목 예: "느린 단위 테스트 안정화(되풀이 계산 줄이기·테스트별 시간 제한)" + 본문 몇 줄, Review 21절 통과). 메시지 끝에 빈 줄 다음 정확히:
   `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
4. `git push origin main`(강제 푸시 금지).
5. CI·"Deploy to GitHub Pages" 끝까지 기다리기(`gh run watch <id> --repo eversunk2-tech/english1 --exit-status`; API 오류면 `gh run view`). **재실행 금지** — 첫 시도 결과를 보고(실패면 원인 줄·테스트 이름). 가능하면 배포 작업의 `npm test` 단계에서 가장 느린 테스트 시간을 로그에서 뽑아 보고.
6. 배포 성공이면 사이트 200.

## 하지 않는 것
코드·문서 수정, 지정 밖 파일 커밋, 강제 푸시, 브랜치·태그, 저장소 설정 변경, CI 재실행.

## 보고 (한국어, 짧게)
커밋 해시(전체), 넣은 파일, `npm run check` 종료 코드와 숫자, 푸시, 워크플로별 첫 시도 결과(느린 테스트 시간), 배포 확인, 커밋 후 `git status`에 남은 파일.
