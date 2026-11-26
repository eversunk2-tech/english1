# Plan 수정 지침 v3b — Review 12절 문항 고치기

작성: 2026-11-26, 코디네이터
대상: Plan 서브에이전트 (Opus 5.5, 추론 강도 높음)

## 배경
Review 12절(v3 단어 수준) 판정 "수정 필요". 사용자 결정(2026-11-26): **"모두 고치기"** — 반드시 1건과 권장 문항 다듬기·source 문구까지 모두.

## 할 일 (spec.md만)
1. `review.md` 12절을 읽는다.
2. 부록 A에서:
   - nature-14 forest: avoid에 `mountain` 추가(반드시).
   - coat: "옷 위에 입는다"는 뜻이 다시 들어가게 설명 수정(Review 예: "We wear it over clothes when cold."). 같은 판 오답(shoes·socks·pants 등)이 답이 되지 않는지 확인.
   - hero: avoid에 `doctor, nurse`. lazy: avoid에 `sick`. office: avoid에 `library`.
   - fever: "gets so hot" → "gets very hot".
   - 각 수정은 V1~V10(V7'·V10 포함) 규칙과 판 구성 흉내(학년군 3 × 난이도 3 × 씨앗 수천, 현재 코드 `buildPlans`)로 다시 확인. 오답 후보 부족 0.
3. `questions.json`의 `source` 문구를 사실(초등 * + 5~6학년 중학 ** 일부)에 맞게 바꾸도록 spec(7.6.5 또는 데이터 형식 절)에 한 줄로 정해 둔다.
4. 개정 기록과 15절에 사용자 답 원문("모두 고치기")과 바꾼 표(id, 전/후, 이유)를 적는다.

## 범위
spec.md만. 코드·git 쓰기 금지. 임시 스크립트는 scratchpad `plan-v3b`.

## 보고 (한국어, 짧게)
바꾼 문항 표, 검사 결과, 사용자 결정 필요(있으면).
