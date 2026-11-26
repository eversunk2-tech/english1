# Embed 지침 v7 — 맥 영어 발음 개선(v7) 커밋·푸시

작성: 2026-11-26, 코디네이터
대상: Embed 서브에이전트 (Sonnet)

## 배경
v7(맥 등 비윈도 Google 음성 우선, 윈도 그대로, 한국어·미지정 목소리로 읽기 막기, 인터넷 실패 대체, 개인정보 둘째 줄, README 교사용 안내) Review 17절 **통과**(반드시 수정 0건). Review 권장 문서 2건은 코디네이터가 반영했다(spec 12.1 ⑲ 문장, README 안드로이드 줄).

## 할 일 (프로젝트 루트 `/Users/sungchul/Desktop/play2/영어게임`, 항상 따옴표)
1. `git status` 확인. 예상: `spec.md`, `review.md`, `README.md`(새), `src/app/App.ts`, `src/audio/speech.ts`, `src/audio/voicePick.ts`, `src/config.ts`, `src/debug/debugOverlay.ts`, `src/styles.css`, `src/ui/screens.ts`, `src/ui/strings.ts`, `tests/**`, `docs/briefs/*`(v6-ui 일시정지 지침 포함 — 함께 커밋해도 된다). `src/data/*`는 바뀌지 않았어야 한다. 비밀값·예상 밖 큰 파일이 있으면 멈추고 보고.
2. `npm run check` 종료 코드 0 직접 확인(`; echo "EXIT=$?"`). 실패면 커밋하지 말고 보고.
3. 커밋 하나(한국어 제목 예: "맥 영어 발음 개선: Google 음성 우선, 한국어 목소리로 읽기 막기" + 본문 몇 줄, Review 17절 통과). 메시지 끝에 빈 줄 다음 정확히:
   `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
4. `git push origin main`(강제 푸시 금지).
5. CI·"Deploy to GitHub Pages" 끝까지 기다리기(`gh run watch <id> --repo eversunk2-tech/english1 --exit-status`; API 오류면 `gh run view`). 실패면 원인 줄 보고.
6. 배포 성공이면 사이트 200, HTML의 JS 이름이 로컬 `dist/`와 같은지, 배포된 JS에 개인정보 둘째 줄 문구 일부("인터넷 목소리")가 있는지 확인.

## 하지 않는 것
코드·문서 수정, 강제 푸시, 브랜치·태그, 저장소 설정 변경. 사용자의 Chrome 창은 쓰지 않는다.

## 보고 (한국어)
커밋 해시(전체), 파일 수, `npm run check` 종료 코드와 숫자, 푸시, 워크플로별 결과, 배포 확인.
