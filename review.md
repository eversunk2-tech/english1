# review.md — Catch the Word! Build S1~S6 검증 (Review v1)

- 작성: 2026-11-26, Review 서브에이전트 (지침 `docs/briefs/review-brief-v1.md`)
- 기준: `spec.md`. Build 보고는 확인할 대상으로만 보았고, 아래 결과는 모두 직접 돌리거나 직접 연 스크린샷에서 나온 것이다.
- 임시 스크립트·스크린샷: `/private/tmp/claude-501/-Users-sungchul-Desktop-play2-----/7bd2217c-e14d-425c-9176-0b2e64f9c244/scratchpad/review/` (`indep/` 독립 계산, `shots/` 스크린샷)

---

## 1. 판정: **수정 필요**

> 재검토(2026-11-26, 9절) 판정: **통과** — 반드시 수정 M1~M3이 모두 고쳐졌고, 새로 찾은 반드시 수정은 0건이다.

반드시 수정할 것은 3건이다(앱 버그 1, spec 12.2 위반 1, 문항 데이터 1). 나머지 동작(점수, 판정, 배치, 개인정보, 배포 설정)은 spec과 맞았다.

---

## 2. 직접 돌린 명령과 결과

| 명령 / 검사 | 결과 |
|---|---|
| `npm run check` (typecheck → test → check:data → test:e2e) | 종료 코드 0. 타입 검사 통과 / 단위 **108 통과, 1 건너뜀**(실제 손 녹화 파일이 없어서 건너뜀. spec 12.3대로 정상) / 문항 **161개 위반 0건**(설명 낱말 1095개, 초등 어휘 비율 97.4%) / e2e **63 통과**(3개 화면 크기 × E1~E7). 실패가 없어서 따로 다시 돌릴 것은 없었다. |
| `npm run build` 뒤 `dist/` 검사 | `index.html`·JS·CSS 안에 `/`로 시작하는 경로 0개(`./assets/…`, `./favicon.svg`). `dist/`에 `mediapipe/1.2.3/vision_wasm_internal.{js,wasm}`(336,624 / 14,665,716B)와 `models/hand_landmarker.task`(7,819,105B)가 있음. 앱 JS 안의 http 주소는 MediaPipe 통계 주소 `https://odml.pa.googleapis.com/v1/log` 하나뿐이다. wasm 로더 JS 안의 주소는 모두 주석·오류 문구 속 문서 링크다. |
| 독립 계산 ① 주먹 판정(spec 4.1·4.2·4.7) | 저장소 코드를 쓰지 않은 Python으로 합성 손 7가지를 계산했다 → 4.7 표의 C·min·분류와 **7/7 같음**. |
| 독립 계산 ② 상태 기계(spec 4.3) | spec 문장만 보고 Python으로 짠 상태 기계와 `stepGesture`에 무작위 모양 순서 3,000개(프레임 간격 10~67ms 섞음, offscreen·판정 불가 포함)를 넣었다 → 잡기 4,527회, **위치까지 모두 같음(불일치 0)**. |
| 독립 계산 ③ 배치·좌표·여유·점수 | 화면 7종 × 카드 3·4장 × 씨앗 500개: 카드 가로 겹침 0, `[0.06W,0.94W]` 밖 0, 흔들림 범위 위반 0, bandH·laneW·cardW·cardH 식 불일치 0. `mapToScreen` 무작위 2,000점 독립 식과 불일치 0. 판정 여유 m 일치. `correctScore` 무작위 500건 5.5 식과 불일치 0. |
| 독립 계산 ④ 부록 A ↔ `questions.json`, 부록 B ↔ `elementary-2022.txt` | 161문항 8칸 모두 같음. 어휘 819개 같음. `clue-extra.json`은 7.3과 같음. |
| 브라우저 직접 조작(Playwright, 화면 1180×820·820×1180·1024×768) | 터치 모드 한 판(오답→정답 1, 놓침 1, 정답 8): 점수 87(=50+round(50×(1−0.2559)))·89 등 5.5 식과 맞음. 콘솔 오류 0. `?test=1`이 없으면 `window.__eg` 없음(3종 모두). |
| 카메라 모드(가짜 카메라, 1180×820에서 70초) | 손 확인 화면까지 3종 모두 도달. 검사 1,398회, GPU 대리 실행, **같은 출처가 아닌 요청 0**, 가드가 막은 요청 **1건**(MediaPipe 통계 전송, 아래 6절), 콘솔 오류 0(경고는 MediaPipe 내부 W-로그 2~6줄). 손 없이 놀이 3초 뒤 자동 일시정지 확인. [처음으로]를 누르면 카메라 트랙이 꺼지고 "카메라 켜짐" 표시도 사라짐. |
| 재생 모드로 AGAIN 카드 손 잡기 | 결과 화면의 AGAIN 카드 위에서 폄→쥠 → 카운트다운 시작 확인. |
| 교육과정 원문 대조(부록 C의 PDF) | PDF를 받아 `pdftotext`로 열었다. 무작위 20개(answer, bill, bring, carrot, drink, example, fox, friend, grow, helmet, large, maths, near, power, skirt, slow, soccer, sorry, take, worry)가 **모두 `*` 하나(초등 권장)로 있음**. |

---

## 3. 반드시 수정

### M1. 결과 화면에서 [다시 하기]/AGAIN 뒤 3·2·1 사이에 탭이 숨겨지면 게임이 멈춘 채로 영영 진행되지 않음 (재현함)
- 위치: `src/app/App.ts:340-346`(`onHidden`), `src/app/App.ts:366-369`(결과 `onAgain`), `src/app/App.ts:329-338`(`resumeGame`)
- 원인: 결과 화면에서 [다시 하기]를 누르면 끝난 판(`phase: 'finished'`)이 `this.session`에 그대로 남은 채 카운트다운에 들어간다. 이때 탭이 숨겨지면 `onHidden`이 `session`이 있다고 보고 `pauseGame('hidden')`을 부른다. 그러면 `Session.pause()`는 끝난 판이라 아무것도 하지 않고, 화면만 "잠깐 멈췄어요"가 된다. 여기서 [계속하기]를 누르면 `resumeGame` → `setScreen('playing')`으로 가지만 끝난 판의 `update()`는 바로 돌아오므로, 카드도 결과도 없는 빈 놀이 화면에 멈춘다. 빠져나가려면 [일시정지]→[처음으로]를 눌러야 한다.
- 재현: `?input=pointer&seed=7&test=1&clock=manual`로 한 판을 끝내고 → [다시 하기] → 0.5초 뒤 `visibilitychange`(hidden) → 다시 보이게 하고 [계속하기] → 3.2초 + 10초를 진행하면 `{"screen":"playing","phase":"finished","q":11,"cards":0}`(스크린샷 `shots/bug-again-hidden.png`). 교실에서 아이가 다른 앱으로 잠깐 넘어가는 일은 흔하다.
- 고치는 방향: 결과 화면의 다시 하기(버튼·AGAIN 카드 둘 다)에서 카운트다운 전에 `endSession()`을 불러 끝난 판을 지운다. 그러면 `onHidden`이 손 확인 화면으로 돌려보낸다. 덧붙여 `onHidden`·`pauseGame`에서 `session.phase === 'finished'`도 막는다. 이렇게 고치면 7-R4(카운트다운 중 옛 설명 띠가 보이는 문제)도 함께 사라진다. 고친 뒤 이 상황을 E2에 테스트로 넣는다.

### M2. 테스트 훅으로 게임 규칙 값을 바꿀 수 있음 — spec 12.2 "훅은 게임 규칙을 바꾸지 못한다" 위반 (재현함)
- 위치: `src/app/App.ts:770`(`config: { HAND, GAME }`), `src/debug/testHooks.ts:90`
- 원인: `as const`는 타입에서만 읽기 전용이고 실제 객체는 얼려 있지 않다. 그 원본 객체를 그대로 `window.__eg.config`로 내보낸다.
- 재현: `?input=pointer&seed=7&test=1&clock=manual`에서 `window.__eg.config.GAME.SCORE_FIRST_TRY = 999`로 바꾼 뒤 첫 정답을 누르면 점수가 **1041**이 된다(정상이면 최대 150). `?test=1`일 때만 열리므로 실제 사용자에게 주는 영향은 작지만, spec이 분명히 금지한 동작이다.
- 고치는 방향: `config`에는 `structuredClone`한 복사본을 넘기거나 아예 빼고(테스트가 쓰지 않음, grep으로 확인), 필요하면 `config.ts`의 상수 객체를 `Object.freeze`한다(STAGES 배열 안까지).

### M3. 문항 H1 위반: 다른 카드도 객관적으로 맞는 답이 되는 문항 3개 (판 구성 시뮬레이션으로 재현함)
`buildPlans`를 학년군마다 씨앗 5,000개로 돌려, 그 단어가 정답인 문제에서 아래 오답이 같이 나온 비율을 쟀다. Build는 부록 A를 글자 그대로 옮겨야 하므로, **Plan이 부록 A를 고치고(사용자 승인) → Build가 JSON에 반영**하는 순서로 고친다.

| id | 설명 | 같이 나오는 맞는 오답 | 비율 | 고치는 방향 |
|---|---|---|---|---|
| animal-09 bird | It has two wings and can fly. | **duck**(오리도 날개 둘, 날 수 있음. duck의 설명도 "A bird that…") | 3~4학년군 13.8%, 모두 8.8% | avoid에 `duck` 추가 |
| clothes-07 dress | A girl or a woman wears it to a party. | **hat**, **coat**(파티에 쓰고 입고 감) | 5~6학년군 18.0% / 15.9% | 설명을 바꾸거나(예: 치마와 윗옷이 한 벌로 이어진 옷) avoid에 `hat, coat` 추가 |
| feeling-05 big | An elephant is this. A mouse is not. | **heavy**(코끼리는 무겁고 쥐는 아님) | 모두 4.5% | avoid에 `heavy` 추가 |

---

## 4. 권장 수정 (배포를 막지 않음) — 13건

1. **R1 `?clock=manual`이 `?test=1` 없이도 켜짐**: `src/app/params.ts:32`. `?clock=manual`만 붙은 주소로 열면 3·2·1에서 영원히 멈춘다(재현: 4초 뒤에도 "3"). 테스트 훅이 없으면 시계를 넘길 방법도 없다. → `manualClock: test && clock==='manual'`.
2. **R2 결과→다시 하기 카운트다운 동안 지난 판의 설명 띠가 보임**(마지막 설명, `10 / 10`, 지난 점수, 눌러도 반응 없는 일시정지 버튼. 스크린샷 `shots/1180x820-10-again-countdown.png`). M1을 고치면 함께 사라진다.
3. **R3 카메라 트랙이 중간에 끊기는 경우(`ended`, 다른 앱이 카메라를 가져감)를 처리하지 않음**: `src/camera/camera.ts`. 지금은 손 없음 자동 일시정지만 되풀이되고 다시 켤 길이 없다. → 트랙 `ended`를 받으면 오류 화면(busy)으로 보낸다.
4. **R4 오류 화면 제목이 늘 "카메라를 쓸 수 없어요"**: 손 인식 파일 받기 실패(download)나 손 인식 시작 실패(init)일 때도 같은 제목이 나와 문구와 어긋난다(`src/ui/strings.ts:92`). spec에 없는 문구라 7절에도 적었다.
5. **R5 `engines.node`가 `>=22.12`**인데 `scripts/check-data.mjs`는 `.ts`를 Node가 형 정보를 지워서 바로 읽는 기능에 기대므로, 그 기능이 기본으로 켜진 Node(22.18 이상 / 23.6 이상)가 필요하다. → `>=22.18`로 올리거나 주석에 적는다(CI는 Node 24라 문제없음).
6. **R6 tsconfig `types: ["vite/client","node"]`를 한 파일로 같이 씀**: 브라우저 코드(`src/`)에서 `process` 같은 Node 전역을 써도 타입 오류가 나지 않는다. 지금 그런 코드는 없다(빌드 결과 확인). → `src`용과 `tests`·설정 파일용 tsconfig를 나누면 더 안전하다.
7. **R7 그리기 성능**: `drawCards`가 매 프레임 카드마다 `cardFontSize`로 `measureText`를 여러 번 되풀이한다(`src/render/canvasRenderer.ts:123`). → 단어·카드 크기별로 결과를 저장해 두고 다시 쓴다. 태블릿 fps(12.4-6)에서 확인할 것.
8. **R8 문항 H1·H2 애매한 짝**(씨앗 5,000개 시뮬레이션 비율, 5절 표): shirt↔hat(20.9%), bus↔train(28.8%), yesterday↔weekend(11.5%), heavy↔big(9.2%), slow("It is not fast.")↔small 등, eat↔cook, spoon↔mouth, chair↔bed, key↔hand, knife↔tooth, airplane↔pilot, wind↔cold. avoid를 더하거나 설명을 다듬을지 Plan·사용자가 정한다.
9. **R9 `serve-dist.mjs`**: 잘못된 `%` 인코딩이 들어오면 `decodeURIComponent` 예외로 서버가 죽는다(E2E 전용이라 영향 작음). → try/catch로 400을 돌려준다.
10. **R10 E6는 768×1024를 `small-landscape` 프로젝트 안에서만 화면 크기를 바꿔 잰다**(spec 6.2·12.2 요구는 충족). 결과 화면·일시정지 같은 DOM 화면의 넘침은 자동 검사가 없다. 이번에는 사람 눈으로 3종 모두 문제없음을 확인했다.
11. **R11 MediaPipe `close()`를 앱이 끝날 때 부르지 않음**: spec 3.1·10이 "다음 판을 위해 남긴다"고 정했으므로 위반은 아니다. `dispose()`가 있지만 아무 데서도 부르지 않으니 `pagehide`에서 부르거나 지운다.
12. **R12 E3의 거울 확인이 저장소의 `mapToScreen`을 기대값으로 쓴다**(`tests/e2e/e3-replay.spec.ts`, 자기 참조). "화면 오른쪽 절반"도 같이 확인해서 의미는 있지만, 기대값을 식으로 따로 계산하면 더 낫다. 이번 Review에서 독립 식 2,000점으로 따로 확인했다.
13. **R13 CI는 모든 브랜치 push와 PR에서 돈다**: 같은 커밋에서 두 번 돌 수 있다(동작에는 문제없음).

---

## 5. 문항 검사 결과 (161문항 전부 읽음, H1~H4)

- 기계 검사(V1~V9) 위반 0. 정답 단어나 그 변형이 설명에 들어간 문항은 0이다(사람 눈으로도 확인).
- **H1(정답 하나만 가리키는가)**
  - 반드시 수정(3절 M3): **animal-09 bird**(duck), **clothes-07 dress**(hat·coat), **feeling-05 big**(heavy).
  - 권장(4절 R8):
    - clothes-06 shirt "on the top part of our body"(hat)
    - transport-01 bus "A big car for many people"(train)
    - time-10 yesterday "It was Sunday"(weekend)
    - feeling-12 heavy "It is hard to carry"(big)
    - feeling-08 slow "It is not fast"(빠르지 않은 것이면 다 맞아서 설명이 약함)
    - action-05 eat "We do this with food"(cook은 동사로도 쓰임, 모두 학년군에서 0.6%)
    - home-04 spoon "We eat soup with it"(mouth)
    - school-04 chair "We sit on it"(bed)
    - home-08 key "We open a door with it"(hand)
    - home-06 knife "We cut food with it"(tooth)
    - transport-03 airplane "It flies people…"(pilot)
    - nature-11 wind "we can feel it"(cold)
- **H2(자연스러운 영어·초등 수준)**: 문법이나 철자 오류는 없다. 다듬으면 좋은 것:
  - nature-11 "We **can not** see it" → `cannot`이 표준 표기다.
  - time-09 "Today is Monday. It will be Tuesday." / time-10 "…It was Sunday."는 "It"이 무엇을 가리키는지 약하다. 수수께끼로는 통하므로 권장 수준이다.
  - transport-06 taxi "A yellow car"는 미국식이다. 한국 택시는 대개 노랗지 않다(문화 차이, 권장).
- **H3(한국어 뜻·거슬리는 내용)**: 뜻이 틀린 것은 없다. 폭력·차별·무서운 내용도 없다(police "catch bad people"도 무난).
- **H4(동사·형용사가 설명만으로 하나로 정해지는가)**: 위 H1 목록 말고는 문제없다.
- 부록 B 무작위 20개는 원문 PDF와 모두 맞았다(2절).

---

## 6. Build 보고와 실제가 다른 점

| Build 보고 | 실제 확인 |
|---|---|
| `npm run check` 전부 통과(단위 108·1 건너뜀, e2e 63) | **같음.** |
| 문항 161개 위반 0 | **같음.** 단, 사람 눈 검사(H1)에서 3건은 반드시 수정, 12건은 권장(5절). |
| MediaPipe 1.2.3 번들 안의 통계 전송(odml.pa.googleapis.com)을 `networkGuard.ts`로 막음 | **사실이다.** `vision_bundle.mjs`에서 로거가 60초마다, 그리고 `close()` 때 전역 `fetch`로 `https://odml.pa.googleapis.com/v1/log`에 protobuf를 POST하는 코드를 확인했다(`x-goog-api-key` 머리말 포함). 가짜 카메라로 70초를 돌렸더니 가드가 실제로 1건을 막았고, 콘솔 오류는 없었다. 로거는 전송이 거절되면 타이머를 지우고 멈춘다(번들 코드 확인). 다른 경로: 번들에는 XHR·sendBeacon이 없고, wasm 로더의 XHR은 같은 출처 파일 적재용이며, 그마저 CSP `connect-src 'self'`가 한 번 더 막는다. 같은 출처(모델·wasm)·blob·data 요청은 통과시킨다(E1, E5, 카메라 70초 확인). **부작용 없음.** |
| spec 11절에 없는 파일 `src/data/words.ts`·`src/ui/dom.ts` 추가 | 문제없다. words.ts는 V5 규칙을 validate와 오답 고르기가 같이 쓰려고 뺀 순수 모듈이고(의존 방향 지킴), dom.ts는 DOM 도우미다. |
| `index.html`에 `#cursor-layer` 추가 | 문제없다. 커서를 DOM 화면 위에 그리는 캔버스이고, 눌러도 아래 화면에 그대로 전달된다(터치 시험 통과). |
| START/AGAIN 카드를 DOM 버튼 위치로 손 잡기 판정 | 문제없다. 4.5와 같은 `grabTarget`·여유 m(카메라 값)을 쓰고, 재생 모드로 START(E3)·AGAIN(이번 Review) 모두 손 잡기를 확인했다. |
| tsconfig `types: node`, `predev:https` | 동작에는 문제없다. types는 4절 R6. |
| 테스트 조정(콘솔 INFO 로그 제외, `probeLayout`·`state()` 확장) | INFO 제외 규칙은 `INFO: `·`I숫자`로 시작하는 줄만 빼므로 실제 오류(E-로그, 예외)는 그대로 잡는다. `state()`는 JSON 복사본을 돌려준다. `probeLayout`은 설명 글을 잠깐 바꿨다가 되돌린다(규칙에 영향 없음). **하지만 `config`로 규칙을 바꿀 수 있다 → M2.** `?test=1` 없이는 훅이 없다(3종 확인). |
| spec에 없던 문구 4개를 임시로 넣음 | 화면에서 모두 확인했다(7절에서 결정 필요). |

---

## 7. 사용자 결정이 필요한 것

1. **문항 고치기(M3·R8)**: 부록 A는 사용자가 승인한 목록이므로, bird·dress·big(반드시)과 권장 목록을 어떻게 고칠지(avoid 추가 / 설명 바꾸기) 정해 주셔야 Plan이 spec을 고칠 수 있다.
2. **Build가 임시로 넣은 문구 4개**: "START 카드를 눌러 시작해요"(터치 모드 손 확인), 결과 화면 "AGAIN"(영어 카드), "손바닥을 펴서 보여 주면 이어서 해요"(손 없음 일시정지), "카메라를 쓸 수 없어요"(오류 화면 제목). 마지막 것은 손 인식 파일 오류에도 나오므로 "시작하지 못했어요" 같은 공통 제목을 권한다(R4).
3. **taxi "A yellow car"**를 한국 아이들에게 맞게 바꿀지(H2, 선택).

---

## 8. 자동으로 확인할 수 없어 남은 것 + 태블릿 체크리스트

**남은 것**
- 실제 손(특히 어린이 손)에서 4.6 임계값이 맞는지. 지금은 합성 손과 가짜 카메라로만 확인했다.
- iPad Safari에서 GPU 대리 실행, 속도, 말소리, 첫 발화 허용. 맥 headless Chrome에서는 GPU, 검사 약 44ms(그래서 프레임 2개 중 1개만 검사 모드), 인식 22Hz, 그리기 27~28fps였다(태블릿 기준이 아님).
- MediaPipe 경고 "Using NORM_RECT without IMAGE_DIMENSIONS…"(4:3 영상에서 매번 나옴): 라이브러리 내부 경고라 동작에는 영향이 없어 보이지만, 실제 손에서 커서가 손바닥 위에 오는지는 사람이 봐야 한다(체크리스트 2).
- GitHub Pages에서 `.wasm` 응답 형식, 첫 준비 시간, `/english1` → `/english1/` 넘겨주기.
- 화면 꺼짐 방지(wakeLock), 기기를 돌렸을 때 다시 배치되는지.

**태블릿 체크리스트 (선생님용, 배포 주소 `https://eversunk2-tech.github.io/english1/`)**

준비: iPad(Safari) 1대, 가능하면 안드로이드 태블릿(Chrome) 1대. 태블릿을 가슴 높이에 세우고 1~1.5m 떨어져 섭니다.

1. [ ] 주소를 열면 "Catch the Word!" 첫 화면과 맨 아래 카메라 안내 문장이 보인다.
2. [ ] [카메라로 시작]을 누르면 카메라 허락 창이 뜨고, 허락하면 앞 카메라 화면이 흐리게 깔리며 오른쪽 아래에 "카메라 켜짐"이 보인다. (처음에는 "손 인식 준비 중… %"가 15초 안에 끝나는지 재 보기)
3. [ ] 오른손을 오른쪽으로 움직이면 동그란 손 표시(커서)도 오른쪽으로 가고, 화면 속 내 손바닥 위에 있다.
4. [ ] 손바닥을 펴면 "이제 START 위에서 주먹을 꽉 쥐어 보세요"로 바뀌고, START 위에서 주먹을 쥐면 3·2·1이 시작된다.
5. [ ] 1m·1.5m·2m에서 각각 손을 폈다 쥐기를 10번 → 9번 이상 잡힌다. 편 손을 빨리 흔들 때는 한 번도 잡히지 않는다. (어린이 손으로 꼭 한 번)
6. [ ] 너무 멀거나 가까우면 "조금 더 가까이 와 주세요" / "조금 뒤로 가 주세요"가 뜬다.
7. [ ] 뒤에 다른 사람이 서 있어도 그 사람 손으로는 잡히지 않는다.
8. [ ] 창문을 등진 밝은 곳(역광), 어두운 교실에서 5번을 다시 해 본다.
9. [ ] 정답을 잡으면 "Great!", 효과음, 한국어 뜻, 단어 읽어 주기가 나온다. 오답을 잡으면 카드가 빨갛게 흔들리고 "Try again!"이 뜨며 점수는 그대로다.
10. [ ] 손을 3초 넘게 내리면 "손을 화면에 보여 주세요"로 멈추고, 손바닥을 펴서 보이면 3·2·1 뒤 이어서 한다.
11. [ ] 한 판(10문제)을 끝까지 하면 결과 표가 나오고, 단어를 누르면 읽어 준다. AGAIN 카드를 주먹으로 잡으면 새 판이 시작된다.
12. [ ] 게임 중 화면이 꺼지지 않는다. 태블릿을 가로↔세로로 돌려도 카드가 화면 안에 겹치지 않고 보인다.
13. [ ] 영어 읽어 주기 목소리·속도, 효과음 크기가 교실에 알맞다. 시작 화면의 소리 [끔]이 둘 다 끈다.
14. [ ] 아이가 한 판을 했을 때 팔이 너무 힘들지 않고, 떨어지는 속도가 알맞다(빠르거나 느리면 알려 주기).
15. [ ] 주소 끝에 `?debug=1`을 붙여 열면 왼쪽 아래에 숫자가 나온다 → draw(그리기)가 iPad 55 이상, detect(인식)가 20Hz 이상인지 사진을 찍어 둔다. 세 판을 연달아 해도 느려지거나 기기가 지나치게 뜨거워지지 않는다.
16. [ ] 카메라를 [허용 안 함]으로 하면 안내 문구와 [다시 시도]·[터치로 하기]가 나오고, [터치로 하기]로 손가락 누르기 게임이 된다.
17. [ ] (M1을 고친 뒤 확인) 결과 화면에서 [다시 하기]를 누르고 3·2·1 사이에 홈 버튼으로 나갔다 돌아와도 게임이 멈춘 채로 남지 않는다.

---

## 9. 재검토 (2026-11-26)

- 지침: `docs/briefs/review-fix-brief-v1.md`. 기준은 고쳐진 `spec.md`(개정 기록, 15절, 부록 A의 17문항).
- 임시 스크립트·스크린샷: `/private/tmp/claude-501/-Users-sungchul-Desktop-play2-----/7bd2217c-e14d-425c-9176-0b2e64f9c244/scratchpad/review-fix/`

### 9.1 판정: **통과**

반드시 수정 0건이다. M1·M2·M3은 모두 직접 다시 재현해서 고쳐진 것을 확인했다. 권장 2건이 새로 나왔고, 지난번 권장 중 R10 1건이 남았다.

### 9.2 직접 돌린 명령과 결과

| 명령 / 검사 | 결과 |
|---|---|
| `npm run check` | 종료 코드 0. 타입 검사는 `tsconfig.json`(src)과 `tsconfig.node.json`(tests·설정·scripts) 둘 다 통과. 단위 **112 통과, 1 건너뜀**(녹화 파일 없음). 문항 **161개 위반 0건**. e2e **78 통과**. Build 보고와 같다. |
| 독립 계산 다시 돌리기(config를 깊게 얼린 뒤) | 상태 기계 3,000개 순서 불일치 0, 배치 겹침·범위·식 불일치 0, 좌표 2,000점 불일치 0, 점수 500건 불일치 0. 얼린 뒤에도 규칙 값은 그대로다. |
| 부록 A ↔ `questions.json`, 부록 B ↔ 어휘 파일 | 161문항 8칸 모두 같음(바뀐 17문항 포함). 어휘 819개 같음. |
| 판 구성 흉내(학년군마다 씨앗 5,000개) | 9.4 표 |
| 브라우저 직접 조작(화면 3종, 터치·재생·가짜 카메라) | 9.3 표. 콘솔 오류 0. 사이트 밖 요청 0. 콘솔 오류 1건이 찍힌 적은 있지만, 내가 일부러 없는 주소(`nope.html`)로 이동했다 돌아온 시험에서 난 404였다. |
| `serve-dist`에 잘못된 `%` 인코딩 요청 | 400을 돌려준다. 그 뒤 요청도 200이므로 서버가 죽지 않는다. |

### 9.3 지난 지적별 확인

| 지적 | 결과 | 직접 확인한 내용 |
|---|---|---|
| **M1** 다시 하기 3·2·1 중 숨김 → 멈춤 | **고쳐짐** | [다시 하기] 버튼: 3·2·1 중 설명 띠가 숨겨짐 → 0.5초 뒤 hidden → 다시 보임 → 손 확인(START) 화면이 된다. 10초를 더 흘려도 그대로이고, START를 누르면 1번 문제부터 카드가 내려온다(p 0.34). **AGAIN 카드**(재생 모드, 손으로 잡기)로도 같은 순서를 돌렸다 → START 화면으로 가고, 다시 손으로 잡으면 새 판이 진행된다. 놀이 중 [일시정지]→[계속하기]의 3·2·1 사이에 숨기면 다시 "잠깐 멈췄어요"가 되고, [계속하기] 뒤 카드가 계속 내려온다(0.29→0.40). 새 E2 테스트의 판단: 고치기 전 코드라면 숨겼다 보였을 때 화면이 `paused`라서 `expect(screen).toBe('handcheck')`에서 실패하고, 그 뒤 "카드가 실제로 내려오는지(p>0)"도 확인하므로 **멈춤을 잡아낼 수 있다**. 다만 "멈춤 화면이 아니라 START로 간다"는 이번 고침 방식에 묶인 검사이고 [다시 하기] 버튼 쪽만 시험한다. AGAIN 카드는 같은 함수(`againFromResult`)를 써서 지금은 괜찮다. |
| **M2** 훅으로 규칙 값 바꾸기 | **고쳐짐** | `window.__eg`에 `config`가 없다. 훅 객체와 `clock`은 얼려 있어 `state`·`clock.step`을 바꿔 끼워도 반영되지 않고, `defineProperty`는 오류가 난다. `state()`는 복사본이라 고쳐도 다음 호출에 영향이 없다. `window.__eg` 자체를 바꿔 넣어도 그 속성만 바뀌고 앱은 영향을 받지 않는다. `clock.step(NaN)`·`step(-100)`은 아무 일도 하지 않는다. 이렇게 시도한 뒤 첫 정답 점수는 142 = 100 + round(50×(1−p))로 정상이다. `config.ts`의 모든 상수(STAGES 배열 포함)는 깊게 얼려 있다. |
| **M3** bird·dress·big | **고쳐짐** | bird↔duck, big↔heavy가 함께 나오는 비율이 0%가 됐다. dress↔hat·coat는 여전히 함께 나오지만(16~20%), 설명이 "Girls wear it. It is a top and skirt together."로 바뀌어 hat·coat는 더 이상 답이 아니다. 9.4 참고. |
| R1 `?clock=manual`이 `?test=1` 없이도 켜짐 | 고쳐짐 | `?input=pointer&clock=manual`로 열면 3.8초 뒤 `playing`이고, 훅은 없다. |
| R2 다시 하기 3·2·1 중 지난 설명 띠 | 고쳐짐 | 설명 띠가 숨겨진 것을 확인했다(스크린샷 `m1-again-countdown.png`). |
| R3 카메라 트랙 ended | 고쳐짐 | 놀이 중 트랙에 `ended`를 내면 → "시작하지 못했어요" + busy 문구 + "오류: TrackEnded"가 나오고, 카메라가 꺼지며 "카메라 켜짐" 표시도 사라진다. [다시 시도]를 누르면 손 확인 화면으로 가고 **모델은 다시 받지 않는다**(모델 요청 1회). 우리가 끈 경우([처음으로])에는 오류가 나지 않고 시작 화면이 된다. |
| R4 오류 제목 | 고쳐짐 | denied·download·init·busy 네 가지 모두 "시작하지 못했어요", 화면 3종 확인. |
| R5 `engines.node` | 고쳐짐 | `>=22.18`. |
| R6 tsconfig 나누기 | 고쳐짐 | src는 `types: ["vite/client"]`만 쓴다. typecheck가 두 설정 파일을 모두 검사한다. |
| R7 카드 글자 크기 계산 | 고쳐짐 | `cachedCardFontSize`(단어·카드 너비·높이를 키로 저장, 400개가 차면 비움). 화면 크기가 바뀌면 키가 달라져 새로 잰다. |
| R8 애매한 문항 12개 | 고쳐짐 | 사용자 결정으로 17문항을 바꿨다. 9.4 참고. |
| R9 `serve-dist` 예외 | 고쳐짐 | 9.2 참고. |
| R10 DOM 화면 넘침 자동 검사 | **남음** | Build 수정 목록에 없었다. 이번에도 화면 3종 스크린샷을 사람 눈으로 확인했고 넘침은 없다(권장 유지). |
| R11 pagehide 정리 | 고쳐짐 | `pagehide` → 카메라 꺼짐 + 손 인식기 `close()`. 이때 MediaPipe가 보내려던 통계 1건은 가드가 막았다(0→1). `pageshow(persisted)` → 시작 화면. 다시 [카메라로 시작]을 누르면 손 인식기를 새로 만들어 검사가 정상으로 돈다. 놀이 중 pagehide → 일시정지(hidden)로 바뀐다. 다른 주소로 갔다 뒤로 가기를 하면 시작 화면이다. |
| R12 E3 거울 기대값 | 고쳐짐 | 기대값을 spec 3.3 식으로 따로 계산한다(`mapToScreen`을 불러 쓰지 않음). |
| R13 CI 두 번 실행 | 고쳐짐 | `push: branches [main]` + `pull_request`. |
| Build가 스스로 정한 것: 오류 이름 `TrackEnded` | 괜찮음 | 교사가 볼 작은 글씨의 오류 이름일 뿐이고, 화면 문구는 spec 8.2 busy 그대로다. |
| Build가 스스로 정한 것: 뒤로 가기 캐시에서 돌아오면 시작 화면 | 괜찮음 | 떠날 때 카메라와 손 인식기를 정리했으므로 시작 화면부터 하는 것이 맞다. |

### 9.4 바뀐 17문항 사람 눈 검사(H1~H4)와 판 구성 흉내

- 17문항(animal-09, school-04, home-04·06·08, clothes-06·07, nature-11, transport-01·03·06, time-09·10, feeling-05·08·12, action-05)을 모두 읽었다. 영어는 자연스럽고 초등 수준이다. 정답 단어가 설명에 들어간 것은 없다(기계 검사와 일치). 한국어 뜻은 그대로다. 거슬리는 내용도 없다.
- 지금도 함께 나오는 짝이 정말 답이 되는지 하나씩 판단했다.

| 짝(정답/오답) | 함께 나오는 비율 | 판단 |
|---|---|---|
| dress / hat, coat | 5~6학년군 20.3% / 18.5% | "윗옷과 치마가 한 벌"은 hat·coat가 아니다 → 답 아님. **avoid 대신 설명을 바꾼 Plan의 판단이 맞다**(같은 주제 오답을 남겨 두는 장점도 있다). |
| shirt / hat | 29.0% | "외투 안에 입고 단추가 있다"는 모자가 아니다 → 답 아님. 타당하다. |
| bus / train, subway | 3~4학년군 29.0%, 모두 22.4% / 20.1% | "도로 위에서 많은 사람이 탄다"는 기차·지하철이 아니다 → 답 아님. 타당하다. |
| taxi / subway, train, truck | 5~6학년군 19.4% / 16.2% / 18.1% | "기사가 있고 돈을 내고 타는 **차**(car)". truck은 돈 내고 타지 않으므로 답 아님. 지하철·기차도 기사가 있고 돈을 내고 타서, "car"를 정확히 읽지 않는 아이는 헷갈릴 수 있다 → **권장 N2**(avoid에 `subway, train`을 넣거나 "a small car"로). |
| tomorrow ↔ yesterday | 13~14% | 두 설명이 "will be"와 "was", 요일 순서로 갈린다. 학습 목표에 맞는 구분이라 답이 겹치지 않는다. |
| slow / small, spoon / knife | 10~13% | 바뀐 설명으로는 답이 되지 않는다. |
| bird/duck, big/heavy, heavy/big, yesterday/weekend, eat/cook, spoon/mouth·hand, key/hand, wind/cold, airplane/pilot·bird, chair/bed | 0% | avoid나 설명 속 단어로 빠진다. |

### 9.5 새로 찾은 것

**반드시 수정: 없음.**

**권장(2건 새로 + R10 남음)**
- **N1 한국어 줄바꿈**: 오류 문구가 낱말 가운데서 끊긴다. 1180×820·820×1180에서 "…눌러 주세" / "요."처럼 나뉜다(스크린샷 `r3-track-ended.png`, `820x1180-error-init.png`). → 한국어 문단(`.error-msg`, 안내 문구)에 `word-break: keep-all`을 준다.
- **N2 taxi 남은 겹침**: 9.4 표의 taxi / subway·train. 데이터를 바꾸는 일이라 Plan과 사용자 결정이 필요하다.
- (참고, 권장 아님) 모델을 받는 도중에 `pagehide`가 나면, 이미 만들어지고 있던 손 인식기 하나가 닫히지 않고 남을 수 있다(코드를 읽고 추정). 실제 pagehide 뒤에는 페이지가 내려가거나 얼어서 영향이 거의 없다. 실제로 그 상황을 흉내 내 보니 화면 흐름은 정상이었다(손 확인 화면 → 검사 정상).

### 9.6 사용자 결정 필요
- N2: taxi 설명을 더 다듬을지(avoid에 `subway, train` 추가 또는 "a small car"). 지금 그대로 배포해도 되는 수준이다.

### 9.7 남은 것 + 태블릿 체크리스트 고친 판
- 8절의 "남은 것"은 그대로다(실제·어린이 손 임계값, iPad GPU·속도·말소리, Pages의 `.wasm` 형식, 화면 꺼짐 방지, 기기 돌리기).
- 8절 체크리스트를 다음과 같이 고친다.
  - 16번: 오류 화면 제목이 **"시작하지 못했어요"**로 나오는지도 본다.
  - 17번: M1이 고쳐졌으므로 이렇게 바꾼다. "결과 화면에서 [다시 하기]나 AGAIN 카드를 누르고 3·2·1 사이에 홈 버튼으로 나갔다 돌아오면 START 화면이 나오고, START를 누르면 새 판이 시작된다."
  - 18번(새로): 게임 중 다른 앱(예: 카메라 앱, 영상 통화)을 열어 카메라를 가져가게 했다가 돌아오면, "시작하지 못했어요" + "다른 앱이 카메라를 쓰고 있어요…"가 나온다. 그 앱을 닫고 [다시 시도]를 누르면 "손 인식 준비 중"을 다시 기다리지 않고 바로 START 화면이 된다. (iPad는 다른 앱이 카메라를 쓸 때 트랙을 끝내지 않고 잠시 멈추기만 할 수 있다. 그때는 "손을 화면에 보여 주세요"로 멈췄다가, 돌아와서 손바닥을 펴면 이어지는지 본다.)
  - 19번(새로): Safari에서 다른 페이지로 갔다가 뒤로 가기를 하면 첫 화면이 나오고, 카메라 표시등이 꺼져 있다가 [카메라로 시작]을 누르면 다시 켜진다.
