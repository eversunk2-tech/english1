# Build 지침 v7 — 맥 영어 발음 개선 (Z1~Z5)

작성: 2026-11-26, 코디네이터
대상: Build 서브에이전트 (Opus 5.5) — 새 서브에이전트

## 배경
사용자: 맥에서 영어 읽어 주기가 콩글리쉬처럼 들림 → 결정 "Google 음성 우선", U1 "윈도는 지금 그대로", U2 "디버그 화면 + 안내 문서". Plan이 spec을 고쳤다: 5.9.1(등급 A·N·G·B·C·D, Microsoft 목록이면 A→N→B→G→C, `lang-only` 없앰, `wait`·skip), 5.9.2(인터넷 목소리 1.5초 시작 실패·오류 → 기기 안 목소리로 한 번 다시), 5.9.3(Safari 고품질 음성 안내: `?debug=1` 한 줄 + README.md 교사용 절), 9절(시작 화면 개인정보 안내 둘째 줄), 11, 12(voicePick ①~⑲, speech ①~⑮, E9 ①~⑥, 12.4-13), 13절 Z1~Z5, 14.4, 15.

## 할 일
1. 먼저 `CLAUDE.md`, `spec.md`의 위 절(개정 기록에서 v7 줄로 찾기)을 읽는다. spec.md는 약 220KB — 필요한 절만.
2. spec 13절 **Z1~Z5**를 순서대로(사람이 듣는 확인 단계는 제외). 주요 파일: `src/audio/voicePick.ts`, `src/audio/speech.ts`, `src/app/App.ts`(목록 미리 받기·prime), `src/ui/strings.ts`·`src/ui/screens.ts`(개인정보 둘째 줄, spec 글자 그대로, `keepWords`), `src/debug/debugOverlay.ts`(5.9.3 한 줄), `README.md`(교사용 "영어 목소리" 절 — 없으면 만든다), 테스트(`tests/unit/voicePick.test.ts`·`speech.test.ts`, `tests/e2e/e9-voice.spec.ts`, `tests/helpers/voices.ts`, 문구 테스트).
3. 테스트 기대값은 spec 문장·표 그대로(저장소 코드 결과를 기대값으로 쓰지 않음). 가짜 타이머로 1초 기다리기·1.5초 시간 초과를 확인.
4. 시작 화면에 줄이 늘어도 화면 4종(1180×820, 820×1180, 1024×768, 768×1024) 스크롤 없음(E6) 유지 — 깨지면 보고.
5. `npm run check` 종료 코드 0을 직접 확인(`; echo "EXIT=$?"`).
6. 가능하면 이 맥의 실제 Chrome(Playwright `channel: 'chrome'`)으로 빌드 결과를 `?debug=1&test=1`로 열어 고른 목소리가 **Google US English**인지 확인하고 스크린샷. 사용자의 Chrome 창(Claude in Chrome 등)은 건드리지 않는다.

## 범위 (엄수)
- 만들거나 고칠 수 있는 것: `src/**`, `tests/**`, `README.md`, 필요하면 `playwright.config.ts`. `spec.md`, `CLAUDE.md`, `docs/**`, `review.md`는 고치지 않는다. git 쓰기·npm install 금지.
- 임시 파일은 scratchpad `build-v7`: `/private/tmp/claude-501/-Users-sungchul-Desktop-play2-----/7bd2217c-e14d-425c-9176-0b2e64f9c244/scratchpad/build-v7`. 띄운 서버는 끈다. 프로젝트 경로 `/Users/sungchul/Desktop/play2/영어게임`(한글 → 항상 따옴표).
- spec에 없는 것을 정해야 하면 사소한 구현 세부는 알아서, 화면·문구·동작에 영향이 있으면 임시안으로 진행하고 "사용자 결정 필요"로 보고.

## 보고 (한국어, 짧게)
단계별 한 일(파일:줄), 테스트, `npm run check` 숫자, 실제 Chrome에서 고른 목소리, 화면 스크린샷 경로, spec과 다르게 한 것, 사용자 결정 필요, 확인 못 한 것.
