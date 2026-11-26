# Review 지침 v5 — 영어 목소리 고르기 검증

작성: 2026-11-26, 코디네이터
대상: Review 서브에이전트 (Opus 5.5)

## 배경
사용자 피드백(쉰 목소리) → 원인: en-US 첫 목소리 "Albert"(장난용) → 사용자 "고치기". Plan이 spec 5.9.1(고르기 규칙)·12·13 Y1~Y4·15절을 정했고, Build가 `voicePick.ts`(새), `speech.ts`(다시 씀), 디버그 표시, 테스트(voicePick ①~⑪, speech.test, E9)를 만들었다고 보고했다(npm run check 통과, 단위 179, e2e 114 — 검증 대상일 뿐).

## 범위
`review.md`만 — 끝에 "## 16. v5 목소리 고르기 검증 (2026-11-26)" 절(1절 판정 아래 한 줄 가능). 코드·spec 수정, git 쓰기, npm install 금지. 임시 파일은 scratchpad `review-v5`. 서버는 끈다.

## 확인할 것
1. `npm run check` 재현(종료 코드), `git diff`(마지막 커밋 `d0a685f` 이후) 범위.
2. **독립 구현 비교**: spec 5.9.1 문장만 보고 고르기 규칙을 따로 짜서, spec의 예시 11개 + 무작위로 섞은 목록 수천 개(장난용·D 등급·여러 언어·등급 이름·default·localService·순서 섞기)에서 `chooseVoice`와 결과가 같은지.
3. 이 맥의 **실제 브라우저**에서: Playwright Chromium과 설치된 Chrome으로 빌드 결과를 `?debug=1`로 열어 고른 목소리가 Albert가 아닌지(Samantha 예상). 가능하면 Safari(설치된 Safari를 AppleScript 없이 열 방법이 없으면 생략하고 그렇게 적는다).
4. `voiceschanged`·빈 목록·lang-only·skip 흐름이 실제로 첫 설명을 빠뜨리지 않는지, 리스너 중복 등록·누수가 없는지, 소리 끔/켬·cancel과의 관계.
5. 장난용 목록·D 등급 목록이 macOS 실제 목소리 이름(`say -v '?'`)과 맞는지 — 이 맥 목록에서 빠진 장난용이 있는지.
6. 디버그 표시·`state().voice`가 `?debug=1`/`?test=1` 밖에서 노출되지 않는지, 게임 규칙을 바꿀 수 없는지.
7. 회귀: 콘솔 오류 0, 외부 요청 0, 기존 테스트.
8. 사용자가 iPad에서 확인할 짧은 체크(한국어, 교사용)를 절 끝에.

## 보고 (한국어, 짧게)
판정(`통과`/`수정 필요`), 반드시 수정, 권장, 사용자 결정 필요.
