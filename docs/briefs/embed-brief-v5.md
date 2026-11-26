# Embed 지침 v5 — Very Hard + 전체 빠르기(v4·v4b) 커밋·푸시

작성: 2026-11-26, 코디네이터
대상: Embed 서브에이전트 (Sonnet)

## 배경
v4(Very Hard 94문항, E/N/H 빠르게, scientist·V5b)와 v4b 수정이 Review 15절 재검토 **통과**(반드시 수정 0건).

## 할 일 (프로젝트 루트 `/Users/sungchul/Desktop/play2/영어게임`, 항상 따옴표)
1. `git status`로 바뀐 파일 확인. 예상: `spec.md`, `review.md`, `src/config.ts`, `src/data/*`(questions.json, veryhard.json 새, vocab/secondary-2022.txt 새, vocab/clue-extra.json, validate.ts, words.ts), `src/game/*`, `src/app/*`, `src/platform/storage.ts`, `src/ui/*`, `src/styles.css`, `scripts/check-data.mjs`, `tests/**`, `docs/briefs/*`. 비밀값·예상 밖 큰 파일이 있으면 멈추고 보고.
2. `npm run check`를 돌려 **종료 코드 0**을 직접 확인(`; echo "EXIT=$?"`). 실패면 커밋하지 말고 보고.
3. 커밋 하나(한국어 제목 예: "Very Hard 모드 추가, 전체 빠르기 올리기" + 본문 몇 줄: Very Hard 94문항(중학·심화)·×2.0·−40·5.0/4.0/3.5초, E/N/H 0.5초씩 빠르게 + 읽기 계수, scientist·V5b·V5c, Review 14·15절 통과). 메시지 끝에 빈 줄 다음 정확히:
   `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
4. `git push origin main`(강제 푸시 금지).
5. CI·"Deploy to GitHub Pages"가 끝날 때까지 기다린다(`gh run watch <id> --repo eversunk2-tech/english1 --exit-status`; API 오류면 `gh run view`로 다시). 실패면 `--log-failed` 원인 줄 보고.
6. 배포 성공이면 `https://eversunk2-tech.github.io/english1/` 200, HTML의 JS 파일 이름이 로컬 `dist/`와 같은지, 배포된 JS에 `Very Hard`와 Very Hard 낱말(예: `anniversary`)이 있는지 확인.

## 하지 않는 것
코드·문서 수정, 강제 푸시, 브랜치·태그, 저장소 설정 변경.

## 보고 (한국어)
커밋 해시(전체), 파일 수, `npm run check` 종료 코드와 숫자, 푸시, 워크플로별 결과, 배포 확인.
