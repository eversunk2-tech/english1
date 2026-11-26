# Embed 지침 — E4 간헐 실패 안정화 커밋·푸시

작성: 2026-11-26, 코디네이터
대상: Embed 서브에이전트 (Sonnet)

## 배경
E4 카메라 테스트 간헐 실패 안정화(테스트만 수정) — Review 18절 **통과**(반드시 수정 0건).

## 할 일 (프로젝트 루트 `/Users/sungchul/Desktop/play2/영어게임`, 항상 따옴표)
1. `git status` 확인. 예상: `tests/e2e/helpers.ts`, `tests/e2e/e1-load.spec.ts`, `tests/e2e/e4-camera-errors.spec.ts`, `tests/e2e/e5-mediapipe.spec.ts`, `review.md`, `docs/briefs/*e4*`(3개). `src/**`·`spec.md`는 바뀌지 않았어야 한다. 예상 밖 파일·비밀값이 있으면 멈추고 보고.
2. `npm run check` 종료 코드 0 직접 확인(`; echo "EXIT=$?"`). 실패면 커밋하지 말고 보고.
3. 커밋 하나(한국어 제목 예: "카메라 테스트(E1·E4·E5) 느린 CI에서 간헐 실패 안정화" + 본문 몇 줄: 원인(느린 러너에서 검사 1회 1~3초), 영상 재생 확인·검사 수 기반 시간 제한, Review 18절 통과). 메시지 끝에 빈 줄 다음 정확히:
   `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
4. `git push origin main`(강제 푸시 금지).
5. 이 커밋의 CI와 "Deploy to GitHub Pages"가 끝날 때까지 기다린다(`gh run watch <id> --repo eversunk2-tech/english1 --exit-status`; API 오류면 `gh run view`). **CI는 재실행하지 않는다** — 실패하면 `--log-failed` 원인 줄과 실패한 테스트 이름을 보고한다(이번 수정의 효과를 보려는 것이므로 첫 시도 결과가 중요).
6. 배포 성공이면 사이트 200 확인.

## 하지 않는 것
코드·문서 수정, 강제 푸시, 브랜치·태그, 저장소 설정 변경, CI 재실행.

## 보고 (한국어, 짧게)
커밋 해시(전체), 파일 수, `npm run check` 종료 코드와 숫자, 푸시, 워크플로별 첫 시도 결과(E4 소요 시간 포함하면 좋음), 배포 확인.
