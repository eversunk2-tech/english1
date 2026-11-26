# Embed 지침 v6 UI — 새 디자인 커밋·푸시

작성: 2026-11-27, 코디네이터
대상: Embed 서브에이전트 (Sonnet)

## 배경
v6 UI 디자인(볼드 레트로 "포스터 스티커", 떨어지는 카드 그림자·떠오름 없음, START/AGAIN 떠오름 없음) Review 22절 → 23절 재검토 **통과**(반드시 수정 0건).

## 할 일 (프로젝트 루트 `/Users/sungchul/Desktop/play2/영어게임`, 항상 따옴표)
1. `git status` 확인. 예상: `index.html`, `review.md`, `spec.md`, `src/render/canvasRenderer.ts`, `src/render/effects.ts`, `src/styles.css`, `src/ui/hud.ts`, `src/ui/screens.ts`, `tests/e2e/e11-design.spec.ts`(새), `tests/unit/cardFont.test.ts`(새), `docs/briefs/*`(v6 관련), `docs/design/v6/**`(시안, 약 9MB — 함께 커밋한다. 단 1MB 넘는 파일이 있거나 비밀값이 있으면 멈추고 보고). `src/game/*`·`src/hand/*`·`src/config.ts`·`src/ui/strings.ts`·`src/data/*`는 바뀌지 않았어야 한다.
2. `npm run check` 종료 코드 0 직접 확인(파이프 없이 `; echo "EXIT=$?"`). 실패면 커밋하지 말고 보고.
3. 커밋 하나(한국어 제목 예: "게임 UI 새 디자인(볼드 레트로 포스터 스티커)" + 본문 몇 줄: 사용자 결정(떨어지는 카드 그림자 없음), START/AGAIN 떠오름 제거, E11, Review 22·23절 통과). 메시지 끝에 빈 줄 다음 정확히:
   `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
4. `git push origin main`(강제 푸시 금지).
5. CI·"Deploy to GitHub Pages" 끝까지 기다리기(`gh run watch <id> --repo eversunk2-tech/english1 --exit-status`; API 오류면 `gh run view`). **재실행 금지** — 실패하면 원인 줄과 테스트 이름 보고.
6. 배포 성공이면 사이트 200, HTML의 JS·CSS 이름이 로컬 `dist/`와 같은지, 배포된 CSS에 `--paper`(또는 `#f3ead8`)가 있는지 확인.

## 하지 않는 것
코드·문서 수정, 강제 푸시, 브랜치·태그, 저장소 설정 변경, CI 재실행.

## 보고 (한국어, 짧게)
커밋 해시(전체), 파일 수, `npm run check` 종료 코드와 숫자, 푸시, 워크플로별 첫 시도 결과, 배포 확인, 커밋 후 `git status`.
