# Plan 지침 v5 — 영어 읽어 주기 목소리 고르기

작성: 2026-11-26, 코디네이터
대상: Plan 서브에이전트 (Opus 5.5, 추론 강도 높음)

## 배경
- 사용자 원문: "영어 스피킹이 목이 쉬고 뭔가 이상한 느낌의 목소리인데 목소리 점검해줘" → 코디네이터 점검 → 사용자 "고치기"(자동으로 자연스러운 목소리 고르기 안. 목소리 직접 선택 기능은 고르지 않았다).
- 원인(코디네이터가 확인): `src/audio/speech.ts:21-25`가 `getVoices()`에서 `lang === 'en-US'`인 **첫 목소리**를 고른다. macOS(그리고 같은 목소리 세트를 쓰는 iPadOS)는 이름순이라 첫 목소리가 장난용 **"Albert"**(일부러 쉰 목소리)다. 배포 사이트에서 이 맥의 목록을 확인했다: en-US 28개 — Albert, Bad News, Bahh, Bells, Boing, Bubbles, Cellos, Eddy, Flo, Fred, Good News, Grandma, Grandpa, Jester, Junior, Kathy, Organ, Ralph, Reed, Rocko, Samantha, Sandy, Shelley, Superstar, Trinoids, Whisper, Wobble, Zarvox(전체 180개).

## 할 일 — spec 5.9(영어 읽어 주기)를 고친다
1. **목소리 고르기 규칙**을 정한다:
   - 장난용·특수 목소리 제외 목록(애플 novelty 목소리 전부, 그 밖에 알려진 것). 이름 비교 방식(대소문자, "Eddy (영어(미국))"처럼 이름 뒤에 언어가 붙는 경우).
   - 선호 순위: 플랫폼별로 자연스러운 목소리(애플 Samantha 등, 향상된/프리미엄 음성 이름 처리, 안드로이드·크롬 "Google US English", 윈도 "Microsoft …" 자연 음성 등). en-US 우선, 없으면 en-GB 등 다른 영어. 아이에게 듣기 좋은 기준(성인 표준 목소리, Grandma/Grandpa/Rocko/Junior 같은 캐릭터 목소리는 뒤로 또는 제외 — 근거와 함께).
   - `default`·`localService` 활용 여부, 목록이 늦게 오는 경우(`voiceschanged`) 처리 — 지금 코드는 첫 호출 때 목록이 비면 목소리를 못 고르고 캐시할 수 있는지도 점검해 규칙에 넣는다.
   - 공식 문서(Web Speech API `SpeechSynthesisVoice`, 애플·구글 음성 목록)를 확인해 근거와 날짜를 적는다. 확인 못 한 것은 [추정].
2. 말하기 속도·높이(`rate 0.9`, pitch)를 그대로 둘지 판단(바꾸면 근거).
3. 테스트: 고르기 함수를 순수 함수로 만들어 단위 테스트(이 맥 목록 그대로 넣으면 Albert가 아닌 선호 목소리, 장난용만 있으면?, 빈 목록, 영어 없음, 안드로이드/윈도 예시 목록). 브라우저 테스트가 필요하면 그 방법.
4. 사람 확인 항목(iPad에서 실제로 들어 보기)을 12.4 또는 교실 체크에 더한다.
5. Build 단계와 완료 기준, 개정 기록·15절에 사용자 원문 기록. 사용자 결정이 더 필요한 갈림길이 있으면 [추천]과 함께 14절에(없으면 바로 Build 가능하다고 적는다).

## 범위
spec.md만. 코드·git 쓰기 금지. 임시 스크립트는 scratchpad `plan-v5`: `/private/tmp/claude-501/-Users-sungchul-Desktop-play2-----/7bd2217c-e14d-425c-9176-0b2e64f9c244/scratchpad/plan-v5`

## 보고 (한국어, 짧게)
고르기 규칙 요약(제외 목록, 선호 순위), 근거, 테스트 계획, 사용자 결정 필요(있으면).
