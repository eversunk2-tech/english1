# Plan 지침 v7 — 맥에서 영어 발음 개선(Google 음성 우선, 한국어 기본 음성 막기)

작성: 2026-11-26, 코디네이터
대상: Plan 서브에이전트 (Opus 5.5, 추론 강도 높음) — 새 서브에이전트

## 1. 사용자 요청과 결정 (원문)
- "윈도우pc에서는 원어민 느낌으로 발음이 좋은데, 애플기기(맥북)에서는 발음이 콩글리쉬 느낌으로 엄청 안좋아. 이유가 뭐야? 윈도우pc의 발음 처럼 되도록 해줘"
- 코디네이터가 원인을 설명하고 물음 → 사용자 답: **"Google 음성 우선"** (인터넷 음성인 Google 음성을 기기 안 음성보다 먼저 쓰기. 퀴즈 문장이 Google 서버로 간다는 점을 알리고 받은 답이다.)

## 2. 코디네이터가 확인한 사실 (2026-11-26, 이 맥 macOS 27.2.1, 시스템 언어 ko-KR)
- 배포 사이트를 사용자의 실제 Chrome(Chrome 158, 맥)에서 `?test=1&debug=1`로 열어 확인: 목소리 199개, en-US에 `Google US English`(localService=false)가 있는데 현재 규칙(spec 5.9.1)은 **Samantha**(local, 등급 B)를 고른다 — 같은 B 등급이면 localService 우선이라서. Google 목소리 목록: Google US English(en-US), Google UK English Female/Male(en-GB) 등.
- 이 맥의 **기본 목소리(default)는 한국어 "유나"(ko-KR)**. 현재 코드는 목록이 비었거나 장난용뿐일 때 `lang-only`(목소리 지정 없이 `u.lang='en-US'`)로 말한다 → 브라우저/OS가 기본 목소리(유나)로 영어를 읽으면 콩글리쉬가 된다(실제로 그런지는 소리를 못 들어 확인 못 함 — [추정]이지만 막는 쪽으로 설계).
- Samantha는 macOS의 오래된 compact 음성이라 억양·발음 품질이 낮다. 고품질은 "(Enhanced)"/"(Premium)" 음성(사용자가 시스템 설정에서 내려받아야 함). Safari에는 Google 음성이 없다.
- 지금 규칙·코드: spec 5.9.1, `src/audio/voicePick.ts`, `src/audio/speech.ts`, 테스트 `tests/unit/voicePick.test.ts`·`speech.test.ts`·`tests/e2e/e9-voice.spec.ts`·`tests/helpers/voices.ts`.

## 3. 할 일 — spec을 고친다 (사용자 결정 반영, 구현은 하지 않음)
1. **고르는 순서 다시 정하기**(5.9.1): 품질 순 — 애플 Premium/Enhanced 등 A 등급(기기 안 고품질) → **Google US English(및 Google 영어)** → Microsoft Natural(Online) → 표준 성인 목소리(Samantha 등) → C → D. en-US 우선, 같은 등급 안에서 localService를 더 이상 우선하지 않거나, Google을 별도 등급으로 올리는 방식 중 명확한 규칙으로. 윈도(Chrome/Edge)에서 지금보다 나빠지지 않는지(Edge의 "Microsoft Aria Online (Natural)"와 Google의 순서) 근거와 함께 정한다.
2. **한국어 기본 목소리로 영어를 읽는 일 막기**: `lang-only`를 없애거나 최소화 — 영어 목소리가 아직 정해지지 않았으면 짧게(예: 최대 몇 백 ms~1초) `voiceschanged`를 기다렸다 말하고, 끝내 영어 목소리가 없으면(장난용뿐 포함) 어떻게 할지(건너뛰기 vs lang-only) 근거와 함께. 첫 문제 설명이 빠지지 않게(시작 버튼 때 미리 목록 받기 등).
3. **Google 음성(인터넷) 관련**: 네트워크가 끊겼거나 학교망이 막으면 Google 음성이 말을 못 하거나 늦게 시작할 수 있다 — `onerror`·시작 지연 시 기기 안 목소리로 다시 말하는 대비책(예: 일정 시간 안에 `onstart`가 없으면 취소하고 다음 후보로)을 정한다. 시작 지연이 게임 진행(설명 읽기 시간·최소 시간 식)에 영향을 주지 않는지.
4. **개인정보 문구(9절, 시작 화면 안내)**: 지금 "밖으로 보내지 않음" 안내와 맞도록 — 카메라 영상은 기기 밖으로 안 나가고, 영어 읽어 주기에 Google 음성을 쓸 때 퀴즈 문장만 Google로 갈 수 있다는 사실을 아이·교사가 이해할 짧은 한국어 문구로. E1/E7(사이트 밖 요청 0) 검사는 사이트(페이지)의 요청 기준이므로 그대로 유지되는지 확인(브라우저 내장 음성의 통신은 페이지 요청이 아님).
5. **맥 Safari·iPad 안내**: Google 음성이 없는 곳에서는 고품질 음성 내려받기가 최선 — 설정 경로 안내를 어디에 둘지(교사용 문서 / `?debug=1` / 설정 화면 한 줄) 추천. 화면 문구를 새로 넣는다면 짧게.
6. **테스트 계획**: voicePick 단위(이 맥 Chrome 목록 → Google US English, 이 맥 Safari 예상 목록 → Samantha 또는 Enhanced, 윈도 Chrome·Edge 목록, 빈 목록, 기본이 한국어인 목록), speech 단위(기다렸다 말하기, Google 실패 시 대체), E9 갱신.
7. 개정 기록, 13절 Build 단계(작은 단계·완료 기준), 15절에 사용자 원문 두 개. 사용자 결정이 더 필요한 갈림길이 있으면 14절에 [추천]과 함께(없으면 바로 Build 가능하다고 적는다).

## 덧붙임 (2026-11-26) — 사용자 결정 14.4
- **U1 = "윈도는 지금 그대로"**(추천안이 아님): 윈도에서는 지금처럼 Microsoft 목소리(Chrome → David 등 기기 안, Edge → Aria Natural)를 쓴다. Google 우선은 맥(그리고 Google 목소리가 있는 그 밖의 비윈도 환경)에만. 윈도 판별 방법(목록에 Microsoft 목소리가 있으면 Microsoft를 Google보다 앞에 두는 목록 기반 규칙 vs UA/platform)을 근거와 함께 정하고 5.9.1·테스트(윈도 Chrome → David 유지)를 고친다.
- **U2 = "디버그 화면 + 안내 문서"**(추천안): `?debug=1` 한 줄 + README.md 교사용 절.
- 15절에 두 답을 원문으로 적고 14.4를 결정됨으로 정리한 뒤, 바로 Build 가능하다고 적는다.

## 4. 범위 (엄수)
- `spec.md`만 고친다. 코드·git 쓰기·npm install 금지. 확인용 빌드·브라우저 실행은 가능(서버는 끈다). 임시 파일은 scratchpad `plan-v7`: `/private/tmp/claude-501/-Users-sungchul-Desktop-play2-----/7bd2217c-e14d-425c-9176-0b2e64f9c244/scratchpad/plan-v7`
- 프로젝트 루트 `/Users/sungchul/Desktop/play2/영어게임`(한글 경로 → 항상 따옴표). spec.md는 길다(약 220KB) — 필요한 절만 찾아 읽는다(5.9, 5.9.1, 9, 12, 13, 14, 15, 부록 C).

## 5. 보고 (한국어, 짧게)
새 고르는 순서, 유나 막기 방법, Google 실패 대비, 바뀌는 문구, 테스트 계획, 사용자 결정 필요(있으면).
