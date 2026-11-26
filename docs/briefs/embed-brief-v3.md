# Embed 지침 v3 — 난이도·오답 감점(v2) 커밋·푸시

작성: 2026-11-26, 코디네이터
대상: Embed 서브에이전트 (Sonnet)

## 배경
v2(난이도 Easy/Normal/Hard + 오답 감점) Review 판정 **통과**(`review.md` 11절, 반드시 수정 0건). `main`에 푸시하면 GitHub Pages에 자동 배포된다.
spec.md에는 v3(5~6학년 단어, **사용자 승인 전**) 계획 절도 들어 있다 — 계획 문서이고 "승인 전"으로 표시돼 있으므로 그대로 함께 커밋한다(코드·데이터에는 v3가 없다).

## 할 일 (프로젝트 루트 `/Users/sungchul/Desktop/play2/영어게임`, 항상 따옴표)
1. `git status`로 바뀐 파일 확인. 예상: `spec.md`, `review.md`, `src/**`(config, difficulty.ts 새 파일, scoring, questions, session, storage, params, App, hud, screens, strings, styles, validate, testHooks 등), `tests/**`(difficulty·storage 단위, e8 e2e 새 파일, 기존 테스트 수정), `docs/briefs/*`(v2·v3 지침들). `src/data/questions.json`은 **바뀌지 않았어야 한다** — 바뀌었으면 멈추고 보고. 비밀값·예상 밖 큰 파일이 있으면 멈추고 보고.
2. 커밋 전에 `npm run check`를 한 번 돌려 통과를 확인한다(실패면 커밋하지 말고 보고).
3. 커밋 하나(한국어 제목 예: "난이도 Easy/Normal/Hard와 오답 감점 추가" + 본문 몇 줄, Review 11절 통과). 메시지 끝에 빈 줄 다음 정확히:
   `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
4. `git push origin main`(강제 푸시 금지).
5. 이 커밋의 CI·"Deploy to GitHub Pages"가 끝날 때까지 기다린다(`gh run watch <id> --repo eversunk2-tech/english1 --exit-status`). 실패면 `--log-failed` 원인 줄 보고(고치지 않음).
6. 배포 성공이면 `https://eversunk2-tech.github.io/english1/` 200, HTML의 JS 파일 이름이 로컬 `dist/` 결과와 같은지, 배포된 JS에 난이도 문구(예: `Normal`)가 있는지 확인.

## 하지 않는 것
코드·문서 수정, 강제 푸시, 브랜치·태그, 저장소 설정 변경.

## 보고 (한국어)
커밋 해시(전체), 파일 수, `npm run check` 결과, 푸시, 워크플로별 결과, 배포 확인.
