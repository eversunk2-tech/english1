# Build 지침 v4 — Very Hard + 전체 빠르기 + scientist (X1~X5 Build 몫)

작성: 2026-11-26, 코디네이터
대상: Build 서브에이전트 (Opus 5.5)

## 배경
사용자가 v4(14.3 X1~X10)를 추천안대로 승인했다. Plan이 spec 본문에 반영했다(0, 5.3.1~5.3.5, 5.5, 5.6, 5.8, 6.2, 7.4 V5b, 부록 A people-14, 부록 D·E 확정, 15절, 16.8). 16절은 근거 기록이고 **기준은 본문**이다.

## 할 일 — spec 16.8 X1~X5의 Build 몫 (X6 교실 조정은 하지 않음)
1. **X1 값**: `config.ts` E/N/H 새 단계 값, `veryhard` 난이도(카드 4/4/4, 5.0/4.0/3.5초, 같은 주제 2/3/3, ×2.0, −40), `FALL_FLOOR` 읽기 계수(3-4 0.35, 5-6 0.30, Very Hard 0.25). 기존 테스트 기대값을 spec 문장으로 다시 계산(5.3.3 수치와 맞는지).
2. **X2 데이터**: 부록 D → `veryhard.json`(spec이 정한 읽기 형식), 부록 E → `secondary-2022.txt`, `clue-extra.json`(veryhardAdvanced, 고유 명사, 그 밖에 spec이 말한 것), `validate.ts`에 Very Hard 검사(spec의 VH 규칙)와 V5b, `check-data`에 Very Hard 줄. data.test에 부록 D ↔ JSON 모든 칸 비교, V5b 예시(scientist 원문은 실패, 새 문장은 통과).
3. **X3 게임**: Very Hard면 학년 무시하고 Very Hard 풀에서만 정답·오답, 최근 목록·최고 점수 키 분리(`catchword.best.veryhard`, `catchword.recent.veryhard`), `?difficulty=veryhard`.
4. **X4 화면**: 난이도 버튼 4칸(Very Hard "매우 어려움", 별 두 개), Very Hard 고르면 학년 줄 흐림 + 안내 문구(spec 6.2 글자 그대로), 배지·결과("Very Hard · 중학 단어"), 도전 권유 Hard → Very Hard. 화면 4종(1180×820, 820×1180, 1024×768, 768×1024) 스크롤 없음, 11자 낱말(temperature, anniversary) 카드 안에 들어감(E6). 한국어 문구는 `keepWords`.
5. **X5**: `questions.json`을 부록 A에서 다시 옮겨 people-14 반영.
6. `npm run check` 전부 통과.

## 범위 (엄수)
`src/**`, `tests/**`, 필요하면 `scripts/**`. spec·docs·review.md 수정, git 쓰기, npm install 금지. 임시 파일은 scratchpad `build-v4`: `/private/tmp/claude-501/-Users-sungchul-Desktop-play2-----/7bd2217c-e14d-425c-9176-0b2e64f9c244/scratchpad/build-v4`. 서버는 끈다.

## 보고 (한국어)
단계별 한 일(파일:줄), `npm run check` 숫자, 화면 스크린샷 경로(시작 4종, Very Hard 놀이·결과), spec과 다르게 한 것, 사용자 결정 필요, 확인 못 한 것.
