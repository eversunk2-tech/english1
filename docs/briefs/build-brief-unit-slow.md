# Build 지침 — 느린 단위 테스트 안정화(배포 시간 초과)

작성: 2026-11-27, 코디네이터
대상: Build 서브에이전트 (Opus 5.5) — 새 서브에이전트

## 배경
- 사용자 결정: "고치기". 게임 동작·규칙·문구 변경이 아닌 테스트 안정화라 Plan 단계는 두지 않는다. 원인이 제품 코드라고 보이면(예: 판 만들기가 실제 게임에서도 느림) 고치지 말고 멈춰서 보고한다.
- 실패: GitHub Actions "Deploy to GitHub Pages" run 45878021468 attempt 1(커밋 `795ef69`)의 빌드 단계 `npm test`에서 단위 테스트 3개가 vitest 기본 제한 5000ms를 넘김: `tests/unit/bag.test.ts:124`, `tests/unit/questions.test.ts:111`, `tests/unit/questions.test.ts:125`("v9 오답 풀(5.6 표)…"). 같은 커밋 CI·로컬은 통과, 재실행 attempt 2는 통과. 같은 로그에서 `data.test.ts`는 파일 합계 30초, 개별 테스트도 0.7~2.9초(`session.test` v9 판 구성 2.9초)로 기본 제한에 가깝다.
- 관련: `vite.config.ts`(vitest 설정), `.github/workflows/pages.yml`·`ci.yml`(둘 다 `npm test`를 돈다), `tests/unit/*.test.ts`, `src/data/validate.ts`(판 구성 흉내 V9·VH-V9).

## 할 일
1. **원인과 크기 재기**: 로컬에서 `npx vitest run --reporter=verbose`로 테스트별 시간을 재고, 러너 실패 로그(`gh run view 45878021468 --repo eversunk2-tech/english1 --attempt 1 --log-failed`)와 비교. CPU가 느린 환경을 흉내(예: 동시에 다른 부하, 또는 `--pool=threads --poolOptions.threads.maxThreads=1`)해서 재현을 시도한다.
2. **고치기(검사 힘은 유지)**: 우선순위 — ① 같은 계산을 테스트마다 되풀이하는 곳 줄이기(예: 위반 예시 23개가 매번 전체 판 구성 흉내를 다시 돈다면 흉내를 끄는 선택 인자/공유 결과 사용), ② 무작위 흉내 판 수가 과한 곳은 근거를 두고 조정(불변식을 잡는 힘을 잃지 않는 수준 — 바꾼 수와 근거를 보고), ③ 그래도 무거운 테스트에는 테스트별 시간 제한을 근거 있게(측정값의 3배 이상 여유). 전역 `testTimeout`만 크게 올리는 것은 최후의 수단이고 쓰면 근거를 적는다.
3. 테스트 이름·기대값·검사 대상은 바꾸지 않는다(줄인 반복 수 같은 것은 보고).
4. 검증: 로컬 `npm test` 전체 시간 전/후, 느린 환경 흉내에서 여러 번 통과, `npm run check` 종료 코드 0 직접 확인(파이프 없이 `; echo "EXIT=$?"`).

## 범위 (엄수)
`tests/**`, 필요하면 `vite.config.ts`. `src/**`는 원칙적으로 금지 — `validate.ts`에 흉내를 끄는 선택 인자가 꼭 필요하면 동작을 바꾸지 않는 최소 변경만 하고 보고에 분명히 적는다. `spec.md`·`docs/**`·`review.md`·워크플로 수정 금지. git 쓰기·npm install 금지. 임시 파일은 scratchpad `build-unit`: `/private/tmp/claude-501/-Users-sungchul-Desktop-play2-----/7bd2217c-e14d-425c-9176-0b2e64f9c244/scratchpad/build-unit`. 프로젝트 경로 한글·NFD → 따옴표, cwd 기준 경로.

## 보고 (한국어, 짧게)
원인, 테스트별 시간 전/후(느린 것 상위 10개), 고친 곳(파일:줄)과 줄인 반복 수·근거, `src` 변경 여부, `npm run check` 숫자.
