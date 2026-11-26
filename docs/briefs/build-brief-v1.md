# Build 지침 v1 — Catch the Word! (S1~S6)

작성: 2026-11-26, 코디네이터
대상: Build 서브에이전트 (Opus 5.5)

## 1. 너의 일

`spec.md`(Plan v1, 2026-11-26 사용자가 14절 전체를 추천안대로 승인)를 그대로 구현한다. **spec.md가 유일한 설계 기준**이다. 이 지침은 범위와 보고 방식만 정한다.

- 프로젝트 루트: `/Users/sungchul/Desktop/play2/영어게임` (경로에 한글 → 명령에서 항상 따옴표).
- 먼저 `spec.md` 전체를 읽는다(특히 0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13절과 부록 A·B·C).
- 할 일: spec 13절의 **S1~S6**을 순서대로. 각 단계 끝에 `npm run typecheck && npm test`가 통과해야 다음 단계로 간다. S7(태블릿 조정)은 하지 않는다.

## 2. 수정 범위 (엄수)

- **만들거나 고쳐도 되는 것**: spec 11절 파일 구조에 나온 파일·폴더(`index.html`, `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `playwright.config.ts`, `.gitignore`, `.github/workflows/*`, `public/**`, `scripts/**`, `src/**`, `tests/**`), 그리고 `npm install`이 만드는 `node_modules/`, 빌드·테스트가 만드는 `dist/`, `test-results/`, `playwright-report/`.
- **고치지 않는 것**: `spec.md`, `CLAUDE.md`, `docs/briefs/**`, `review.md`(Review 몫). spec과 다르게 해야 할 것이 생기면 spec을 고치지 말고 보고에 적는다.
- **git 금지**: `git init`, `commit`, `push`, `gh` 등은 Embed 단계의 일이다.
- `npm install`은 프로젝트 루트에서. 버전은 spec 2.3의 정확한 버전으로 고정.
- 외부에서 받는 것은 spec이 정한 것만: npm 패키지, spec 2.4의 공식 주소에서 받는 모델 파일(SHA-256 검사 필수), Playwright chromium(`npx playwright install chromium`). 그 밖의 파일을 받아야 하면 멈추고 보고한다.
- 임시 파일·실험 스크립트는 프로젝트 폴더가 아닌 scratchpad 폴더에 둔다:
  `/private/tmp/claude-501/-Users-sungchul-Desktop-play2-----/7bd2217c-e14d-425c-9176-0b2e64f9c244/scratchpad`
- 개발 서버 포트는 spec대로(dev 5173, E2E 4173). 띄운 서버는 끝나면 모두 끈다.

## 3. 판단 규칙

- 문항 데이터는 부록 A를 **한 글자도 바꾸지 않고** JSON으로 옮긴다. 문항에 문제가 보이면 고치지 말고 보고한다.
- spec에 없는 것을 정해야 할 때: 사소한 구현 세부(변수 이름, 내부 함수 나누기)는 알아서 정한다. 화면에 보이는 것·규칙·점수·문구·외부 요청에 영향이 있으면 추측하지 말고 "사용자 결정 필요"로 보고하고, 가장 무난한 임시안으로 진행하되 그 사실을 적는다.
- S2의 "실제 손 확인"은 이 환경에서 사람 손으로 할 수 없다. E5 수준(가짜 카메라로 MediaPipe 적재·검사 횟수 확인)까지 하고 그렇게 했다고 적는다.
- CSP(spec의 보안 정책)에서 MediaPipe가 돌아가지 않으면 어떤 지시어가 왜 필요했는지 보고한다.
- 막혀서 30분 넘게 진전이 없으면 그 단계에서 멈추고 무엇이 막혔는지 보고한다.

## 4. 끝나면 보고할 것 (최종 메시지, 한국어)

1. 단계별(S1~S6) 한 일과 완료 기준 충족 여부
2. 마지막에 실제로 돌린 명령과 결과 숫자: `npm run typecheck`, `npm test`(통과/실패/건너뜀 수), `npm run check:data`, `npm run test:e2e`(E1~E7, 프로젝트별), `npm run build` 결과물 크기
3. spec과 다르게 한 것과 이유
4. 사용자 결정 필요
5. 확인하지 못한 것(태블릿에서만 확인 가능한 것 등)
6. 만든 파일 목록(트리)

보고는 확인 대상이지 근거가 아니다. Review가 별도로 직접 재현한다.
