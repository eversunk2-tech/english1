# Review 지침 — E4 간헐 실패 안정화 검증

작성: 2026-11-26, 코디네이터
대상: Review 서브에이전트 (Sonnet) — Build와 분리

## 배경
- 사용자 결정 "안정화하기". CI run 45790148325 attempt 1에서 `[small-landscape] e4-camera-errors.spec.ts:93`(트랙 ended → [다시 시도] 뒤 detectCount `> n+3`을 10초 안에)이 실패, 재실행 통과.
- Build 보고(검증 대상, 근거 아님): 원인은 느린 CI 러너(소프트웨어 GL로 프레임 하나가 1~3초) — 제품 버그 아님. CI trace에서 detectCount가 5→6→8→11로 계속 늘었고 11이 마감 직후였다. `tests/e2e/helpers.ts`에 `SLOW_DETECT_MS=4000`, `expectCameraVideoPlaying()`, `expectDetectCountAbove()`(필요 검사 수×4초+10초), `CAMERA_TEST_TIMEOUT_MS=150000`을 더하고 E4(R3, [처음으로]), E5, E1에 적용. CPU 6배 감속 + GL 지연 흉내로 원래 테스트는 실패, 새 테스트는 R3 20/20 통과. `npm run check` 통과(단위 206, e2e 126).
- 바뀐 파일: `tests/e2e/helpers.ts`, `e1-load.spec.ts`, `e4-camera-errors.spec.ts`, `e5-mediapipe.spec.ts`(마지막 커밋 `ba31646` 이후 `git diff`).

## 범위
- 만들 수 있는 것: `review.md` 끝에 "## 18. E4 간헐 실패 안정화 검증 (2026-11-26)" 절만(1절 판정 아래 한 줄 가능). 코드·spec 수정, git 쓰기, npm install 금지.
- 임시 파일은 scratchpad `review-e4`: `/private/tmp/claude-501/-Users-sungchul-Desktop-play2-----/7bd2217c-e14d-425c-9176-0b2e64f9c244/scratchpad/review-e4`(Build의 흉내 도구는 `.../scratchpad/build-e4/harness/`에 있다 — 써도 되지만 결과는 직접 낸다). 서버는 끈다. 프로젝트 경로 `/Users/sungchul/Desktop/play2/영어게임`(한글, 디스크에 NFD — 절대경로 대신 cwd 기준 경로).

## 확인할 것
1. 원인 판단이 맞는지: CI trace(`gh run download 45790148325 --repo eversunk2-tech/english1` 등 — 내려받기가 안 되면 로그)로 detectCount가 정말 계속 늘었는지 직접 본다.
2. **테스트가 약해지지 않았는지**(가장 중요): 바뀐 테스트가 여전히 원래 확인하려던 것을 잡는지 — 다시 시도 뒤 인식이 **멈추면 실패**하는지(예: 테스트용으로 detectCount가 안 늘게 만든 상황을 흉내 내 새 테스트가 실패하는지), 모델 재다운로드 검사 유지, `> n+3` 조건 유지. 시간 제한이 과도해 다른 실패를 숨기지 않는지(테스트 전체 시간).
3. 느린 환경 흉내로 새 테스트 반복 실행(가능한 만큼), 그리고 `npm run check` 종료 코드 0 직접 확인.
4. 바뀐 4파일 코드 읽기: 헬퍼가 정확한지, 다른 테스트에 영향 없는지.

## 보고 (한국어, 짧게)
판정(`통과`/`수정 필요`), 원인 판단 동의 여부, 테스트가 약해졌는지, 돌린 명령과 결과, 반드시/권장.
