# Build 지침 v9 — Easy 빼고 난이도 올리기 (V1~V5)

작성: 2026-11-27, 코디네이터
대상: Build 서브에이전트 (Opus 5.5) — 새 서브에이전트

## 배경
사용자 요청 "easy 말고는 빠르기, 단어 수준 등 난이도를 좀더 올려줘…" → v9 14.6 Y1~Y7 모두 추천안 승인("추천대로 승인"). Plan이 V0으로 spec 본문에 반영했다: 0, 5.3(단계 값, 같은 주제 오답, `upCount`·`upFrom`, `WORD_MS[d][band]`, 물리적 하한 1850ms), 5.5(`catchword.best.v9.*`), 5.6/5.6.1(한 단계 위 문제, 더미 4개 `3-4`·`5-6`·`vh-mid`·`vh-adv`, `drawSpecFor`, 문제 `level`, 옛 `catchword.bag.veryhard` 나눠 옮기기, 디버그 줄), 5.8, 6.2(문구), 7.6.4, 11, 12.1·12.2(v9 기대값, E2 Easy 그대로), 16.1·16.4(VH-V10 새 규칙), 부록 D 119문항, 13·18.10(V1~V6). 기준은 본문이다(18절은 근거 기록).

## 할 일
1. `CLAUDE.md`, spec 개정 기록의 v9 줄에서 위 절을 찾아 읽는다(spec.md는 매우 길다 — 필요한 절만).
2. 18.10 **V1~V5**를 순서대로(V6 교실 측정 제외). 각 단계 끝에 `npm run typecheck && npm test`.
   - Easy는 v8과 rng 사용까지 같은 결과여야 한다(E2 기대값 그대로) — 확인 테스트 포함.
   - `fallMsFor`가 난이도를 받게 되면 모든 호출처를 고친다.
   - `veryhard.json`(119)·`clue-extra.json`(`veryhardAdvanced` 48 등)을 부록 D에서 스크립트로 옮기고, VH-V10을 새 규칙으로.
   - 기대값은 spec 문장으로 따로 계산(저장소 코드 결과를 기대값으로 쓰지 않음).
3. 화면 4종(1180×820, 820×1180, 1024×768, 768×1024) 시작 화면 스크롤 없음(E6), 새 문구는 spec 6.2 글자 그대로, 한국어는 `keepWords`.
4. `npm run check` 종료 코드 0 직접 확인(`; echo "EXIT=$?"`). 가능하면 실제 빌드에서 5-6 Hard·VH 한 판씩(`?input=pointer&debug=1`)으로 한 단계 위 단어가 정해진 자리·개수로 나오는지 확인.

## 범위 (엄수)
`src/**`, `tests/**`, 필요하면 `scripts/**`. `spec.md`, `CLAUDE.md`, `docs/**`, `review.md`, `README.md` 수정 금지(README의 난이도 설명이 틀려지면 보고만). git 쓰기·npm install 금지. 임시 파일은 scratchpad `build-v9`: `/private/tmp/claude-501/-Users-sungchul-Desktop-play2-----/7bd2217c-e14d-425c-9176-0b2e64f9c244/scratchpad/build-v9`. 서버는 끈다. 사용자 Chrome 창은 쓰지 않는다. 프로젝트 경로 `/Users/sungchul/Desktop/play2/영어게임`(한글·NFD → 따옴표, cwd 기준 경로).

## 보고 (한국어, 짧게)
단계별 한 일(파일:줄), 테스트, `npm run check` 숫자, 실제 빌드 확인, 화면 스크린샷 경로, spec과 다르게 한 것, 사용자 결정 필요, 확인 못 한 것.
