# Review 지침 v6 — 게임 UI 디자인 적용 검증

작성: 2026-11-27, 코디네이터
대상: Review 서브에이전트 (Opus 5.5) — 새 서브에이전트, Build와 분리

## 배경
- 사용자 요청 "ui 파운데이션 스킬, ui 레트로 스킬을 이용해 게임 ui 디자인을 수정해줘" → 시안 → 14.7 G1~G7 승인("추천대로 승인") → 덧붙임 결정 "떨어지는 단어들은 그림자 없이 만들어줘"(Plan이 겨냥 카드 3px 떠오름도 함께 뺌). 기준: `spec.md` 17절(17.3 토큰, 17.4 글꼴, 17.5 대비·카드 규칙, 17.6~17.8 화면·성능, 17.9 파일, 17.10~17.11 테스트, 17.12), 6.2, 12.2 E11, 12.4-15. 시안: `docs/design/v6/`(카드 그림자는 결정 전 모습).
- Build 보고(검증 대상, 근거 아님): U1~U6, 바꾼 파일 `src/styles.css`, `src/ui/screens.ts`, `src/ui/hud.ts`, `src/render/canvasRenderer.ts`, `src/render/effects.ts`, `index.html`, 새 `tests/e2e/e11-design.spec.ts`, `tests/unit/cardFont.test.ts`. `npm run check` 통과(단위 238, e2e 177). 비교 그림: `/private/tmp/claude-501/-Users-sungchul-Desktop-play2-----/7bd2217c-e14d-425c-9176-0b2e64f9c244/scratchpad/build-v6/compare/`. Build가 밝힌 차이: 오답 카드 광택 없음(spec 따름), 사라지는 카드 투명도, 커서 쥔 손·호는 화면 미확인, 결과 세로 간격 12px, 정답 뜻 굵기 800, START/AGAIN 3px 떠오름으로 가장자리 겨냥 깜빡임 가능.
- 변경: `git diff`(마지막 커밋 `2438105` 이후 — `spec.md`·`docs/design/v6`·`docs/briefs`는 Plan·코디네이터 몫).

## 범위
`review.md` 끝에 "## 22. v6 UI 디자인 검증 (2026-11-27)" 절만(1절 판정 아래 한 줄 가능). 코드·spec·시안 수정, git 쓰기, npm install 금지. 임시 파일은 scratchpad `review-v6`: `/private/tmp/claude-501/-Users-sungchul-Desktop-play2-----/7bd2217c-e14d-425c-9176-0b2e64f9c244/scratchpad/review-v6`. 서버는 끈다. 사용자 Chrome 창 쓰지 않기. 프로젝트 경로 한글·NFD → 따옴표, cwd 기준 경로.

## 확인할 것
1. `npm run check` 재현(종료 코드 직접), `git diff -- src index.html tests` 범위가 17.9 안인지, 금지 파일(`strings.ts`, `src/game/*`, `src/hand/*`, `config.ts`) 무변경.
2. **규칙·판정 불변**: 카드 크기·위치·판정 여유·띠 높이 식·문구가 v9(`2438105`)와 같은지 — 같은 seed로 옛 빌드(`git show`로 꺼내 scratchpad에 따로 빌드)와 새 빌드의 `state()`(카드 rect, clue, 점수)를 비교. 겨냥 카드가 떠오르지 않아 그린 자리 = 판정 사각형인지.
3. **떨어지는 카드 그림자 없음**: 코드(drawCards 등)와 스크린샷으로 모든 상태(기본·겨냥·오답·정답·흐려짐) 확인. 다른 요소(버튼·띠·START/AGAIN)는 시안대로 그림자.
4. **시안 일치**: 화면 4종 × 장면(시작·시작 VH·손 확인·3·2·1·놀이·오답·정답·놓침·일시정지·결과·오류)을 직접 찍어 시안과 견주고 다른 곳을 적는다(사용자 결정에 따른 차이는 문제 아님). 가능하면 재생 모드로 쥔 손 커서·C 호를 찍어 본다.
5. **접근성**: 주요 글자·배경 짝 대비를 직접 계산(4.5:1 이상), 키보드 포커스 표시, `prefers-reduced-motion`(CSS와 캔버스 기울임·팝·흔들림 모두), 색만으로 구분하지 않기(✓/✕).
6. **외부 요청 0·글꼴**: 콘솔 오류 0, 사이트 밖 요청 0, `@font-face`·외부 URL·이미지 파일 없음.
7. **레이아웃**: 48조합 스크롤·어절 끊김(E6), 11자 낱말 카드, 두 줄 설명 띠, 세로 결과 화면.
8. **성능**: 캔버스에 `shadowBlur`·`filter`·매 프레임 비싼 작업이 없는지 코드로, 가능하면 CPU 감속으로 fps 비교(v9 대비).
9. Build가 밝힌 차이·START/AGAIN 가장자리 깜빡임이 문제인지 판단.

## 보고 (한국어, 짧게)
판정(`통과`/`수정 필요`), 돌린 명령과 결과, 규칙 불변 비교, 시안과 다른 곳, 반드시 수정(파일:줄·재현·방향), 권장, 사용자 결정 필요, 기기 확인 항목(12.4-15).
