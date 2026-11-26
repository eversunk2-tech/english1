# Review 지침 v8 — 섞은 카드 더미 검증

작성: 2026-11-26, 코디네이터
대상: Review 서브에이전트 (Opus 5.5) — 새 서브에이전트, Build와 분리

## 배경
- 사용자: 문제가 되풀이되어 답을 외우게 됨 → "고치기". 기준: `spec.md` 5.6.1(더미 3종·"모두" 공유·난이도 공유·키 `catchword.bag.<풀>`·바퀴 경계·최근 30개 뒤로·판 시작 때 저장·끝내지 않은 판 되돌리기·저장 막힘 메모리·옛 recent 옮기기), 11(`?seed=`는 `?test=1`과 함께일 때만, seed 모드는 저장 안 씀), 12.1·12.2(E10), 13 B1~B4, 14.5, 15. 개정 기록의 v8 줄에서 찾는다.
- Build 보고(검증 대상, 근거 아님): `src/game/bag.ts`·`src/platform/bagStore.ts` 새로, `questions.ts`·`storage.ts`·`params.ts`·`App.ts`·`config.ts`·`validate.ts`·debug 고침, 테스트(bag ①~⑩, params, storage, E10 ①~⑦), `npm run check` 통과(단위 223, e2e 150). spec과 다르게 한 것: E8 ⑤ 기대값 변경(옛 recent 키 없어짐), `sanitizeBag`은 v===1 요구·`fitBag`, 옮길 단어 없는 더미는 빈 키 안 만듦, `storage.ts` get·set export.
- 바뀐 것: `git diff`(마지막 커밋 `9ae3d72` 이후).

## 범위
`review.md`만 — 끝에 "## 19. v8 섞은 카드 더미 검증 (2026-11-26)" 절(1절 판정 아래 한 줄 가능). 코드·spec 수정, git 쓰기, npm install 금지. 임시 파일은 scratchpad `review-v8`: `/private/tmp/claude-501/-Users-sungchul-Desktop-play2-----/7bd2217c-e14d-425c-9176-0b2e64f9c244/scratchpad/review-v8`. 서버는 끈다. 사용자의 Chrome 창은 쓰지 않는다(Playwright 새 프로필). 프로젝트 경로 `/Users/sungchul/Desktop/play2/영어게임`(한글·NFD → 따옴표, cwd 기준 경로).

## 확인할 것
1. `npm run check` 재현(종료 코드 직접), `git diff` 범위.
2. **독립 구현 비교**: spec 5.6.1 문장만으로 더미 알고리즘을 따로 짜서 실제 문항으로 수천 판(각 풀, "모두" 섞기, 학년·난이도를 바꿔 가며, 중간에 버린 판, 새로고침=저장·복원) 코드와 결과·불변식을 비교 — 한 판 안 중복 0, 바퀴마다 풀 전체 한 번씩, 같은 단어 최소 간격, 저장 값 형식.
3. **사용자 목적 확인**: 실제 빌드(테스트 훅 없는 보통 모드, `?input=pointer`)로 같은 학년을 여러 판 연속(새로고침 섞어서) — 앞 판 정답이 다시 나오지 않는지, 5-6이면 9판째 경계 동작.
4. 경계·예외: 문항 id가 바뀌거나 사라진 저장 값, 망가진 JSON, `v`가 다른 값, 저장 막힘(사생활 모드 흉내), 옛 `catchword.recent*` 옮기기 한 번만, `?seed=`가 test=1 없이 무시되는지, seed 모드가 저장을 정말 읽지도 쓰지도 않는지.
5. 판 구성·점수·문구 불변: 같은 정답 목록을 주면 오답 카드·최소 시간·점수가 v7과 같은 규칙인지(독립 계산), 화면 문구 변경 없음(`?debug=1` 더미 줄만).
6. Build가 다르게 한 4가지(E8 ⑤ 변경, sanitize, 빈 키 생략, export)가 괜찮은지 — 특히 E8 ⑤ 변경이 검사를 약하게 만들지 않았는지.
7. 회귀: 콘솔 오류 0, 사이트 밖 요청 0, 기존 테스트.

## 보고 (한국어, 짧게)
판정(`통과`/`수정 필요`), 돌린 명령과 결과, 독립 비교, 반드시 수정(파일:줄·재현·방향), 권장, 사용자 결정 필요, 사람 확인 항목.
