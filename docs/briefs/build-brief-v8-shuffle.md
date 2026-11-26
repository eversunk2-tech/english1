# Build 지침 v8 — 섞은 카드 더미, seed는 테스트 모드에서만 (B1~B3)

작성: 2026-11-26, 코디네이터
대상: Build 서브에이전트 (Opus 5.5) — 새 서브에이전트

## 배경
사용자: "문제 나오는 순서가 똑같으니 … 답을 외우게 돼. 무작위로" → 결정 "고치기". Plan이 spec을 고쳤다: 개정 기록·v8 변경 요약, 0, 5.5, 5.6(새 5.6.1 — 더미 3종 `3-4`·`5-6`·`veryhard`, 키 `catchword.bag.<풀>` `{"v":1,"used":[],"recent":[]}`, 바퀴 경계·최근 30개 뒤로, 판 시작 때 저장, 끝내지 않은 판 되돌리기, 저장 막힘 시 메모리, 옛 `catchword.recent*` 옮긴 뒤 지우기), 9, 11, 12.1(`bag.test` ①~⑩ 등), 12.2(E10 ①~⑦), 13(B1~B4), 14.5, 15. `?seed=`는 `?test=1`과 함께일 때만, seed 모드는 저장 안 읽고 안 씀.

## 할 일
1. `CLAUDE.md`와 spec의 위 절(개정 기록 v8 줄에서 찾기)을 읽는다. spec.md는 길다 — 필요한 절만.
2. spec 13절 **B1~B3**을 순서대로(B4 사람 확인 제외). 기대값은 spec 문장으로 따로 계산(저장소 코드 결과를 기대값으로 쓰지 않음). 같은 seed의 정답 순서가 바뀌므로 특정 단어에 기대던 기존 테스트가 있으면 spec 의도대로 고친다.
3. 판 구성(카드 수·같은 주제 오답·최소 시간·점수)·화면 문구는 바뀌지 않아야 한다(`?debug=1` 더미 줄 하나만 추가).
4. `npm run check` 종료 코드 0을 직접 확인(`; echo "EXIT=$?"`). 가능하면 실제 빌드를 브라우저로 열어 여러 판 연속(새로고침 포함) 정답이 겹치지 않는지 확인.

## 범위 (엄수)
`src/**`, `tests/**`. `spec.md`, `CLAUDE.md`, `docs/**`, `review.md`, `README.md` 수정 금지. git 쓰기·npm install 금지. 임시 파일은 scratchpad `build-v8`: `/private/tmp/claude-501/-Users-sungchul-Desktop-play2-----/7bd2217c-e14d-425c-9176-0b2e64f9c244/scratchpad/build-v8`. 서버는 끈다. 사용자의 Chrome 창은 쓰지 않는다. 프로젝트 경로 `/Users/sungchul/Desktop/play2/영어게임`(한글·NFD → 따옴표, 설정에는 cwd 기준 경로).

## 보고 (한국어, 짧게)
단계별 한 일(파일:줄), 테스트, `npm run check` 숫자, 실제 브라우저 확인, spec과 다르게 한 것, 사용자 결정 필요, 확인 못 한 것.
