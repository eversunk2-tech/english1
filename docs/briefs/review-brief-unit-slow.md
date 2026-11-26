# Review 지침 — 느린 단위 테스트 안정화 검증

작성: 2026-11-27, 코디네이터
대상: Review 서브에이전트 (Sonnet) — Build와 분리

## 배경
- 사용자 결정 "고치기". 배포 run 45878021468 attempt 1에서 단위 테스트 3개(bag.test:124, questions.test:111·125)가 5초 제한을 넘겨 배포 실패(재실행 통과).
- Build 보고(검증 대상, 근거 아님): 원인은 테스트 코드의 되풀이 계산·과한 expect 호출. `bag.test.ts`(위반 모아 한 번 비교 `expectGap`, 공유 `soloGames`, 테스트별 30초·120초), `questions.test.ts`(`planCache`, "같은 씨앗 = 같은 판"은 캐시 없이 `freshGamePlansOf`, `sameAvailOf`, 30초), `data.test.ts`·`session.test.ts`(묶음/테스트 30초). 테스트 이름·기대값·씨앗 수·판 수는 그대로, `src`·`vite.config.ts` 안 고침. 부하 75개 흉내에서 옛 테스트 재현 실패·새 테스트 3/3 통과, `npm run check` EXIT=0.
- 변경: `git diff -- tests`(마지막 커밋 `795ef69` 이후). 주의: 다른 서브에이전트(UI 디자인 Plan)가 동시에 `spec.md`·`docs/design/v6/**`·`docs/briefs/plan-brief-v6-ui.md`를 고치고 있다 — 이 검증 대상이 아니다.

## 범위
`review.md` 끝에 "## 21. 느린 단위 테스트 안정화 검증 (2026-11-27)" 절만(1절 판정 아래 한 줄 가능). 코드·spec 수정, git 쓰기, npm install 금지. 임시 파일은 scratchpad `review-unit`: `/private/tmp/claude-501/-Users-sungchul-Desktop-play2-----/7bd2217c-e14d-425c-9176-0b2e64f9c244/scratchpad/review-unit`. 서버는 끈다(포트 4173 등 — 디자인 쪽은 4180 이상을 쓴다). 프로젝트 경로 한글·NFD → 따옴표.

## 확인할 것
1. `npm test`·`npm run check` 재현(종료 코드 직접).
2. **검사가 약해지지 않았는지(가장 중요)**: 각 변경을 `git diff`로 읽고 — 기대값·반복 수·검사 대상이 같은지, `planCache`가 테스트 사이 상태 공유로 서로를 가리지 않는지(특히 결정성 테스트), 모아서 한 번 비교하는 방식이 위반을 놓치지 않는지. 변이 시험: `src/game/bag.ts`·`questions.ts`에 일부러 작은 버그(예: 최근 간격 규칙 깨기, 같은 주제 오답 수 하나 줄이기)를 임시로 넣어 바뀐 테스트가 실패하는지 확인하고 **반드시 원래대로 되돌린다**(`git diff -- src`가 비어 있음을 끝에 확인).
3. 시간 제한 근거(로컬×5.6×3)가 타당한지, 과도해서 다른 문제를 숨기지 않는지.
4. 느린 환경 흉내(CPU 부하)에서 새 테스트 통과를 한두 번 확인(가능한 만큼).

## 보고 (한국어, 짧게)
판정(`통과`/`수정 필요`), 검사 약화 여부(변이 시험 결과), 돌린 명령과 결과, 반드시/권장.
