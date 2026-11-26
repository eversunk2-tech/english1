# Build 지침 v5 — 영어 읽어 주기 목소리 고르기 (Y1~Y4)

작성: 2026-11-26, 코디네이터
대상: Build 서브에이전트 (Opus 5.5)

## 배경
사용자 피드백(쉰 목소리) → 원인: `speech.ts`가 en-US 첫 목소리(macOS/iPadOS 장난용 "Albert")를 고름 → 사용자 "고치기". Plan이 spec 5.9.1(고르기 규칙), 12.1·12.2(E9)·12.4-12, 13절 Y1~Y4, 15절을 정했다.

## 할 일 — spec 13절 Y1~Y4 (사람 확인 단계는 제외)
1. `src/audio/voicePick.ts`의 순수 함수 `chooseVoice`(결과 voice / lang-only / skip, 이름 정리, 장난용 제외, 맨 뒤 목록, 등급 A·B·C, 고르는 순서) — spec 5.9.1 문장 그대로.
2. `src/audio/speech.ts`: `voiceschanged`마다 다시 고르기, `voice`일 때만 기억, `lang-only`면 `u.lang='en-US'`만으로 말하기, `skip`이면 말하지 않기, rate 0.9·pitch 1. `?debug=1` 화면에 고른 목소리 표시.
3. 테스트: `voicePick.test.ts` ①~⑪(기대값은 spec 표 그대로 — 저장소 코드 결과를 기대값으로 쓰지 않는다), `speech.test.ts`(가짜 speechSynthesis: 빈 목록 → voiceschanged → 다시 고르기), E9(getVoices·speak 바꿔 끼워 한 판: 모두 Samantha, Albert 0회, 목록이 늦게 와도 첫 설명이 빠지지 않음).
4. `npm run check` 종료 코드 0 직접 확인.
5. 가능하면 이 맥의 실제 브라우저(빌드 결과를 preview로 열고 `?debug=1`)에서 고른 목소리가 Samantha로 보이는지 확인하고 스크린샷.

## 범위 (엄수)
`src/**`, `tests/**`, 필요하면 `playwright.config.ts`. spec·docs·review.md 수정, git 쓰기, npm install 금지. 임시 파일은 scratchpad `build-v5`: `/private/tmp/claude-501/-Users-sungchul-Desktop-play2-----/7bd2217c-e14d-425c-9176-0b2e64f9c244/scratchpad/build-v5`. 서버는 끈다.

## 보고 (한국어, 짧게)
파일:줄, 테스트, `npm run check` 숫자, 실제 브라우저에서 고른 목소리, spec과 다르게 한 것, 사용자 결정 필요.
