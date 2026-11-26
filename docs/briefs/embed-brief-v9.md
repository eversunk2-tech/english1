# Embed 지침 v9 — Easy 빼고 난이도 올리기 커밋·푸시

작성: 2026-11-27, 코디네이터
대상: Embed 서브에이전트 (Sonnet)

## 배경
v9(Normal/Hard/Very Hard 더 빠르게, 한 단계 위 단어 섞기, 같은 주제 오답 +1, Very Hard 119문항, 최고 점수 새 칸) Review 20절 **통과**(반드시 수정 0건).

## 할 일 (프로젝트 루트 `/Users/sungchul/Desktop/play2/영어게임`, 항상 따옴표)
1. `git status` 확인. 예상: `spec.md`, `review.md`, `src/**`(config, game/difficulty·bag·questions·session 등, data/veryhard.json·vocab/clue-extra.json·validate.ts, platform/storage·bagStore, app/App, ui/strings·screens, debug/*), `scripts/check-data.mjs`, `tests/**`, `docs/briefs/*v9*`. `src/data/questions.json`은 바뀌지 않았어야 한다. 예상 밖 파일·비밀값이 있으면 멈추고 보고.
2. `npm run check` 종료 코드 0 직접 확인(파이프 없이 `; echo "EXIT=$?"`). 실패면 커밋하지 말고 보고.
3. 커밋 하나(한국어 제목 예: "Normal·Hard·Very Hard 난이도 올리기(빠르기·한 단계 위 단어)" + 본문 몇 줄, Review 20절 통과). 메시지 끝에 빈 줄 다음 정확히:
   `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
4. `git push origin main`(강제 푸시 금지).
5. CI·"Deploy to GitHub Pages" 끝까지 기다리기(`gh run watch <id> --repo eversunk2-tech/english1 --exit-status`; API 오류면 `gh run view`). **CI 재실행 금지** — 실패하면 원인 줄과 테스트 이름 보고.
6. 배포 성공이면 사이트 200, HTML의 JS 이름이 로컬 `dist/`와 같은지, 배포된 JS에 `catchword.best.v9`와 새 낱말(예: `geography`)이 있는지 확인.

## 하지 않는 것
코드·문서 수정, 강제 푸시, 브랜치·태그, 저장소 설정 변경, CI 재실행.

## 보고 (한국어, 짧게)
커밋 해시(전체), 파일 수, `npm run check` 종료 코드와 숫자, 푸시, 워크플로별 첫 시도 결과, 배포 확인.
