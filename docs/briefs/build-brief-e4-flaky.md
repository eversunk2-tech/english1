# Build 지침 — E4 카메라 테스트 간헐 실패 안정화

작성: 2026-11-26, 코디네이터
대상: Build 서브에이전트 (Opus 5.5)

## 배경
- 사용자 결정: "안정화하기". 게임 동작·규칙·문구 변경이 아니라 테스트 안정화라 Plan(spec 변경) 단계는 두지 않는다 — 원인이 **제품 버그**로 밝혀지면 고치지 말고 멈춰서 보고한다(그때는 Plan부터).
- 실패: GitHub Actions CI run 45790148325 attempt 1(커밋 `ba31646`), `[small-landscape] tests/e2e/e4-camera-errors.spec.ts:93` "트랙 ended → busy 문구, [다시 시도]는 카메라만 다시 열고 모델은 다시 받지 않음". 117행 `expect.poll(detectCount).toBeGreaterThan(n + 3)`이 10초 동안 8에서 늘지 않음. 재실행(attempt 2)은 통과. 지난 CI 6번은 모두 첫 시도 통과.
- 관련 코드: `src/hand/mediapipeSource.ts`(새 프레임만 검사 `currentTime` 비교 165, 느리면 2개 중 1개만 검사 `skipping` 168~199, 타임스탬프 172, `detectForVideo` 177, 다시 열 때 `lastVideoTime = -1` 158·253·259), `src/camera/camera.ts`, `src/app/App.ts`(다시 시도 흐름), CI 워크플로 `.github/workflows/ci.yml`, `playwright.config.ts`.

## 할 일
1. **원인 찾기가 먼저**: 시간 초과만 늘리지 않는다. CI 로그(`gh run view 45790148325 --repo eversunk2-tech/english1 --attempt 1 --log-failed`, 실패 첨부물이 있으면 `gh run download`)와 코드를 보고, 이 맥에서 재현을 시도한다 — 예: CDP `Emulation.setCPUThrottlingRate`로 CPU를 4~6배 느리게, `--repeat-each`로 여러 번, small-landscape 프로젝트만. 다시 시도 뒤 `detectCount`가 멈추는 경로(가짜 카메라 새 트랙의 `currentTime`이 안 움직임, `detectForVideo` 예외 삼킴, `skipping` 상태, 다시 연 비디오 재생 시작 전 등)를 확인한다.
2. **원인이 테스트 쪽(느린 러너 타이밍)이면**: 테스트가 확인하려는 것(다시 시도 후 카메라·손 인식이 다시 돈다, 모델은 다시 받지 않는다)을 지키면서 안정하게 — 예: "새 트랙의 비디오가 재생 중(`currentTime` 증가)"을 먼저 기다리고, 검사 횟수 조건을 느린 환경에 맞게(근거 있는 값), 시간 제한도 근거와 함께. 같은 패턴의 다른 테스트(E5 등 `detectCount`를 세는 곳)도 같은 위험이 있으면 함께.
3. **원인이 제품 쪽이면**(예: 다시 연 카메라에서 인식이 실제로 멈출 수 있음): 고치지 말고 재현 방법·근거와 함께 멈춰서 보고한다.
4. 검증: 이 맥에서 CPU를 느리게 한 상태로 해당 테스트 `--repeat-each=20` 이상 통과, 그리고 `npm run check` 종료 코드 0 직접 확인.

## 범위 (엄수)
`tests/**`, 필요하면 `playwright.config.ts`·`.github/workflows/ci.yml`. `src/**`·`spec.md`·`docs/**`·`review.md` 수정 금지(제품 버그면 보고). git 쓰기·npm install 금지. 임시 파일은 scratchpad `build-e4`: `/private/tmp/claude-501/-Users-sungchul-Desktop-play2-----/7bd2217c-e14d-425c-9176-0b2e64f9c244/scratchpad/build-e4`. 서버는 끈다. 프로젝트 경로 `/Users/sungchul/Desktop/play2/영어게임`(한글 → 따옴표).

## 보고 (한국어, 짧게)
원인(근거·재현 여부), 고친 곳(파일:줄), 반복 실행 결과, `npm run check` 숫자, 제품 버그 의심이 있으면 그 내용.
