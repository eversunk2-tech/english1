# Build 지침 v3 — 5~6학년 단어 수준(W2~W3)

작성: 2026-11-26, 코디네이터
대상: Build 서브에이전트 (Opus 5.5)

## 배경
사용자가 v3(14.2 W1~W6)를 추천안대로 승인했다. Plan이 W1을 마쳐 spec.md 부록 A 본표가 230문항(3~4학년군 143, 5~6학년군 87)이 됐다. 기준은 spec 7.6(특히 7.6.5 검사 규칙·`clue-extra.json` 변경), 13절 W2~W3, 15절.

## 할 일
1. **W2 데이터·검사**: `questions.json`(spec대로 version 2)을 부록 A에서 스크립트로 옮기기, `clue-extra.json`(7.6.5), `validate.ts`에 V7'(5~6학년군 정답이 answerSecondary 목록에 있으면 통과)·V10(그 비율 20% 이하), `check-data` 출력, `data.test` 기대값·위반 예시(V7'·V10을 일부러 어기는 예 포함). 완료 기준: `npm run check:data` 위반 0(230문항, 5~6의 ** 약 18.4%), data.test 통과.
2. **W3 판 구성**: 문항 수·고정 씨앗의 정답 단어에 기대던 단위·e2e 테스트 고치기(기대값은 spec 문장으로). 완료 기준: `npm run check` 전부 통과, 5~6학년군 Hard 한 판을 터치 모드로 끝까지 하고 스크린샷(10낱말 설명이 설명 띠 두 줄 안).
3. **Review v2 권장(11절)**: 결과 표 "오답: cup" 줄에서 한국어 "오답:"은 한국어로, 단어만 `lang="en"`으로 나누기(`src/ui/screens.ts`).

## 범위 (엄수)
- `src/**`, `tests/**`, 필요하면 `scripts/**`. `spec.md`, `CLAUDE.md`, `docs/**`, `review.md`는 고치지 않는다(Plan이 동시에 spec의 v2 표시 문구만 정리할 수 있다 — 부록 A 내용은 바뀌지 않는다).
- git 쓰기·npm install 금지. 임시 파일은 scratchpad `build-v3`: `/private/tmp/claude-501/-Users-sungchul-Desktop-play2-----/7bd2217c-e14d-425c-9176-0b2e64f9c244/scratchpad/build-v3`. 서버는 끈다.

## 보고 (한국어)
항목별 한 일(파일:줄), `npm run check` 숫자, 스크린샷 경로, spec과 다르게 한 것, 사용자 결정 필요, 확인 못 한 것.
