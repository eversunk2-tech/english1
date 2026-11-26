# Embed 지침 v2 — N1·N2 수정 커밋·푸시

작성: 2026-11-26, 코디네이터
대상: Embed 서브에이전트 (Sonnet)

## 배경
재검토 2 판정 **통과**(`review.md` 10절, 반드시 수정 0건). 이제 GitHub Pages가 켜져 있어 `main`에 푸시하면 `https://eversunk2-tech.github.io/english1/`에 자동 배포된다.

## 할 일 (프로젝트 루트 `/Users/sungchul/Desktop/play2/영어게임`, 항상 따옴표)
1. `git status`로 바뀐 파일을 본다. 예상: `spec.md`, `review.md`, `src/data/questions.json`, `src/styles.css`, `src/ui/dom.ts`, `src/ui/screens.ts`, `tests/e2e/e4-camera-errors.spec.ts`, `docs/briefs/*-v2.md`(4~5개). 이 밖의 파일이나 비밀값이 보이면 커밋하지 말고 멈춰 보고한다.
2. 커밋 하나(한국어 제목 + 본문 몇 줄: N1 한국어 줄바꿈, N2 taxi 오답 짝, Review 재검토 2 통과). 메시지 끝에 빈 줄 다음 정확히:
   `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
3. `git push origin main`(강제 푸시 금지).
4. `gh run list --repo eversunk2-tech/english1 --commit <전체 40자 해시>`로 CI와 "Deploy to GitHub Pages"를 찾아 둘 다 끝날 때까지 기다린다(`gh run watch <id> --exit-status`, 최대 약 15분). 실패면 `--log-failed`에서 원인 줄을 뽑아 보고(고치지 않는다).
5. 배포 성공이면 `curl`로 확인: `https://eversunk2-tech.github.io/english1/` 200, 그 HTML이 참조하는 JS 파일 이름이 이번 `dist/`와 같은지(또는 배포된 JS 안에 `keepWords`가 만드는 클래스 `kw`가 있는지) 확인해 새 버전이 올라갔는지 본다.

## 하지 않는 것
코드·문서 수정, 강제 푸시, 브랜치·태그 생성, 저장소 설정 변경.

## 보고 (한국어)
커밋 해시(전체), 들어간 파일, 푸시 결과, 워크플로별 결과, 배포 확인 결과.
