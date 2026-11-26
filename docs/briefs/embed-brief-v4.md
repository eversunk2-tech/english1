# Embed 지침 v4 — 5~6학년 단어 수준(v3·v3b) 커밋·푸시

작성: 2026-11-26, 코디네이터
대상: Embed 서브에이전트 (Sonnet)

## 배경
v3(5~6학년 단어 230문항)와 v3b 수정이 Review 13절 재검토 **통과**(반드시 수정 0건). spec.md에는 v4(Very Hard, **사용자 승인 전**) 계획 절(16절, 14.3, 부록 D·E)도 들어 있다 — 계획 문서이고 "승인 전"으로 표시돼 있으므로 그대로 함께 커밋한다(코드·데이터에는 v4가 없다).

## 할 일 (프로젝트 루트 `/Users/sungchul/Desktop/play2/영어게임`, 항상 따옴표)
1. `git status`로 바뀐 파일 확인. 예상: `spec.md`, `review.md`, `src/data/questions.json`, `src/data/vocab/clue-extra.json`, `src/data/validate.ts`, `src/data/words.ts`, `src/ui/hud.ts`, `src/ui/screens.ts`, `src/ui/strings.ts`, `scripts/check-data.mjs`, `tests/**`, `docs/briefs/*`. 비밀값·예상 밖 큰 파일이 있으면 멈추고 보고.
2. `npm run check`를 돌려 **종료 코드 0**을 직접 확인한다(`; echo "EXIT=$?"`처럼 종료 코드를 출력). 실패면 커밋하지 말고 보고.
3. 커밋 하나(한국어 제목 예: "5~6학년 단어 수준 높이기(230문항)" + 본문 몇 줄: 5~6학년 87문항·중학 ** 18%, 문항 6개 수정, 점수 숫자 겹침, Review 12·13절 통과). 메시지 끝에 빈 줄 다음 정확히:
   `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
4. `git push origin main`(강제 푸시 금지).
5. CI·"Deploy to GitHub Pages"가 끝날 때까지 기다린다(`gh run watch <id> --repo eversunk2-tech/english1 --exit-status`). 실패면 `--log-failed` 원인 줄 보고.
6. 배포 성공이면 `https://eversunk2-tech.github.io/english1/` 200, HTML의 JS 파일 이름이 로컬 `dist/`와 같은지, 배포된 JS에 새 낱말(예: `museum`)이 있는지 확인.

## 하지 않는 것
코드·문서 수정, 강제 푸시, 브랜치·태그, 저장소 설정 변경.

## 보고 (한국어)
커밋 해시(전체), 파일 수, `npm run check` 종료 코드와 숫자, 푸시, 워크플로별 결과, 배포 확인.
