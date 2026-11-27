# 수정 지침 v10 — 남은 작은 일 (Plan 몫 + Build 몫)

작성: 2026-11-27, 코디네이터

## 배경
사용자 요청 원문: "남은 작은 일들도 고쳐줘". 대상은 지난 리뷰가 남긴 선택·권장 항목이다.
- **S1 (review.md 20절 권장 2)**: `vh-body-09 chin` ↔ `vh-body-11 beard`를 avoid로 묶는다(양방향). 설명으로는 chin만 맞지만 beard의 뜻 "턱수염"에 "턱"이 있어 뜻만 아는 학생이 망설일 수 있다. body 주제는 11개라 같은 주제 오답 3장을 고르는 데 문제 없다.
- **S2 (20절 권장 1)**: spec 5.6·18.5·18.6의 "Very Hard 같은 주제 3/3/3 요구 100% 채움"은 실제로 99.7%다(`vh-time-04 decade`는 설명에 century가 나와 같은 주제 후보가 noon·anniversary 2개뿐 → 1장을 다른 주제로 채움, 규칙대로). 문장만 사실대로 고친다(문항 추가 안 함). S1 반영 뒤 숫자가 바뀌면 바뀐 숫자로.
- **S3 (23절 권장 1-①)**: 17.5-3 "겨냥·쥐기 판정(`grabCardRect()`)은 v9와 똑같다" → 판정 방식은 같지만 위 안내 스티커가 커져 START 카드 자리가 v9보다 약 11px 아래다(1180×820에서 top 337.6 → 348.6, 크기 360×160 같음). "판정 방식은 v9와 같다(카드 자리는 v6 배치대로)"로.
- **S4 (23절 권장 1-②)**: 12.4-15 ① 괄호 "세로는 띠 오른쪽 묶음 때문에 긴 설명이 두 줄·작은 글자가 되기 쉬움" → 두 줄이 는 까닭은 **카드·띠 글자 굵기 900**이고 글자 크기는 거의 그대로(349문항 중 1문항만 작아짐).

## Plan 몫 (`spec.md`만)
1. 부록 D의 chin·beard 행 avoid 칸에 서로를 넣고, 15절 결정 기록에 S1(사용자 요청 "남은 작은 일들도 고쳐줘", 2026-11-27)을 적는다. 18.5의 "설명으로 가른 짝: chin ↔ beard" 문장도 avoid로 막았다고 맞춘다.
2. S2: 5.6·18.5·18.6(그 밖에 같은 주장이 있으면 그곳도)의 Very Hard 같은 주제 채움 숫자를 사실대로. 숫자는 `npm run check:data` 출력이나 `src/data/validate.ts`의 계산 방식으로 직접 확인한다(S1 반영 전·후 모두 99.7%일 것으로 보이나 확인). S1은 Build가 JSON에 넣으므로, 필요하면 scratchpad에서 avoid를 더한 사본으로 계산해 본다.
3. S3·S4 문장 고치기.
4. 개정 기록에 한 줄.
금지: `spec.md` 외 파일 수정, git 쓰기, npm install.

## Build 몫 (`src/data/veryhard.json`, 필요하면 `tests/**`만)
1. `vh-body-09`의 avoid에 `"beard"`, `vh-body-11`의 avoid에 `"chin"`(다른 avoid 항목 형식과 같게).
2. 단위 테스트 하나: Very Hard 풀에서 정답이 chin일 때 오답 카드에 beard가 나오지 않고, 그 반대도 그렇다(여러 seed). 기존 테스트 기대값(seed 고정 카드 목록 등)이 이 변화로 바뀌면, 바뀐 까닭이 이 avoid 때문인지 확인하고 고친 곳을 보고한다.
3. `npm run check` 종료 코드 0 직접 확인(파이프 없이 `; echo "EXIT=$?"`). `npm run check:data`의 Very Hard 같은 주제 채움 숫자가 나오면 함께 보고.
금지: spec·docs·review·README·다른 src 파일 수정, git 쓰기, npm install. 임시 파일은 scratchpad `fix-v10`: `/private/tmp/claude-501/-Users-sungchul-Desktop-play2-----/7bd2217c-e14d-425c-9176-0b2e64f9c244/scratchpad/fix-v10`. 서버는 끈다. 프로젝트 경로 한글·NFD → 따옴표.

## 보고 (한국어, 짧게)
각자 바꾼 곳(파일:줄). Plan은 확인한 숫자와 계산 방법, Build는 테스트 이름과 `npm run check` 숫자.
