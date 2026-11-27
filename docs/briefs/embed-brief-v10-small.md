# Embed 지침 v10 — 남은 작은 일 커밋·푸시

작성: 2026-11-27, 코디네이터
대상: Embed 서브에이전트 (Sonnet)

## 배경
사용자 요청 "남은 작은 일들도 고쳐줘" → S1 chin↔beard avoid(양방향, 새 단위 테스트), S2~S4 spec 문장 정정. Review 24절 **통과**(반드시 수정 0건, 권장 1건은 Plan이 반영).

## 할 일 (프로젝트 루트 `/Users/sungchul/Desktop/play2/영어게임`, 항상 따옴표)
1. `git status` 확인. 예상: `spec.md`, `review.md`, `src/data/veryhard.json`, `tests/unit/questions.test.ts`, 새 `docs/briefs/fix-brief-v10-small.md`·`review-brief-v10-small.md`·`embed-brief-v10-small.md`. 이것 말고 다른 파일이 바뀌었으면 멈추고 보고.
2. `npm run check` 종료 코드 0 직접 확인(파이프 없이 `; echo "EXIT=$?"`). 실패면 커밋하지 말고 보고.
3. 위 파일만 이름을 적어 `git add`하고 커밋 하나(한국어 제목 예: "chin↔beard 함께 안 나오게, 계획서 숫자·문장 바로잡기" + 본문 몇 줄: S1~S4, Review 24절 통과). 메시지 끝에 빈 줄 다음 정확히:
   `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
4. `git push origin main`(강제 푸시 금지).
5. CI·"Deploy to GitHub Pages" 끝까지 기다리기(`gh run watch <id> --repo eversunk2-tech/english1 --exit-status`; API 오류면 `gh run view`). **재실행 금지** — 실패하면 원인 줄과 테스트 이름 보고.
6. 배포 성공이면 사이트 200, HTML의 JS 이름이 로컬 `dist/`와 같은지 확인.

## 하지 않는 것
코드·문서 수정, 강제 푸시, 브랜치·태그, 저장소 설정 변경, CI 재실행.

## 보고 (한국어, 짧게)
커밋 해시(전체), 파일 수, `npm run check` 종료 코드와 숫자, 푸시, 워크플로별 첫 시도 결과, 배포 확인, 커밋 후 `git status`.
