# spec.md — 「Catch the Word!」 초등 영어 단어 손으로 잡기 게임 — Plan v1

- **작성일: 2026-11-26 · Plan v1** (Plan 서브에이전트, 지침 `docs/briefs/plan-brief-v1.md`와 그 덧붙임 반영)
- 이 문서는 Build·Review 서브에이전트가 따르는 **유일한 설계 기준**이다. 이 문서에 없는 것을 Build가 정해야 하면 추측으로 정하지 말고 보고에 "사용자 결정 필요"로 올린다.
- 프로젝트 루트: `/Users/sungchul/Desktop/play2/영어게임` (경로에 한글이 있으므로 명령에서 항상 따옴표로 감싼다). 배포 저장소: `eversunk2-tech/english1`.
- **표기 규칙** — 근거가 있는 문장 뒤에 표시를 붙인다.
  - **[확인]** 2026-11-26에 공식 문서·패키지 파일·서버 응답을 직접 열어 확인한 것(주소는 부록 C).
  - **[추정]** 경험·일반 지식으로 정한 값. 실제 태블릿에서 재 보고 고칠 수 있다(값은 모두 `src/config.ts` 한 곳에 모은다).
  - **[추천]** 14절 "사용자 확인 필요"에서 사용자가 바꿀 수 있는 규칙. 바뀌면 Plan이 이 문서를 고친 뒤 Build를 시작한다.
- **개정 기록**
  - 2026-11-26 Plan v1 작성. 사용자 결정: GitHub 저장소 이름 `english1`(15절).
  - 2026-11-26 Plan 수정 v1(Review v1 반영, 지침 `docs/briefs/plan-fix-brief-v1.md`): 부록 A 17문항의 설명·avoid 고침(사용자 결정 "15개 모두 고치기" + taxi·cannot), 임시 문구 3개 확정·오류 화면 제목 "시작하지 못했어요"(사용자 결정 "3개 승인 + 오류 제목 변경") — 5.1·5.7·5.8·6.2·8.2. 같은 날 덧붙임: time-09 tomorrow 설명 변경(사용자 결정 "바꾸기"). Review 권장 반영: `engines.node` `>=22.18`(2.3), `?clock=manual`은 `?test=1`일 때만(11·12.2), 카메라 트랙 `ended` → 오류 화면(3.1·8.2). 자세한 것은 15절.
  - 2026-11-26 Plan 수정 v2(Review 재검토 N2, 지침 `docs/briefs/plan-fix-brief-v2.md`): 부록 A transport-06 taxi의 avoid `bus` → `bus,subway,train`(사용자 결정 "고치기", 방법은 코디네이터 선택). 15절.
  - 2026-11-26 사용자가 14절 12개 항목을 모두 추천안대로 승인(15절).

---

## 0. 결정 요약

| 항목 | 결정 |
|---|---|
| 앱 형태 | 정적 웹앱 1쪽(SPA, 라우터 없음). 서버·DB·로그인 없음. |
| 언어·빌드 | TypeScript(strict) + Vite. UI 프레임워크 없음(DOM + Canvas 2D). 형제 프로젝트(selectio game)와 같은 Vite 8 / TS 6 계열. |
| 손 인식 | MediaPipe Tasks Vision **Hand Landmarker** (`@mediapipe/tasks-vision` **1.2.3** 고정), VIDEO 모드, 두 손까지. 주먹 판정은 우리가 직접 계산(4절). Gesture Recognizer는 쓰지 않는다. |
| 모델·wasm 파일 | **우리 사이트에 같이 올린다(자체 호스팅)**. wasm은 npm 패키지에서 빌드 때 복사, 모델(7.8MB)은 저장소에 넣고 SHA-256으로 검사. 외부 CDN 호출 0. [추천] |
| 화면 | 가로 태블릿 기준(세로도 동작). 카메라 영상을 거울처럼 뒤집어 **화면 전체 배경으로 흐리게** 깔고, 손바닥 중심에 커서를 그린다. 영상과 커서가 같은 변환을 써서 "내 손이 보이는 곳 = 잡는 곳"이 된다. |
| 잡기 판정 | 3D 손 좌표(worldLandmarks)로 네 손가락의 굽힘 정도를 0~1로 계산 → 히스테리시스(쥠 ≥0.70, 폄 ≤0.35) + 2회 연속 확인 → **펼침→쥠 전환 순간에만** 한 번 잡기. |
| 게임 | 한 판 **10문제**(약 1분 40초). 문제마다 영어 설명 1개 + 떨어지는 단어 카드 3~4개 중 정답 1개. 오답은 감점 없이 그 카드만 사라짐. 문제가 진행될수록 카드 수·속도 증가. [추천] |
| 문항 | **이 문서 부록 A에 161문항을 확정해 둔다**(3~4학년군 84, 5~6학년군 77, 15개 주제). Build는 그대로 JSON으로 옮기고, 검사 스크립트로 기계 검사, Review는 사람 눈 검사. 근거: 2022 개정 영어과 교육과정 [별표 3] 기본 어휘 중 초등 권장(*) 800개. |
| 화면 문구 | 안내·버튼·오류는 **한국어**, 퀴즈(설명·단어)와 짧은 칭찬(Great! 등)은 **영어**. |
| 카메라 대체 | 카메라가 없거나 거부되면 **터치/마우스로 하기**(같은 게임, 누르기 = 잡기). 개발·검증용 `?input=pointer`, `?input=replay`. |
| 개인정보 | 영상은 기기 안에서만 처리, 저장·전송 없음. 사이트 밖으로 나가는 요청 0개를 자동 테스트로 확인. 시작 화면에 안내. |
| 배포 | GitHub Actions → GitHub Pages, 주소 `https://eversunk2-tech.github.io/english1/`. Vite `base: './'`(상대 경로). |
| 검증 | 순수 함수 단위 테스트(Vitest, 합성 손 좌표) + 문항 검사 스크립트 + Playwright(터치 모드 한 판, 랜드마크 재생, 카메라 오류 흉내, 실제 MediaPipe 적재 확인) + 사람이 태블릿에서 체크리스트. |

---

## 1. 개요·범위·용어

### 1.1 목표
초등학생이 태블릿 앞에 서서, 화면 위쪽에 나오는 **영어 설명**(예: "A long yellow fruit. Monkeys love it.")을 읽고(듣고), 위에서 떨어지는 단어 카드 3~4개 중 맞는 것(banana)이 있는 **허공으로 손을 옮겨 주먹을 쥐어** 잡는다.

### 1.2 이번 사이클 포함
- 게임 한 종류(위 규칙), 학년군 고르기(3~4 / 5~6 / 모두), 카메라 모드·터치 모드, 결과·복습 화면, 소리(효과음·영어 읽어 주기), 최고 점수(기기 안 저장).
- 문항 161개, 검사 스크립트, 자동 테스트, GitHub Pages 배포 워크플로.

### 1.3 제외(다음 사이클 후보)
- 교사용 문항 편집 화면, 여러 명 대전, 순위표 서버, 학생 이름 입력, 오프라인 설치(PWA), 손 인식 개인 보정(calibration) 화면(13절 S7에서 실제 값이 나쁘면 후보로 올림).

### 1.4 용어
| 용어 | 뜻 |
|---|---|
| 판(game) | 시작 ~ 결과 화면까지. 10문제. |
| 문제(question) | 설명 1개 + 카드 3~4개가 떨어지는 한 차례. |
| 카드(card) | 떨어지는 영어 단어 상자. 정답 1장 + 오답 2~3장. |
| 설명(clue) | 정답 단어를 가리키는 쉬운 영어 문장. 정답 단어를 포함하지 않는다. |
| 손 트랙(track) | 카메라에서 찾은 손 하나를 프레임 사이에 이어 붙인 것(최대 2개). |
| 쥠 점수 C | 네 손가락이 얼마나 굽었는지 0(폄)~1(주먹). 4절. |
| 잡기(grab) | 손 트랙이 "폄 → 쥠"으로 바뀐 순간 1번 일어나는 사건. 터치 모드에서는 화면을 누른 순간. |
| 놀이 영역 | 화면에서 설명 띠(위쪽)를 뺀 아래 부분. 카드가 떨어지는 곳. |

---

## 2. 기술 선택과 이유

### 2.1 손 인식: MediaPipe Hand Landmarker (Gesture Recognizer 아님)

- 패키지: `@mediapipe/tasks-vision` — npm `latest` 태그가 **1.2.3**(2026-11-11 게시), 라이선스 Apache-2.0. **정확히 `1.2.3`으로 고정**(`^` 없이). 매일 나오는 `1.3.0-rc.*`(nightly)는 쓰지 않는다. [확인: npm registry]
- 브라우저에서 wasm으로 돈다. 사용법(공식 Web 가이드) [확인]:
  - `FilesetResolver.forVisionTasks(basePath)` → `HandLandmarker.createFromOptions(fileset, { baseOptions: { modelAssetPath | modelAssetBuffer, delegate: "GPU" | "CPU" }, runningMode: "VIDEO", numHands, minHandDetectionConfidence, minHandPresenceConfidence, minTrackingConfidence })`
  - 매 프레임 `handLandmarker.detectForVideo(video, timestampMs)` → `HandLandmarkerResult { landmarks: NormalizedLandmark[][], worldLandmarks: Landmark[][], handedness: Category[][] }`. `landmarks`의 x·y는 영상 너비·높이로 0~1 정규화, `worldLandmarks`는 손 중심을 원점으로 한 미터 단위 3D.
  - 손 하나당 21점: 0 WRIST, 1~4 엄지(CMC, MCP, IP, TIP), 5~8 검지(MCP, PIP, DIP, TIP), 9~12 중지, 13~16 약지, 17~20 새끼.
  - 옵션 기본값: `numHands` 1, 세 confidence 모두 0.5. VIDEO 모드에서는 앞 프레임의 손 상자를 다음 프레임에 다시 써서(추적) 손바닥 찾기를 건너뛰므로 빠르다.
  - 공식 지연 시간(Pixel 6, 전체 파이프라인 평균): Hand Landmarker CPU 17.12ms / GPU 12.27ms, Gesture Recognizer CPU 16.76ms / GPU 20.87ms.
  - 패키지의 타입 정의(`vision.d.ts`, 1.2.3)에 따르면 `delegate`는 `"CPU" | "GPU"`, GPU 처리에는 `canvas` 옵션(HTMLCanvasElement 또는 OffscreenCanvas)을 줘야 한다. `createFromModelBuffer`, `close()`가 있다.
  - `handedness`의 Left/Right는 "찍힌 사람" 기준이고, 좌우를 뒤집은 영상을 넣으면 반대로 나온다. 우리는 판정에 handedness를 쓰지 않는다.
- **Gesture Recognizer를 쓰지 않는 이유**
  1. 기본 제스처 `Closed_Fist`/`Open_Palm` 분류는 속이 보이지 않아 임계값·히스테리시스를 우리가 조절할 수 없고, 합성 좌표로 단위 테스트할 수 없다.
  2. 손 위치를 위해 랜드마크는 어차피 필요하다. Hand Landmarker만 쓰면 GPU 기준 더 빠르고(12.27 vs 20.87ms), 모델도 작다(7.8MB vs 8.4MB). [확인: 서버 응답 크기]
  3. 우리가 만든 계산식(4절)은 3D 좌표로 계산해 손을 돌려도 같은 값이 나오고(합성 손으로 확인, 4.7), "검지만 편 손가락질"을 주먹으로 잘못 보지 않게 막을 수 있다.

### 2.2 앱 형태·언어·도구
- 정적 웹앱. 카메라(`getUserMedia`)는 **보안 컨텍스트(HTTPS, localhost, file:)에서만** 열린다. 보안 컨텍스트가 아니면 `navigator.mediaDevices`가 `undefined`다. [확인: MDN] → 배포는 HTTPS인 GitHub Pages.
- Vite + TypeScript(strict). 형제 프로젝트 `selectio game`이 Vite 8 + TypeScript 6 + Vitest 5를 써 왔으므로 같은 계열로 맞춘다. UI 프레임워크(Preact 등)는 쓰지 않는다 — 화면이 적고 게임 루프는 Canvas라 DOM 몇 장으로 충분하다.
- 그림: 게임 화면(카드·커서·효과)은 `<canvas>` 한 장에 Canvas 2D로 그리고, 설명 띠·점수·버튼·안내 화면은 그 위의 DOM으로 만든다(글자가 선명하고 접근성 도구가 읽을 수 있음). 아이콘은 인라인 SVG(이모지 쓰지 않음 — 기기마다 모양이 달라서).
- 글꼴: 시스템 글꼴(`system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`). 웹 글꼴 파일을 받지 않는다(외부 요청 0 유지).

### 2.3 의존성(정확한 버전으로 고정, `package-lock.json` 커밋)
| 패키지 | 버전 | 구분 | 비고 |
|---|---|---|---|
| `@mediapipe/tasks-vision` | `1.2.3` | dependencies | [확인] 2026-11-11 게시, latest |
| `vite` | `8.3.8` | dev | [확인] 2026-11-11 게시, engines node `^20.19.0 \|\| >=22.12.0` |
| `typescript` | `6.0.3` | dev | 형제 프로젝트와 같은 줄. 7.x(2026-07~)는 이번 사이클에서 쓰지 않는다 [추정: 위험 줄이기] |
| `vitest` | `5.1.1` | dev | [확인] peer `vite ^6 \|\| ^7 \|\| ^8` |
| `@playwright/test` | `1.65.1` | dev | [확인] 2026-11-13 게시 |
| `@types/node` | `24.19.4` | dev | |
| `@vitejs/plugin-basic-ssl` | `2.3.0` | dev | 태블릿을 같은 와이파이에서 `https://<맥 IP>:5173`로 시험할 때만(`npm run dev:https`). [확인] peer vite ^8 |

- Node: 이 맥은 v24.21.0 [확인]. `package.json`의 `engines.node`는 `>=22.18`, CI는 Node 24. (`scripts/check-data.mjs`가 `.ts` 파일을 Node의 형 지우기(type stripping)로 바로 읽는데, 이 기능이 기본으로 켜진 판이 22.18 이상이다 — Review v1 R5. [추정: Node 릴리스 기록, Review가 적은 값])
- `"type": "module"`.

### 2.4 모델·wasm 파일을 어디서 받나 — 자체 호스팅 [추천]
- **wasm**: 패키지 1.2.3 안에 `wasm/vision_wasm_internal.js`(336,624B)와 `wasm/vision_wasm_internal.wasm`(14,665,716B)가 있다(모듈판 `vision_wasm_module_internal.*`도 있으나 쓰지 않음). [확인: jsDelivr 파일 목록] `forVisionTasks(base)`는 `${base}/vision_wasm_internal.js`·`.wasm` 두 파일 경로만 만든다(1.2.3 번들 코드 확인, SIMD 여부로 파일을 고르지 않음). 로더 `.js`는 `<script crossorigin="anonymous">`를 `document.body`에 붙여 읽는다. [확인: vision_bundle.mjs]
  - `scripts/copy-mediapipe.mjs`가 `node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_internal.{js,wasm}`를 `public/mediapipe/1.2.3/`로 복사한다(버전이 경로에 들어가 캐시가 꼬이지 않음). 이 폴더는 `.gitignore`. `predev`·`prebuild`·`pretest:e2e`에서 자동 실행. 스크립트는 설치된 패키지 버전이 `1.2.3`이 아니면 실패한다.
  - 코드에서는 `FilesetResolver.forVisionTasks(new URL('mediapipe/1.2.3', document.baseURI).href)` — 끝에 `/`를 붙이지 않는다. 상대 `base`에서도 맞는 절대 주소가 된다.
- **모델**: `hand_landmarker.task` (float16, 7,819,105 바이트).
  - 공식 Web 가이드는 Hugging Face 주소 `https://huggingface.co/litert-community/MediaPipe-HandLandmarker-Full/resolve/main/hand_landmarker.task`를 안내하고, 패키지 README는 `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`를 쓴다. 두 주소 모두 200 응답, 크기 7,819,105B로 같다. Hugging Face의 LFS 정보에 적힌 SHA-256: `fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1`. [확인]
  - Build가 S1에서 한 번 받아 `public/models/hand_landmarker.task`로 **저장소에 커밋**한다(`scripts/fetch-model.mjs`: 파일이 없을 때만 Google 주소에서 받고 SHA-256이 위 값과 같은지 검사, 다르면 Hugging Face 주소로 다시 받아 검사, 그래도 다르면 실패). 단위 테스트 하나가 커밋된 파일의 SHA-256을 다시 검사한다.
  - 앱은 모델을 `fetch`로 받으며 진행률(%)을 보여 주고(`Content-Length` 7,819,105 기준), 받은 `Uint8Array`를 `modelAssetBuffer`로 넘긴다.
- **자체 호스팅 이유**: 학교 망이 CDN(jsDelivr·googleapis·huggingface)을 막는 경우를 피하고, 버전이 바뀌지 않으며, "사이트 밖으로 요청 0개"(9절)를 지킬 수 있다. 첫 접속 때 약 22.5MB(모델 7.8 + wasm 14.7)를 받는다 — 이후는 브라우저 캐시.
- GitHub 저장소 용량: 모델 7.8MB 1개만 커밋(GitHub 파일당 100MB 제한과 무관, Pages 사이트 1GB 이하 [확인]).

### 2.5 배포: GitHub Pages `/english1/` (사용자 결정 반영)
- 저장소 `eversunk2-tech/english1` — 2026-11-26 `gh repo view`로 보니 **이미 만들어져 있고 비어 있으며 공개(PUBLIC)** 상태다. [확인] 공개 여부는 사용자가 아직 정하지 않았다(14절 1번).
- 주소: `https://eversunk2-tech.github.io/english1/` (프로젝트 사이트 = 하위 경로).
- Vite `base: './'` — 상대 경로라 하위 경로 `/english1/`, 개발 서버 `/`, 다른 곳 어디서든 같은 빌드가 열린다(형제 프로젝트와 같은 방식). 해시 라우팅도 쓰지 않는다(1쪽짜리). 코드 안의 모든 파일 주소는 `new URL('<상대경로>', document.baseURI)`로 만든다. **`/`로 시작하는 주소를 쓰지 않는다**(쓰면 `/english1/`가 빠진 주소가 되어 404) — 검사 테스트로 막는다(12.2 E1).
- 배포 방법: GitHub Actions 사용자 지정 워크플로(`.github/workflows/pages.yml`) — `main`에 푸시되면 `npm ci` → 단위 테스트 → 빌드 → `actions/configure-pages@v5` → `actions/upload-pages-artifact@v3`(`dist/`) → `actions/deploy-pages@v4`. 권한 `contents: read, pages: write, id-token: write`, 환경 `github-pages`. 형제 프로젝트 `game2/.github/workflows/pages.yml`과 같은 모양. [확인: GitHub Docs "Configuring a publishing source" — Source를 "GitHub Actions"로 바꾸고 upload-pages-artifact/deploy-pages를 쓰는 흐름]
  - **처음 한 번**: 저장소 Settings → Pages → Build and deployment → Source를 "GitHub Actions"로 바꿔야 한다(Embed 단계에서 코디네이터가 하거나 사용자에게 부탁).
  - 사용자 지정 워크플로로 올리면 Jekyll을 거치지 않으므로 `.nojekyll`은 필요 없다. 시간당 10회 빌드 제한도 적용되지 않는다. [확인: GitHub Pages limits]
- 주의점
  - **GitHub Free 개인 계정은 공개 저장소에서만 Pages를 쓸 수 있다**(비공개 저장소의 Pages는 Pro 이상). [확인: GitHub's plans 문서] → 14절 1번.
  - `https://eversunk2-tech.github.io/english1`(끝 `/` 없음)은 GitHub가 `/english1/`로 넘겨준다 [추정]. 안내할 주소는 항상 끝에 `/`를 붙인다.
  - GitHub Pages의 응답 캐시는 짧다(약 10분) [추정]. 새 배포 직후 옛 파일이 보이면 새로고침.
  - `.wasm`의 MIME이 `application/wasm`이 아니면 Emscripten이 느린 방식으로 대신 읽는다(동작은 함). 배포 후 확인 항목(12.4)에 넣는다. [추정]
- CI: `.github/workflows/ci.yml` — push·PR마다 `npm ci` → 타입 검사 → 단위 테스트 → 문항 검사 → 빌드 → Playwright(chromium). `runs-on: ubuntu-24.04` 고정(형제 프로젝트에서 ubuntu-latest 변경으로 Playwright 설치가 깨진 기록이 있음).

### 2.6 지원 기기·브라우저
- 목표: **iPad Safari(iPadOS 17 이상)**, **안드로이드 태블릿 Chrome(최근 2년 판)**. 개발·검증: 맥 Chrome/Safari.
- 근거: Vite 8 빌드 기본 대상이 Safari 16.4 이상 [추정: Vite 기본값 `baseline-widely-available`]. MediaPipe 1.2.3 번들은 Safari 17 미만에서 OffscreenCanvas를 쓰지 않는 분기를 갖고 있다 [확인: 번들 코드] → 16.4~16.x도 돌 수 있으나 시험하지 않는다.
- 가로 방향 권장. 세로에서도 같은 규칙으로 동작하되 카드 폭이 좁아진다(5.4). 화면이 돌아가면 즉시 다시 배치한다.

---

## 3. 카메라와 화면 좌표 대응

### 3.1 카메라 열기
```ts
navigator.mediaDevices.getUserMedia({
  audio: false,
  video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30, max: 30 } },
})
```
- `<video autoplay playsinline muted>`(iPad Safari는 `playsinline`·`muted`가 없으면 전체 화면 재생이나 자동 재생 실패) [추정: 널리 알려진 Safari 동작]. `video.play()`의 Promise 실패도 잡는다.
- `facingMode: 'user'`는 앞 카메라를 고르라는 요청(강제 아님). [확인: MDN 예시]
- 실제 크기는 매 프레임 `video.videoWidth/videoHeight`로 읽는다(기기를 돌리면 가로·세로가 바뀔 수 있음).
- 판이 끝나도 카메라는 켜 둔다(다음 판 바로 시작). "처음으로"로 시작 화면에 가면 트랙을 `stop()`해 카메라 표시등을 끈다. 탭이 숨겨지면(`visibilitychange`) 게임을 일시정지하지만 카메라는 끄지 않는다.
- 카메라 영상 트랙이 우리가 끄지 않았는데 끝나면(`track`의 `ended` 사건 — 다른 앱이 카메라를 가져감, 장치 분리 등) 놀이·손 확인 중이든 아니든 **오류 화면(busy, 8.2의 `NotReadableError` 줄 문구)**으로 보낸다. 우리가 `stop()`해서 끝난 경우는 무시한다. [다시 시도]는 카메라를 처음부터 다시 연다(모델은 다시 받지 않음). (Review v1 R3)

### 3.2 영상 표시: 거울 + cover
- 영상은 화면 전체(`position: fixed; inset: 0`)에 `object-fit: cover; object-position: 50% 50%; transform: scaleX(-1)`로 깐다. 그 위에 어두운 막 `rgba(8, 16, 32, 0.45)`를 덮어 카드가 잘 보이게 한다[추천: 14절 6번]. 터치 모드에서는 영상 대신 단색 배경.
- 거울 모드: 사용자가 오른손을 오른쪽으로 옮기면 화면 속 손도 오른쪽으로 간다.

### 3.3 변환식 (`src/hand/mapping.ts`, 순수 함수)
입력: 정규화 좌표 `(u, v)`(MediaPipe `landmarks`의 x, y, 0~1), 영상 크기 `vw × vh`, 화면(뷰포트 CSS px) `W × H`.
```
s  = max(W / vw, H / vh)          // object-fit: cover 배율
dw = vw * s,  dh = vh * s          // 화면에 그려진 영상 크기
ox = (W - dw) / 2, oy = (H - dh) / 2
x  = ox + (1 - u) * dw             // 거울: u → 1 - u
y  = oy + v * dh
```
- 결과 `(x, y)`가 화면 밖이면(cover로 잘려 보이지 않는 부분) `offscreen = true`로 표시하고 좌표는 화면 안으로 자른다(clamp). **offscreen인 손은 잡기를 할 수 없다**(가장자리에 붙은 가짜 잡기 방지). 커서는 반투명으로 가장자리에 보인다.
- 터치 모드: 포인터 좌표를 그대로 쓴다(뒤집지 않음).
- CSS 크기와 캔버스 픽셀: 캔버스는 `W × H` CSS px, 내부 해상도는 `W·dpr × H·dpr`, `dpr = min(devicePixelRatio, 2)`. 게임 로직은 모두 CSS px.
- 화면비가 다를 때: 4:3 영상을 16:10 화면에 cover로 깔면 영상 위아래가 잘린다 — 잘린 곳의 손은 offscreen. 이것은 사용자가 화면에서 자기 손이 보이지 않는 곳이므로 직관과 맞다.

### 3.4 "손의 위치"로 쓰는 점: 손바닥 중심
- `P = 평균(landmarks[0], [5], [9], [13], [17])` (손목 + 네 손가락 뿌리). 주먹을 쥐는 동안 손끝은 크게 움직이지만 이 점은 거의 움직이지 않는다. [추정]
- 커서 떨림 줄이기(지수 이동 평균, 적응형): 이번 원시 좌표 `p`, 앞 평활 좌표 `q`, `d = |p - q|`(px), `D = 화면 대각선`.
  `α = clamp(0.25 + d / (0.05 · D), 0.25, 0.85)`, `q' = q + α (p - q)`. 첫 프레임은 `q' = p`. (빨리 움직이면 바로 따라가고, 멈추면 떨림을 누름.) [추정]

### 3.5 손 크기(거리) 안내
- `palm = |landmarks[0] - landmarks[9]|` 를 **영상 픽셀**(x·vw, y·vh)로 잰 뒤 `vh`로 나눈 값.
- `palm < 0.035` → "조금 더 가까이 와 주세요", `palm > 0.20` → "조금 뒤로 가 주세요". 안내만 하고 게임은 계속한다. [추정: 1~1.5m 거리에서 어린이 손바닥 길이 약 7cm, 세로 화각 약 1.1m일 때 0.06 근처]
- `palm < 0.025`인 손은 무시한다(너무 멀거나 잘못 찾은 손).
- 여러 손이 보일 때: 가장 큰 `palm`의 0.6배보다 작은 손은 무시(뒤에서 구경하는 다른 학생의 손). 남은 손 중 큰 순서로 최대 2개.

---

## 4. "움켜쥐기" 판정

### 4.1 손가락 굽힘 계산 (`src/hand/fist.ts`, 순수 함수)
`worldLandmarks`(3D, 미터)를 쓴다 — 회전·크기에 영향을 받지 않는다. 엄지는 쓰지 않는다(주먹 모양마다 엄지 위치가 제각각).
```
손가락 f ∈ { 검지:(5,8), 중지:(9,12), 약지:(13,16), 새끼:(17,20) }   // (MCP, TIP)
w   = world[0]
R_f = |world[TIP_f] - w| / |world[MCP_f] - w|          // 3D 거리 비
c_f = clamp((R_OPEN - R_f) / (R_OPEN - R_FIST), 0, 1)   // 0 = 쭉 폄, 1 = 다 굽힘
C   = (c_검지 + c_중지 + c_약지 + c_새끼) / 4
R_OPEN = 1.80, R_FIST = 0.90                              [추정]
```
- `|world[MCP_f] - w| < 1e-4`이거나 값이 NaN이면 그 프레임은 "판정 불가"(상태 유지).

### 4.2 한 프레임의 모양 분류
| 분류 | 조건 [추정] |
|---|---|
| `FIST`(쥠 후보) | `C ≥ 0.70` **그리고** `min(c_f) ≥ 0.45` (손가락 하나라도 쭉 펴져 있으면 주먹 아님 → 검지만 편 "가리키기"는 주먹이 아니다) |
| `OPEN`(폄 후보) | `C ≤ 0.35` |
| `MIDDLE` | 그 밖(히스테리시스 띠). 확정 상태를 바꾸지 않는다. |

### 4.3 손 트랙별 상태 기계 (`src/hand/gestureState.ts`, 순수, 시각 `t`(ms)를 인자로 받음)
상태: `NONE`(방금 나타남) → `OPEN` ⇄ `CLOSED`.
- **확정 규칙(떨림 방지)**: 같은 후보가 **연속 2회 이상**이고 첫 후보부터 **50ms 이상** 지났을 때 확정. (30fps면 약 67ms, 15fps면 133ms.) 중간에 다른 후보나 `MIDDLE`이 끼면 세기를 처음부터.
- **잡기(grab) 사건**: 확정 상태가 `OPEN`이었고 그 `OPEN`이 **150ms 이상** 이어진 뒤 `CLOSED`로 확정되는 순간 **딱 1번**.
  - `NONE`에서 바로 `CLOSED`가 확정되면 잡기 없음(주먹 쥔 채 화면에 들어온 손 → 먼저 펴야 함).
  - `CLOSED` 동안 손을 움직여 다른 카드 위로 가도 잡기 없음. 다시 `OPEN`이 확정돼야 다음 잡기가 가능.
  - offscreen인 순간의 잡기는 버린다(상태는 `CLOSED`로 바꾼다).
- **손을 잃음**: 그 트랙의 검출이 **250ms** 넘게 없으면 트랙을 지운다. 다시 나타나면 새 트랙(`NONE`).
- 쥠 점수 `C`는 평활하지 않는다(2회 확정이 그 역할). 커서 위치만 평활한다(3.4).

### 4.4 여러 손 이어 붙이기 (`src/hand/handTracks.ts`, 순수)
- `numHands: 2`로 검출. 3.5의 크기 걸러내기 후 남은 손들을, 기존 트랙과 **손바닥 중심(화면 px) 거리가 가장 가까운 쌍부터** 짝짓는다(거리 `< 0.25 · 화면 대각선`일 때만). 짝 없는 손은 새 트랙(id는 1부터 늘어나는 정수). 트랙은 최대 2개. [추천: 14절 5번 "두 손 허용"]
- handedness는 쓰지 않는다(거울 영상·아이들 손에서 자주 뒤바뀜 [추정]).

### 4.5 잡은 위치와 카드 판정 영역
- 잡기 사건이 나면 **두 점**으로 카드를 찾는다: ① 그 순간의 평활 커서 위치, ② 같은 트랙이 마지막으로 `OPEN`이었던 프레임의 커서 위치(400ms 이내일 때만). 주먹을 쥐며 손이 살짝 내려가도 겨냥한 카드가 잡히게 한다.
- 판정 영역: 카드 사각형을 사방으로 `m = max(24, 0.035 · min(W, H))` px 넓힌 사각형. 터치 모드는 `m = 8`px.
- ①에 걸린 카드가 있으면 그것, 없으면 ②. 둘 이상 걸리면 카드 중심이 점에 가장 가까운 것.
- 카드의 중심 y가 놀이 영역 위쪽(설명 띠 아래 경계)보다 위에 있으면(아직 띠 뒤에 숨어 있으면) 잡을 수 없다. 이미 사라지는 중인 카드(오답 처리 중)도 제외.
- **겨냥 표시**: 커서가 판정 영역 안에 있는 카드는 테두리를 밝게 빛낸다(어느 카드를 잡게 될지 미리 보여 줌). 커서 둘레에는 `C`만큼 차오르는 고리를 그리고, `CLOSED`이면 주먹 모양, 아니면 편 손 모양 아이콘. 트랙마다 색이 다르다(1번 노랑, 2번 하늘).

### 4.6 매개변수 목록 (`src/config.ts`의 `HAND`)
`R_OPEN 1.80`, `R_FIST 0.90`, `FIST_ENTER 0.70`, `FIST_MIN_FINGER 0.45`, `OPEN_EXIT 0.35`, `CONFIRM_FRAMES 2`, `CONFIRM_MS 50`, `ARM_OPEN_MS 150`, `LOST_MS 250`, `PREV_OPEN_LOOKBACK_MS 400`, `HIT_MARGIN_MIN_PX 24`, `HIT_MARGIN_RATIO 0.035`, `TOUCH_HIT_MARGIN_PX 8`, `PALM_TOO_FAR 0.035`, `PALM_TOO_CLOSE 0.20`, `PALM_IGNORE 0.025`, `SECOND_HAND_RATIO 0.6`, `TRACK_MATCH_RATIO 0.25`, `MIN_HAND_DETECTION_CONF 0.6`, `MIN_HAND_PRESENCE_CONF 0.6`, `MIN_TRACKING_CONF 0.5`. 모두 [추정] — 13절 S7에서 실제 태블릿 값으로 고칠 수 있다(고치면 이 표도 고친다).

### 4.7 합성 손(테스트용) 모양과 기대값 — Plan이 2026-11-26 직접 계산해 확인
`tests/helpers/handSynth.ts`가 아래 기하로 21점 `worldLandmarks`를 만든다(단위는 아무거나, 비율만 중요).
- 손목 = 원점. 손바닥 평면 = x(가로)·y(위), 손바닥 쪽 = +z.
- MCP 위치(x, y, 0): 검지 (−0.32, 0.95), 중지 (−0.10, 1.00), 약지 (0.12, 0.95), 새끼 (0.32, 0.85).
- 마디 길이(MCP→PIP, PIP→DIP, DIP→TIP): 검지 0.42/0.25/0.20, 중지 0.45/0.28/0.21, 약지 0.42/0.27/0.20, 새끼 0.33/0.20/0.18.
- 굽힘 정도 `k`(0~1)에서 세 관절 각도 = MCP 90°·k, PIP 100°·k, DIP 60°·k(누적). 방향 = (0, cos θ, sin θ), θ = 누적각. 엄지는 대충(손바닥 옆) 둔다.
- 기대값(이 식으로 계산한 결과):

| 손 모양 | 네 손가락 k | C | min c_f | 분류 |
|---|---|---|---|---|
| 쭉 편 손 | 0,0,0,0 | 0.013 | 0 | OPEN |
| 살짝 편 손 | 0.15 ×4 | 0.028 | 0 | OPEN |
| 3할 굽힘 | 0.3 ×4 | 0.149 | 0.083 | OPEN |
| 반쯤 굽힘 | 0.5 ×4 | 0.491 | 0.445 | MIDDLE |
| 7할 굽힘 | 0.7 ×4 | 0.886 | 0.869 | FIST |
| 주먹 | 1 ×4 | 1.0 | 1.0 | FIST |
| 가리키기 | 0,1,1,1 | 0.75 | 0 | MIDDLE |

- 3D 임의 회전 200가지·크기 0.5배/2배에서도 C가 같아야 한다(차이 < 1e-9).
- 화면용 `landmarks`(정규화 2D)는 같은 3D 점을 정사영해 원하는 화면 위치·크기로 옮겨 만든다(위치 테스트용).

---

## 5. 게임 규칙

### 5.1 한 판의 흐름
1. 시작 화면 → (카메라 모드) 카메라 허락 → 손 인식 준비(진행률) → **손 확인 화면**: 화면 가운데 큰 `START` 카드. "손바닥을 펴서 보여 주세요" → 손이 `OPEN`으로 확정되면 "이제 START 위에서 주먹을 꽉 쥐어 보세요" → START를 잡으면 3·2·1 뒤 시작. (연습이자 사용법 안내.) 터치 모드는 손 확인 대신 **"START 카드를 눌러 시작해요"**를 보여 주고, START 카드를 누르면 바로 3·2·1.
2. 문제 1~10을 차례로.
3. 결과 화면.

### 5.2 한 문제
1. 설명 띠에 영어 설명이 나오고(소리 켬이면 영어로 읽어 줌), 카드 3~4장이 위에서 나타나 떨어진다.
2. **정답을 잡으면**: 카드가 터지는 효과 + "Great!"(첫 시도) 또는 "Good job!"(오답 뒤) + 카드 자리에 한국어 뜻 표시 + 단어 읽어 주기 → 나머지 카드는 흐려지며 사라짐 → 1.5초 뒤 다음 문제.
3. **오답을 잡으면**: 그 카드가 빨갛게 흔들리고(0.3초) 사라진다. "Try again!" 짧게 표시, 오답 소리. 점수 깎지 않음, 연속 정답(콤보)만 0으로. 같은 문제는 남은 카드로 계속. [추천: 14절 4번]
4. **놓침**: 정답 카드가 화면 아래로 완전히 빠지면(오답 카드가 남아 있어도) 문제 끝. 정답 카드를 화면 가운데에 2초 보여 준다: "The answer is **banana**" + 한국어 뜻. 0점, 콤보 0.

### 5.3 진행에 따른 난이도 (`src/config.ts`의 `GAME`) [추정·추천]
| 문제 번호 | 카드 수 | 떨어지는 시간(놀이 영역 위→아래) | 같은 주제 오답 수 |
|---|---|---|---|
| 1~3 | 3 | 9.0초 | 0 |
| 4~6 | 4 | 7.5초 | 1 |
| 7~10 | 4 | 6.5초 | 2 |

- 카드마다 출발 지연을 `[0, 0.6, 1.2, 1.8]`초(카드 3장이면 앞의 3개)에서 섞어 하나씩 준다 → 높이가 엇갈려 보인다. 정답 카드의 지연도 무작위.
- 한 문제 최대 길이 ≈ 떨어지는 시간 + 1.8초. 한 판(10문제) 대략 60~110초 — 서서 팔을 드는 초등학생 기준으로 2분을 넘지 않게. [추정]
- 같은 판 안에서 같은 단어가 두 번 정답으로 나오지 않는다.

### 5.4 배치(겹치지 않게 흩어지기) (`src/game/layout.ts`, 순수)
- 설명 띠 높이 `bandH = clamp(0.16·H, 88, 150)` px. 놀이 영역 = `y ∈ [bandH, H]`, `playH = H − bandH`.
- 가로 사용 범위 `[0.06·W, 0.94·W]`를 카드 수 N개의 **칸(lane)**으로 똑같이 나눈다. 칸 너비 `laneW`.
- 카드 크기: 너비 `cardW = min(laneW − 16, 0.24·W, 300)`, 높이 `cardH = max(64, min(0.12·H, 110))`. 글자는 굵게, 크기 `0.48·cardH`에서 시작해 카드 너비 − 24px에 들어갈 때까지 줄인다(최소 18px). 가장 긴 단어는 `basketball`·`television`·`restaurant`·`watermelon`(10자).
- 카드 중심 x = 칸 가운데 + 흔들림 `±0.6 × (laneW − cardW)/2` 무작위. 칸과 단어의 짝은 무작위(정답이 늘 같은 칸에 오지 않게). → 어떤 두 카드도 가로로 겹치지 않는다(테스트로 확인).
- 세로: 카드의 진행도 `p`(0→1)를 저장한다. 위쪽 y = `bandH − cardH + p · (playH + cardH)`. 시작 때 카드는 띠 뒤에 숨어 있다가 내려온다. 화면 크기가 바뀌면 `xFrac`(=중심x/W)과 `p`로 다시 계산한다(돌려도 위치가 맞음).
- 같은 씨앗(seed)이면 같은 배치(`src/game/rng.ts`, mulberry32).

### 5.5 점수
- 첫 시도 정답 100점, 오답 뒤 정답 50점.
- 빠르기 보너스: `round(50 × (1 − p_정답카드))` (일찍 잡을수록 최대 +50).
- 콤보: 연속 정답 3개째부터 문제마다 +20, 화면에 "Combo ×3!".
- 판 최고 점수는 학년군별로 기기 안(`localStorage` 키 `catchword.best.<band>`)에 저장. 이름 없음. `localStorage`가 막혀 있으면(사생활 모드 등) 저장만 건너뜀(try/catch).

### 5.6 문항 고르기와 오답 카드 고르기 (`src/game/questions.ts`, 순수)
- 학년군 선택: `3-4`이면 3~4학년군 문항만, `5-6`이면 5~6학년군만, `all`이면 전부에서 정답을 고른다. [추천: 14절 2번 — 기본 3~4학년]
- 한 판의 정답 10개: 해당 풀에서 무작위. 최근 2판에 정답으로 나온 단어(`localStorage` `catchword.recent`, 최대 20개)는 풀이 충분하면 피한다.
- 오답 카드 후보 = 같은 풀(3~4 선택이면 3~4 단어만 — 아이가 읽을 수 있게; 5~6·all이면 둘 다) − 정답 − **정답의 `avoid`(양방향으로 본다: A의 avoid에 B가 있으면 B의 avoid에도 A가 있는 것으로)** − **정답의 설명에 나온 단어(4.3의 같은 어근 규칙으로)** − 이번 문제에서 이미 고른 단어.
- 같은 주제 오답 수는 5.3 표대로(후보가 모자라면 다른 주제로 채움). 나머지는 다른 주제에서 무작위로, 가능한 한 서로 다른 주제로.
- 반대로, 오답 단어 B의 설명에 정답 A가 나오는 경우는 상관없다(화면에 B의 설명은 안 나옴).

### 5.7 일시정지·끝내기
- 설명 띠 오른쪽의 일시정지 버튼(터치) → "잠깐 멈췄어요" 판: [계속하기] [처음으로].
- 카메라 모드에서 놀이 중 **손이 3초 넘게 하나도 안 보이면** 자동 일시정지: 제목 "손을 화면에 보여 주세요", 그 아래 **"손바닥을 펴서 보여 주면 이어서 해요"**. 손이 `OPEN`으로 0.5초 확정되면 3·2·1 뒤 이어서(터치로 [계속하기]도 가능). [추정]
- 탭이 숨겨지면(`document.hidden`) 일시정지. 화면 꺼짐 방지: 놀이 중 `navigator.wakeLock.request('screen')`, 일시정지·결과에서 해제. 지원하지 않거나 실패하면 조용히 넘어감. [추정: Safari 16.4+ 지원]
- 게임 시간 흐름: 프레임 사이 `dt`는 최대 100ms로 자른다(멈칫한 뒤 카드가 순간 이동하지 않게).

### 5.8 결과 화면
- 점수, 맞힌 문제 수(`7 / 10`), 학년군 최고 점수(새 기록이면 "New record!").
- **복습 표**: 10문제 순서대로 `단어 · 한국어 뜻 · 설명 · ○/△/×`(○ 첫 시도 정답, △ 오답 뒤 정답, × 놓침). 단어를 누르면 읽어 줌(소리 켬일 때).
- [다시 하기]: 손으로 잡을 수 있는 큰 영어 카드 **`AGAIN`** + 터치 버튼 [다시 하기]. [처음으로]: 터치 버튼.
- "팔을 잠깐 쉬어요" 한 줄.

### 5.9 소리 [추천: 14절 3번]
- 효과음: Web Audio로 짧게 합성(파일 없음) — 잡기 "딸깍", 정답(올라가는 두 음), 오답(낮은 음), 카운트다운. 첫 터치 때 `AudioContext.resume()`.
- 영어 읽어 주기(Web Speech API `speechSynthesis`): 문제 시작 때 설명을 한 번, 정답을 잡았을 때 단어를 한 번. `lang` `en-US`(없으면 `en`으로 시작하는 아무 목소리), `rate 0.9`. 영어 목소리가 없거나 API가 없으면 조용히 건너뜀. iPad Safari는 첫 발화가 사용자 동작 안에서 일어나야 하므로[추정] 시작 버튼을 누를 때 빈 발화(`' '`)를 한 번 한다.
- 시작 화면 토글: 소리 켬/끔(효과음과 읽어 주기를 함께). 기본 켬. 설정은 `localStorage` `catchword.sound`.

---

## 6. 화면 흐름과 문구

### 6.1 문구 언어 정책
- **한국어**: 안내, 버튼, 오류, 개인정보 안내, 결과 화면의 표 머리.
- **영어**: 게임 이름 `Catch the Word!`, 설명(clue), 단어 카드, 짧은 반응(`Great!`, `Good job!`, `Try again!`, `The answer is …`, `Combo ×3!`, `New record!`, `START`, `Score`).
- 모든 문구는 `src/ui/strings.ts` 한 파일에 모은다(문구 테스트가 이 파일을 본다).

### 6.2 화면 목록
| 화면 | 내용 |
|---|---|
| 시작 | 제목 `Catch the Word!` + 부제 "영어 설명을 읽고, 맞는 단어를 손으로 잡아요!" · 학년군 [3~4학년] [5~6학년] [모두] · 소리 [켬/끔] · 큰 버튼 [카메라로 시작] · 작은 버튼 [터치로 하기] · 개인정보 안내(9절) · 서는 방법 그림 한 줄 "태블릿을 가슴 높이에 세우고, 한 걸음 반(1~1.5m) 떨어져 서요" |
| 준비 | "카메라를 켜는 중…" → "손 인식 준비 중… 37%" (처음 한 번은 조금 걸려요) |
| 손 확인 | 5.1-1. 거리 안내(3.5), "손이 보이지 않아요". 터치 모드: "START 카드를 눌러 시작해요" |
| 놀이 | 위: 설명 띠(설명 글 + 문제 번호 `3 / 10` + 점수 + 일시정지 버튼). 아래: 카메라 배경 + 카드 + 커서 |
| 일시정지 | 5.7 (손 없음 자동 일시정지: "손을 화면에 보여 주세요" + "손바닥을 펴서 보여 주면 이어서 해요") |
| 결과 | 5.8 (손으로 잡는 `AGAIN` 카드) |
| 오류 | 8절. 제목 **"시작하지 못했어요"**(모든 오류 공통) + 8.2 문구. 항상 [다시 시도]와 [터치로 하기]가 함께 |

- 설명 글자 크기: 가로 화면에서 `clamp(22px, 3.2vw, 40px)`, 두 줄까지(넘치면 글자를 줄임). 가장 긴 설명은 10단어 — 1024×768과 768×1024에서 두 줄 안에 들어가야 한다(E2E 검사).
- 대비: 카드는 흰 바탕·진한 남색 글자·두꺼운 테두리. 화면 글자 대비 4.5:1 이상.

---

## 7. 문제 데이터

### 7.1 근거 어휘 [확인]
- **2022 개정 영어과 교육과정(교육부 고시 제2022-33호 [별책 14]) [별표 3] 기본 어휘 목록**: 3,000단어. `*` 표시 800개는 초등학교 권장, `**` 1,200개는 중학교·고교 공통과목 권장. 초등 3~4학년 300단어 이내, 5~6학년 300단어 이내(누계 600). 학습·평가에 쓰는 어휘의 90% 이상을 기본 어휘 목록에서 쓰도록 권장. 고유 명사·감탄사·기수 등은 새 어휘로 치지 않는다.
- 출처 문서: 한국교육과정평가원 「2022 개정 교육과정에 따른 영어과 교과용도서 검정을 위한 영어 어휘 검색 프로그램(KICE Word Lister)」 안내 PDF(경기도교육청 게시, 부록 C).
- Plan은 이 PDF의 목록에서 `*` 표시 단어를 뽑아 **부록 B(819개 형태 — 800개 + 철자 변이형 aeroplane/colour 등)**로 실었다(pdftotext로 추출, 2026-11-26). 추출 실수가 있을 수 있으므로 Review는 부록 B에서 무작위 20개를 PDF와 맞춰 본다.
- **문항 수와 학년군**: 학년군을 문항마다 정했다(3~4 = 구체적이고 짧은 낱말, 5~6 = 조금 길거나 추상적인 낱말·동사·형용사). 교과서 학년 배정과 똑같지는 않다 [추정].

### 7.2 문항 확정 방식 — **Plan이 부록 A에 161문항을 확정**
- 이유: 사용자가 승인 단계에서 단어를 직접 훑어볼 수 있고, Build는 옮기기만 하고, Review는 "spec과 같은가 + 기계 검사 + 사람 눈 검사"로 나눠 볼 수 있다.
- Plan이 scratchpad의 임시 검사기로 7.4의 V5~V8을 미리 돌려 **위반 0건**을 확인했다(2026-11-26): 설명 낱말의 97.4%가 초등(*) 어휘(활용형·합성어 포함), 나머지는 아래 `**` 허용 목록과 의성어·요일 이름.
- Build는 부록 A 표를 `src/data/questions.json`으로 **글자 그대로** 옮긴다. 고치고 싶은 문항이 있으면 고치지 말고 보고에 올린다.

### 7.3 형식 (`src/data/questions.json`)
```jsonc
{
  "version": 1,
  "source": "2022 개정 영어과 교육과정 [별표 3] 기본 어휘(초등 *)",
  "questions": [
    {
      "id": "food-02",          // `<topic>-<두 자리>`, 부록 A의 id
      "word": "banana",         // 소문자 a~z만, 10자 이하
      "band": "3-4",            // "3-4" | "5-6"
      "topic": "food",          // 15개 중 하나(7.5)
      "ko": "바나나",           // 결과 화면·정답 표시용 한국어 뜻
      "clue": "A long yellow fruit. Monkeys love it.",
      "avoid": [],              // 함께 오답으로 내면 헷갈리는 단어(양방향으로 처리)
      "base": null              // 정답이 목록에 그대로 없을 때 근거 어근("teach", "birth+day")
    }
  ]
}
```
- 부록 A 표의 `학년군` `3~4` → `"3-4"`, 빈 `avoid` → `[]`, 쉼표로 이은 avoid → 배열, 빈 `base` → `null`.
- 보조 데이터:
  - `src/data/vocab/elementary-2022.txt` — 부록 B를 한 줄에 한 단어로.
  - `src/data/vocab/clue-extra.json` — 설명에 쓸 수 있는 목록 밖 낱말:
    `{"secondary": ["pet","wing","ride","bug","honey","round","lay","sweet","lot","person","through","plant","other","wheel","string","shoot","net","once"], "interjection": ["meow","woof","oink","quack"], "proper": ["monday","tuesday","saturday","sunday"]}`
    (`secondary`는 모두 기본 어휘 `**` 단어 [확인: 같은 PDF]. 감탄사·요일명은 교육과정 지침상 새 어휘로 치지 않음 [확인].)

### 7.4 품질 기준과 검사 (`src/data/validate.ts` — 순수 함수, 단위 테스트와 `npm run check:data`가 함께 씀)
**기계 검사(오류면 테스트 실패):**
- V1 `id` 형식 `^[a-z]+-\d{2}$`, 중복 없음, `topic`과 앞부분이 같음.
- V2 `word` `^[a-z]{2,10}$`, 중복 없음.
- V3 `band` ∈ {`3-4`,`5-6`}, `topic` ∈ 7.5 목록, `ko`는 한글 포함 1자 이상.
- V4 `clue`: 대문자로 시작, `.`로 끝남, 쓸 수 있는 글자는 영문·공백·`,.'?!`만. 낱말 수(아래 토큰 규칙) **3~4학년군 ≤ 8, 5~6학년군 ≤ 10**. [추정: 2015 개정 교육과정의 초등 문장 길이 기준(3~4학년 7낱말, 5~6학년 9낱말 이내 — 확인하지 못함)을 참고해 한 낱말씩 여유]
- V5 **정답 단어가 설명에 들어가지 않음**: 설명의 각 토큰 t와 그 기본형 후보 L(t)(아래) 중 하나라도 — ① 정답과 같다 ② 길이 3 이상이고 정답의 어간(끝 e/y를 뗀 것)으로 시작한다 ③ 정답이 L의 어간(길이 4 이상)으로 시작한다 ④ 길이 3 이상이고 정답 안에 들어 있다(예: birthday ⊃ day, basketball ⊃ ball) — 이면 실패.
- V6 **설명 어휘**: 각 토큰이 ⓐ L(t)가 초등 목록(부록 B)에 있음 ⓑ L(t)가 초등 목록 두 낱말의 합성(예: birthday, outside) ⓒ `clue-extra.json`에 있음 — 중 하나여야 한다. 설명 하나에 `secondary` 낱말은 2개까지. 전체 토큰 중 ⓐ·ⓑ·감탄사·요일 비율 ≥ 95%.
- V7 정답 단어: L(word)가 초등 목록에 있거나, `base`의 `+`로 나눈 조각이 모두 초등 목록에 있다.
- V8 `avoid`의 단어가 모두 문항에 있다.
- V9 문항 ≥ 100, 학년군마다 ≥ 50. 모든 문항에 대해 5.6 규칙으로 오답 3개를 고를 수 있다(학년군 `3-4`, `5-6`, `all` 각각).
- **토큰 규칙**: 소문자로 바꾸고 `[a-z]+('[a-z]+)?`로 자른 뒤 끝의 `'s`를 뗀다.
- **기본형 후보 L(t)**: t 자신 + 불규칙표(`me/my/mine→i, us/our→we, your→you, his/him→he, her→she, its→it, them/their→they, these→this, those→that, is/are/am/was/were/been→be, has/had→have, does/did→do, goes/went→go, made→make, ate→eat, children→child, women→woman, men→man, mice→mouse, feet→foot, teeth→tooth, an→a, student(s)→study`) + 접미사 떼기(`ies→y, es→, s→, ied→y, ed→, ed→e, d→, ing→, ing→e, iest→y, est→, est→e, ier→y, er→, er→e, ly→, y→, ful→, iful→y`; 뗀 결과가 2자 이상일 때만, 끝 자음이 겹치면 하나 뗀 것도 후보 — running→run) + 그 결과에 한 번 더 적용(teachers→teacher→teach).

**사람 눈 검사(Review, 표로 결과 기록):**
- H1 설명이 **정답 하나만** 가리키는가 — 특히 같은 주제 단어와, 그리고 다른 주제 단어 중 뜻이 겹치는 것(예: bird ↔ airplane "날개가 있고 난다"). 겹치면 `avoid`에 넣었는지.
- H2 영어가 자연스럽고 초등 수준인가, 한 낱말에 뜻이 여럿이면 아이가 아는 뜻으로 썼는가.
- H3 한국어 뜻이 맞는가, 아이에게 거슬리는 내용(폭력·차별·무서움)이 없는가.
- H4 정답이 설명 없이 그림만으로도 오해되지 않을 낱말인가(동사·형용사도 설명만으로 하나로 정해지는가).

### 7.5 주제(topic) 목록
`animal, food, body, people, school, home, clothes, nature, place, transport, music, sports, time, feeling, action` (15개). 화면에는 보이지 않는다(오답 고르기용).

---

## 8. 카메라가 없거나 거부됐을 때

### 8.1 입력 방식 세 가지 (`src/hand/tracker.ts`의 공통 인터페이스)
```ts
interface HandFrame { t: number; hands: { landmarks: Point3[]; worldLandmarks: Point3[] }[]; videoSize: { w: number; h: number } }
interface HandSource { start(): Promise<void>; poll(now: number): HandFrame | null; stop(): void; readonly kind: 'camera' | 'replay' }
```
| 방식 | 켜는 법 | 설명 |
|---|---|---|
| 카메라 | [카메라로 시작] | MediaPipe. 4절 판정. |
| 터치·마우스 | [터치로 하기], 오류 화면 버튼, URL `?input=pointer` | `pointerdown` = 그 자리에서 잡기(펴기/쥐기 없음). 마우스는 `pointermove`로 커서·겨냥 표시도. 카메라를 켜지 않는다. |
| 재생(검증용) | URL `?test=1&input=replay` 뒤 `window.__eg.loadReplay(frames)` | 녹화·합성한 `HandFrame` 배열을 시각에 맞춰 돌려줌. 4절 판정을 그대로 탄다. |

### 8.2 오류 분류와 안내 문구 (`src/camera/errors.ts`) — 화면에는 항상 [다시 시도] [터치로 하기]
- 오류 화면 제목은 종류와 상관없이 **"시작하지 못했어요"** 하나다(카메라·손 인식 파일·손 인식 시작 오류 모두. 사용자 결정 2026-11-26). 그 아래에 표의 문구.
| 상황(판별) | 문구 |
|---|---|
| 보안 컨텍스트 아님(`!isSecureContext` 또는 `navigator.mediaDevices` 없음) | "이 주소에서는 카메라를 쓸 수 없어요. https:// 로 시작하는 주소로 열어 주세요." |
| `NotAllowedError`, `SecurityError` | "카메라 사용이 허락되지 않았어요. 주소창 옆(또는 설정 › Safari › 카메라)에서 카메라를 '허용'으로 바꾼 뒤 [다시 시도]를 눌러 주세요." |
| `NotFoundError`, `OverconstrainedError` | "카메라를 찾지 못했어요. 카메라가 있는 태블릿에서 열어 주세요." |
| `NotReadableError`, `AbortError`, 카메라 트랙 `ended`(3.1) | "다른 앱이 카메라를 쓰고 있어요. 다른 앱을 닫고 [다시 시도]를 눌러 주세요." |
| 모델·wasm 받기 실패(fetch 실패, 크기 0) | "손 인식 파일을 받지 못했어요. 인터넷 연결을 확인하고 [다시 시도]를 눌러 주세요." |
| MediaPipe 만들기 실패(GPU·CPU 둘 다) | "이 기기에서는 손 인식을 시작하지 못했어요. 터치로 할 수 있어요." |
| 그 밖 | "카메라를 켜지 못했어요. [다시 시도]를 누르거나 터치로 해 보세요." |
- 오류 이름의 뜻 [확인: MDN]: NotAllowedError(사용자 거부·권한 정책·보안 컨텍스트 아님), NotFoundError(조건에 맞는 장치 없음), NotReadableError(허락됐지만 하드웨어·OS 문제로 못 엶), OverconstrainedError(조건을 만족하는 장치 없음), SecurityError(문서에서 미디어 사용이 꺼짐), TypeError(보안 컨텍스트가 아닌 곳에서 호출 등).
- 오류 화면의 아래쪽에 작은 글씨로 원래 오류 이름(`NotAllowedError` 등)을 보여 준다(교사가 물어볼 때 도움).

---

## 9. 개인정보
- 카메라 영상은 **이 기기 브라우저 안에서만** 손 위치를 찾는 데 쓰고, **저장하지 않고 어디에도 보내지 않는다.** 화면을 캡처하거나 녹화하는 코드가 없다. 서버·분석 도구·광고·외부 글꼴·외부 CDN 호출 없음.
- `localStorage`에는 학년군별 최고 점수, 최근 정답 단어, 소리 설정만 둔다(개인을 알아볼 정보 없음).
- 시작 화면 안내(항상 보임, 앞에 SVG 카메라 아이콘): **"카메라 영상은 이 태블릿 안에서 손 위치를 찾는 데만 쓰여요. 저장하거나 다른 곳으로 보내지 않아요."**
- 카메라가 켜져 있는 동안 화면 구석에 작은 "카메라 켜짐" 표시.
- 디버그 녹화(`?debug=1&record=1`, 12.3)는 **손 좌표 숫자만** JSON으로 기기에 내려받게 하며(영상 아님), 사용자가 버튼을 눌러야만 만든다. 일반 화면에는 이 기능이 없다.
- 보장 방법: E2E 테스트가 페이지가 낸 **모든 요청의 출처가 사이트와 같은지** 검사한다(12.2 E1). 추가로 `index.html`에 CSP 메타 태그를 시도한다:
  `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; img-src 'self' data: blob:; media-src 'self' blob: mediastream:; style-src 'self' 'unsafe-inline'; worker-src 'self' blob:`
  MediaPipe가 이 CSP에서 돌지 않으면(S2에서 확인) 어느 지시어가 문제인지 보고하고, 가장 좁게 푼 값을 쓴다(외부 출처는 절대 넣지 않음). [추정: 필요한 지시어]

---

## 10. 성능 목표
| 항목 | 목표 | 근거 |
|---|---|---|
| 화면 그리기 | 중앙값 55fps 이상(iPad), 30fps 이상(보급형 안드로이드) | 떨어지는 카드가 부드럽게 [추정] |
| 손 인식 횟수 | 초당 20회 이상(중앙값) | 2회 확정(4.3)이 100ms 안에 끝나도록 [추정] |
| 쥠 → 잡기 반응 | 250ms 이하 | [추정] |
| 첫 준비 시간 | 학교 와이파이에서 15초 이내(22.5MB), 두 번째부터 3초 이내 | [추정] |
| 메모리 | 3판 연속 뒤에도 늘지 않음 | |

- **인식 해상도**: 카메라 640×480(이상값 요청). MediaPipe가 안에서 192/224px로 줄이므로 더 키울 필요가 없다 [확인: 모델 입력 192×192, 224×224].
- **인식 주기**: `requestAnimationFrame` 한 번에, `video.currentTime`이 바뀐 새 프레임일 때만 `detectForVideo` 1회(같은 프레임 두 번 검사 안 함). 시각 인자는 `max(performance.now(), 앞 시각 + 1)`로 항상 늘게. 최근 30회 평균 검사 시간이 40ms를 넘으면 새 프레임 2개 중 1개만 검사(화면 그리기를 지키기 위함), 25ms 아래로 내려오면 다시 모두 검사. [추정]
- **GPU → CPU**: `delegate: 'GPU'`(전용 숨은 `<canvas>`를 `canvas` 옵션으로 줌)로 먼저 만들고, 만들기가 실패하거나 첫 5회 검사 중 예외가 나면 `close()` 후 `'CPU'`로 다시 만든다. URL `?delegate=CPU`로 강제 가능. 디버그 화면에 지금 쓰는 쪽을 표시.
- 메인 스레드에서 돈다(Worker 안 씀) — 공식 예제 방식이고 GPU 대리 실행이 Worker에서 되는지 확인하지 못했다. 목표를 못 맞추면 다음 사이클 후보. [추정]
- Canvas 그리기: 카드·커서·입자만. 그림자 블러는 쓰지 않는다(태블릿에서 느림). 입자는 동시에 120개 이하.

---

## 11. 파일 구조
```
영어게임/                          (저장소 english1의 루트)
├─ CLAUDE.md, spec.md, review.md(Review가 작성)
├─ docs/briefs/                    지침 파일(기존)
├─ index.html                      #app 뼈대, CSP 메타, <video>, <canvas>, DOM 화면 자리
├─ package.json, package-lock.json
├─ tsconfig.json                   strict, target ES2022, moduleResolution bundler, types vite/client
├─ vite.config.ts                  base './', server.port 5173, test.include tests/unit/**/*.test.ts, environment node
├─ playwright.config.ts            12.2
├─ .gitignore                      node_modules, dist, public/mediapipe/, test-results, playwright-report
├─ .github/workflows/ci.yml, pages.yml
├─ public/
│  ├─ models/hand_landmarker.task  (커밋, SHA-256 fbc2a300…cde1)
│  ├─ mediapipe/1.2.3/             (빌드 때 복사, 커밋 안 함)
│  └─ favicon.svg
├─ scripts/
│  ├─ copy-mediapipe.mjs           wasm 2개 복사 + 버전 검사
│  ├─ fetch-model.mjs              모델 받기 + SHA-256 검사(S1에 한 번)
│  ├─ check-data.mjs               validate.ts를 불러 보고서 출력(`npm run check:data`, 실패 시 종료 코드 1)
│  └─ serve-dist.mjs               dist/를 /english1/ 아래로 주는 작은 정적 서버(E2E용, .wasm은 application/wasm)
├─ src/
│  ├─ main.ts                      시작점: URL 매개변수 읽고 App 만들기
│  ├─ config.ts                    HAND(4.6)·GAME(5.3~5.5)·PERF(10절) 상수 전부
│  ├─ styles.css
│  ├─ app/App.ts                   화면 상태 기계(start→loading→handcheck→playing⇄paused→result, error), 한 개의 rAF 루프
│  ├─ app/params.ts                ?input=camera|pointer|replay, ?band, ?seed, ?debug=1, ?test=1, ?delegate=CPU|GPU, ?clock=manual(`?test=1`이 함께 있을 때만 켜짐 — 없으면 무시)
│  ├─ camera/camera.ts             getUserMedia 열기·닫기, 오류 → ErrorKind
│  ├─ camera/errors.ts             ErrorKind → 한국어 문구(8.2)
│  ├─ hand/tracker.ts              HandFrame·HandSource 타입
│  ├─ hand/mediapipeSource.ts      모델 fetch(진행률) → HandLandmarker 만들기(GPU→CPU) → 새 프레임만 검사
│  ├─ hand/replaySource.ts         HandFrame 배열 재생
│  ├─ hand/pointerInput.ts         포인터 → 커서·잡기 사건
│  ├─ hand/fist.ts                 4.1~4.2 (순수)
│  ├─ hand/gestureState.ts         4.3 (순수)
│  ├─ hand/handTracks.ts           3.5 걸러내기, 4.4 짝짓기, 3.4 평활 (순수)
│  ├─ hand/mapping.ts              3.3·3.4 (순수)
│  ├─ game/types.ts
│  ├─ game/rng.ts                  mulberry32 씨앗 난수
│  ├─ game/questions.ts            5.6 정답·오답 고르기 (순수)
│  ├─ game/layout.ts               5.4 (순수)
│  ├─ game/hitTest.ts              4.5 (순수)
│  ├─ game/session.ts              한 판 진행·채점·결과 (순수, 시간은 update(dt)로만)
│  ├─ game/scoring.ts              5.5 (순수)
│  ├─ render/canvasRenderer.ts     카드·커서·겨냥 빛·입자 그리기
│  ├─ render/effects.ts            입자·흔들림
│  ├─ ui/screens.ts                시작·준비·손 확인·일시정지·결과·오류 DOM
│  ├─ ui/hud.ts                    설명 띠·점수·문제 번호
│  ├─ ui/strings.ts                모든 화면 문구(6.1)
│  ├─ audio/sfx.ts                 Web Audio 효과음
│  ├─ audio/speech.ts              영어 읽어 주기
│  ├─ platform/wakeLock.ts
│  ├─ platform/storage.ts          localStorage try/catch 감싸기
│  ├─ debug/debugOverlay.ts        ?debug=1: 21점 뼈대, 손가락별 c_f·C·상태, fps(그리기·인식), 검사 ms, 영상 크기, delegate
│  ├─ debug/testHooks.ts           ?test=1: window.__eg (12.2)
│  ├─ debug/recorder.ts            ?debug=1&record=1: 손 좌표 JSON 내려받기
│  └─ data/questions.json, data/validate.ts, data/vocab/elementary-2022.txt, data/vocab/clue-extra.json
└─ tests/
   ├─ helpers/handSynth.ts         4.7 합성 손
   ├─ unit/*.test.ts               12.1
   └─ e2e/*.spec.ts                12.2
```
- `package.json` scripts: `dev`(vite), `dev:https`(basic-ssl을 켜고 `--host`), `build`(`tsc --noEmit && vite build`), `preview`, `typecheck`, `test`(vitest run), `check:data`, `test:e2e`(build 후 playwright test), `check`(typecheck + test + check:data + test:e2e), `prepare-assets`(copy-mediapipe), `predev`/`prebuild`: `npm run prepare-assets`.
- `dev:https`의 basic-ssl 플러그인은 환경 변수 `HTTPS=1`일 때만 vite 설정에 넣는다(일반 개발·빌드에는 영향 없음).
- 의존 방향: `game/*`·`hand/*`(순수 파일)는 DOM·MediaPipe를 import하지 않는다. DOM·MediaPipe는 `app/`, `camera/`, `hand/mediapipeSource.ts`, `render/`, `ui/`, `audio/`, `platform/`, `debug/`에서만.

---

## 12. 검증 방법

### 12.1 자동 — 단위 테스트(Vitest, node 환경, `tests/unit/`)
| 파일 | 확인할 것 |
|---|---|
| `fist.test.ts` | 4.7 표의 C·min·분류가 소수 셋째 자리까지 맞음. 임의 회전 200개·크기 0.5/2배에서 C 불변. NaN·0길이 → 판정 불가. |
| `gestureState.test.ts` | ① 폄(200ms)→쥠 확정 = 잡기 1회 ② 쥠으로 시작 = 잡기 0 ③ 쥠 유지 중 이동 = 추가 잡기 0 ④ 쥠→폄→쥠 = 2회 ⑤ 임계값 근처 떨림(C 0.68/0.72 번갈아) = 잡기 0 ⑥ 한 프레임만 0.9 = 잡기 0(2회 확정) ⑦ 15fps·30fps·60fps 모두 같은 결과 ⑧ 폄 100ms 뒤 쥠 = 잡기 0(ARM_OPEN_MS) ⑨ 260ms 끊김 → 새 트랙 ⑩ offscreen 쥠 = 잡기 0 |
| `handTracks.test.ts` | 두 손 짝짓기 유지, 작은 손(0.6배 미만)·너무 작은 손 무시, 3개 이상이면 큰 2개, 평활 α 범위 |
| `mapping.test.ts` | 4:3 영상 → 16:10·4:3·3:4 화면에서 (0.5,0.5)→화면 중심, (0,v)→오른쪽 끝(거울), 잘린 영역 → offscreen, 손바닥 중심 계산 |
| `layout.test.ts` | 씨앗 1000개 × 화면 5종(1024×768, 1180×820, 1280×800, 768×1024, 820×1180) × 카드 3·4장: 카드끼리 가로로 겹치지 않음, 모두 `[0.06W, 0.94W]` 안, 같은 씨앗 = 같은 결과, 화면 크기 바뀌면 xFrac·p 유지 |
| `hitTest.test.ts` | 여유 m 경계 안/밖, 두 카드 겹침 시 가까운 쪽, 띠 뒤 카드 제외, 이전 OPEN 위치(②) 사용 |
| `questions.test.ts` | 한 판 10문제 중복 없음, 오답에 avoid(양방향)·설명 속 단어 없음, 학년군 필터, 같은 주제 오답 수 5.3대로, 최근 단어 피하기 |
| `session.test.ts` | 가짜 시계로 한 판: 정답·오답·놓침 점수(5.5), 콤보, 3초 손 없음 → 자동 일시정지, dt 100ms 자르기, 10문제 뒤 결과 |
| `data.test.ts` | `validate.ts`가 V1~V9 위반 0, **부록 A와 JSON이 같음**(테스트가 `spec.md`의 부록 A 표를 직접 읽어 161문항의 모든 칸을 JSON과 비교), 위반 예시(정답이 든 설명, 11낱말 설명 등)를 일부러 넣으면 잡아냄 |
| `assets.test.ts` | `public/models/hand_landmarker.task` SHA-256 = 2.4 값, `package.json`의 tasks-vision 버전 = `1.2.3` |
| `strings.test.ts` | 8.2·9절 문구가 strings.ts에 그대로 있음 |

### 12.2 자동 — 브라우저 테스트(Playwright, chromium)
- 설정: `webServer`가 `node scripts/serve-dist.mjs --dir dist --prefix /english1/ --port ${E2E_PORT:-4173} --host 127.0.0.1`(`reuseExistingServer: false`). `baseURL = http://127.0.0.1:4173/english1/`. 프로젝트: `tablet-landscape`(1180×820, hasTouch), `tablet-portrait`(820×1180, hasTouch), `small-landscape`(1024×768).
- **테스트 훅** `?test=1`일 때만 `window.__eg`: `state()`(화면 이름, 문제 번호, 점수, 설명, 카드 목록 `{word, correct, rect, alive}`), `loadReplay(frames)`, `clock.step(ms)`(`?test=1&clock=manual`일 때 rAF 시간 대신 수동 진행. `?clock=manual`만 있고 `?test=1`이 없으면 무시하고 보통 시계로 돈다 — Review v1 R1), `forceError(kind)`. 훅은 게임 규칙을 바꾸지 못한다(읽기·입력·시계만).

| ID | 내용 |
|---|---|
| E1 | 첫 화면이 `/english1/`에서 열리고 응답 400 이상 0개, 콘솔 오류 0개, **모든 요청이 같은 출처**(카메라 모드 준비까지 포함). 빌드 결과물에 `"/assets`, `"/mediapipe`, `"/models`처럼 `/`로 시작하는 경로가 없음. |
| E2 | 터치 모드 한 판(`?input=pointer&seed=7&test=1&clock=manual`): `state()`로 정답 카드 위치를 찾아 누르기 ×10 → 결과 화면 10/10, 점수 = 독립 계산(5.5 식을 테스트 안에서 따로 계산)과 같음. 오답 누르기 → 그 카드 사라지고 점수 그대로. |
| E3 | 재생 모드: 합성 손(handSynth)으로 ① 정답 카드 위로 편 손 이동 → 쥠 → 정답 처리 ② 주먹 쥔 채 등장 → 잡기 없음 ③ 쥔 채로 카드 3장을 지나감 → 잡기 없음 ④ 오답 카드에서 쥠 → 오답 처리 ⑤ 손 3초 사라짐 → 일시정지 화면. 거울 변환(정규화 x=0.2 → 화면 오른쪽) 확인. |
| E4 | 카메라 오류 흉내(`addInitScript`로 `getUserMedia`를 각 DOMException으로 거부시키기, `mediaDevices` 없애기): 8.2 문구가 뜨고 [터치로 하기]로 게임이 시작됨. |
| E5 | 실제 MediaPipe 적재: chromium 인자 `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream`, 권한 `camera` 부여 → [카메라로 시작] → 30초 안에 손 확인 화면, 디버그 훅으로 검사 횟수 > 10, 오류 0. `?delegate=CPU`로 한 번 더. (가짜 카메라 무늬에는 손이 없으므로 손 0개가 정상.) |
| E6 | 배치: 세 화면 크기에서 가장 긴 설명(10낱말)·가장 긴 단어(10자)가 넘치지 않음(설명 띠 두 줄 이내, 카드 글자 폭 ≤ 카드 폭 − 24). |
| E7 | 개인정보 문구가 시작 화면에 보임, 터치 모드에서 `getUserMedia`가 불리지 않음. |

### 12.3 실제 손 녹화 재생(선택, S7)
- 태블릿에서 `?debug=1&record=1`로 열어 [녹화] → 사람이 손을 펴고 쥐기 10번 등을 한 뒤 [저장] → `HandFrame[]` JSON이 기기에 내려받아짐(손 좌표만). 사용자가 이 파일을 맥으로 옮겨 `tests/fixtures/replays/`에 두면, 단위 테스트가 "쥠 10번 → 잡기 10회, 편 채로 흔들기 → 잡기 0"을 확인한다. 파일이 없으면 이 테스트는 건너뛴다(skip, 실패 아님).

### 12.4 사람이 태블릿에서 확인(자동으로 확인할 수 없는 것) — Review가 목록을 만들고 사용자/코디네이터가 수행
iPad Safari 1대 + 안드로이드 Chrome 1대(가능하면), 배포 주소 또는 `npm run dev:https`:
1. 카메라 허락 창이 뜨고 앞 카메라가 켜짐. 거부 후 문구와 [터치로 하기].
2. 거울: 오른손을 오른쪽으로 → 커서도 오른쪽. 커서가 화면 속 내 손바닥 위에 있음.
3. 1m·1.5m·2m 거리에서 펴기·쥐기 각 10회: 잡기 인식 ≥ 9/10, 편 손을 빨리 흔들 때 잘못된 잡기 0. (어린이 손으로 꼭 한 번.)
4. 역광(창문 등지기)·어두운 교실에서 3번 반복.
5. 뒤에 다른 사람이 서 있을 때 그 손으로 잡히지 않음.
6. `?debug=1`의 그리기 fps·인식 Hz·검사 ms가 10절 목표 안. 3판 연속 뒤에도 느려지지 않고 기기가 지나치게 뜨겁지 않음.
7. 영어 읽어 주기 목소리·속도, 효과음 크기.
8. 게임 중 화면이 꺼지지 않음. 가로↔세로 돌리기에서 카드 위치가 맞음.
9. 아이가 한 판을 끝까지 했을 때 팔이 너무 힘들지 않은지, 속도가 적당한지(5.3 값 조정 근거).
10. 배포 주소에서 `.wasm` 응답 형식(application/wasm)과 첫 준비 시간.

---

## 13. Build 작업 순서
각 단계 끝에 `npm run typecheck && npm test`가 통과해야 다음 단계로. 단계마다 보고(무엇을 했나, 테스트 결과, spec과 다르게 한 것, 사용자 결정 필요).

| 단계 | 할 일 | 완료 기준 |
|---|---|---|
| S1 뼈대 | package.json(2.3 정확한 버전), tsconfig, vite.config, index.html, .gitignore, copy-mediapipe, fetch-model(모델 받아 `public/models/`에 둠), serve-dist, 빈 App, CI·Pages 워크플로 파일 | `npm run build` 성공, `dist/`에 `mediapipe/1.2.3/vision_wasm_internal.{js,wasm}`·`models/hand_landmarker.task` 포함, assets.test 통과, `/english1/` 아래로 열림 |
| S2 손 인식 연결 | camera.ts, errors.ts, mediapipeSource.ts(진행률·GPU→CPU), debugOverlay(뼈대·C·fps) | 맥 Chrome에서 `npm run dev` → 실제 손에 뼈대가 겹쳐 보임(Build가 직접 확인 가능하면 스크린샷, 아니면 E5 수준까지), CSP 결과 보고, E5 통과 |
| S3 판정 순수 로직 | mapping, fist, gestureState, handTracks, handSynth + 단위 테스트 | 12.1 해당 테스트 전부 통과(4.7 표 값 일치) |
| S4 데이터 | questions.json(부록 A 그대로), vocab 파일, validate.ts, check-data, questions.ts + 테스트 | `npm run check:data` 위반 0, data/questions 테스트 통과 |
| S5 게임 | rng, layout, hitTest, scoring, session, canvasRenderer, hud, screens, strings, 터치 입력, 일시정지·결과·최고 점수 | 터치 모드로 한 판 끝까지, 12.1 전부 통과 |
| S6 마무리 | 소리(sfx·speech), wakeLock, 손 확인 화면, 거리 안내, 겨냥 빛, 자동 일시정지, testHooks, recorder, E2E 전부 | `npm run check` 전부 통과(E1~E7) |
| S7 기기 조정(사람과 함께) | 12.4 체크리스트를 배포 주소(또는 dev:https)로 수행, 필요하면 4.6·5.3 값 조정 | 바꾼 값과 근거를 보고(값을 바꾸면 Plan이 spec 표를 고침) |

- S1~S6은 Build 한 번에, S7은 Embed(배포) 뒤 사람 확인과 함께 진행한다.
- Build는 `git`을 다루지 않는다(Embed 몫). `npm install`은 S1에서 프로젝트 루트에 한 번.

---

## 14. 사용자 확인 필요
(아래 추천대로 정하면 바로 만들 수 있다. 저장소 이름은 사용자가 `english1`로 정했으므로 여기서 묻지 않는다.)

| # | 갈림길 | 선택지 | **추천** |
|---|---|---|---|
| 1 | 저장소 공개 여부 | ① 공개 ② 비공개(무료 계정이면 Pages를 못 씀 → 유료 Pro 또는 다른 배포처 필요) | **① 공개** — 무료 GitHub Pages는 공개 저장소에서만 된다. 저장소는 지금 이미 공개 상태로 만들어져 있다(2026-11-26 확인). 코드에 개인정보·비밀값이 없다. |
| 2 | 대상 학년 | ① 시작 화면에서 고름(3~4 / 5~6 / 모두) ② 한 학년군 고정 | **① 고름, 기본 선택 3~4학년** |
| 3 | 소리 | ① 효과음 + 영어 읽어 주기(설명·정답 단어) ② 효과음만 ③ 없음 | **①, 시작 화면에서 끌 수 있게** (교실에서 시끄러우면 끔) |
| 4 | 한 판 방식·오답 처리 | ① 10문제 고정, 오답은 감점 없이 그 카드만 사라짐 ② 90초 시간제 ③ 목숨 3개(오답·놓침마다 하나) | **①** — 끝이 분명하고 2분 안에 끝나 팔이 덜 힘들다. 틀려도 다시 시도할 수 있어 저학년도 끝까지 한다. |
| 5 | 손 개수 | ① 두 손 다 잡기 가능 ② 한 손만 | **① 두 손** — 아이가 어느 손을 써도 된다. 뒤에 있는 사람 손은 크기로 걸러 낸다(3.5). |
| 6 | 카메라 화면 | ① 거울 영상을 배경 전체에 흐리게 ② 영상은 숨기고 커서만 | **①** — 자기 손이 카드 위에 보여야 "허공에서 잡기"가 바로 이해된다. |
| 7 | 한국어 뜻 표시 | ① 정답 직후 + 결과 복습표에만 ② 게임 중에도 카드에 표시 ③ 표시 안 함 | **①** — 게임 중에는 영어 설명만 보고 고르게 하고, 잡은 뒤에 뜻을 확인한다. |
| 8 | 손 인식 파일 | ① 우리 사이트에 함께 올림(첫 접속 약 22.5MB) ② 외부 CDN에서 받음 | **①** — 학교 망 차단에 덜 걸리고, 영상·요청이 밖으로 나가지 않음을 보장하기 쉽다. |
| 9 | 문항 목록 | ① 부록 A 161문항 그대로 ② 사용자가 빼거나 고칠 단어를 알려 줌 | **①** (훑어보고 바꾸고 싶은 낱말이 있으면 알려 주시면 Plan이 고친 뒤 시작) |
| 10 | 게임 이름 | ① `Catch the Word!` ② 다른 이름 | **①** |
| 11 | 속도 | ① 문제가 진행될수록 자동으로 빨라짐(5.3) ② 시작 화면에서 느리게/보통 선택 추가 | **①** — 태블릿에서 아이들과 해 본 뒤(S7) 값만 조정 |
| 12 | 화면 방향 | ① 가로 권장, 세로도 동작 ② 가로만(세로면 "돌려 주세요") | **①** |

---

## 15. 결정 기록
- 2026-11-26 **사용자 결정**: GitHub 저장소 이름 `english1`(사용자 원문: "깃허브 저장소는 english1 이야"), 계정 `eversunk2-tech`. → 배포 주소 `https://eversunk2-tech.github.io/english1/`, 2.5절.
- 2026-11-26 Plan이 고른 것(사용자 승인 전, 14절에서 바꿀 수 있음): 0절 표 전체.
- 2026-11-26 **사용자 승인**: 14절 1~12번을 모두 추천안대로(사용자 원문: "추천대로 승인"). → 저장소 공개, 학년 선택(기본 3~4), 소리 ①, 10문제 고정, 두 손, 거울 배경, 한국어 뜻 ①, 자체 호스팅, 부록 A 161문항, `Catch the Word!`, 자동 속도, 가로 권장. Build 시작.
- 2026-11-26 **사용자 결정**(Review v1 뒤, 코디네이터의 질문에 대한 답 원문):
  - 문항: **"15개 모두 고치기"** — 반드시 수정 3개(bird, dress, big)와 권장 12개(shirt, bus, yesterday, heavy, slow, eat, spoon, chair, key, knife, airplane, wind) 모두. 질문 안에 함께 제시된 추천안대로 taxi "A yellow car"와 wind의 "can not" → "cannot"도 함께 다듬음.
  - 임시 문구: **"3개 승인 + 오류 제목 변경"** — "START 카드를 눌러 시작해요", 결과 화면 "AGAIN" 카드, "손바닥을 펴서 보여 주면 이어서 해요"를 확정. 오류 화면 제목은 "카메라를 쓸 수 없어요" → "시작하지 못했어요".
- 2026-11-26 Plan이 고른 것(위 결정을 문항에 옮기는 방법):
  - 고친 문항의 구체 내용(설명 문장·avoid)은 아래 표(처음 16문항 + 덧붙임 time-09 = 17문항). 겹치는 짝은 avoid(양방향 처리)에, 설명만으로 하나로 정해지지 않던 것은 설명을 바꿨다. id·word·학년군·topic·ko·base는 그대로, 문항 수 161 그대로.
  - dress는 avoid 대신 설명을 바꿔("윗옷과 치마가 한 벌") hat·coat가 같이 나와도 답이 되지 않게 했다 — 같은 주제 오답(shoes, socks, pants, belt, shirt)을 남겨 두려는 것. shirt도 설명을 바꿨지만 dress·pants와는 여전히 가까워 avoid에 넣었다.
  - time-09 tomorrow는 처음 결정 목록에 없어 Plan이 따로 물었고, 사용자가 바꾸기로 했다(아래 덧붙임).
  - Review 권장 중 spec 값이 걸린 R1·R3·R5를 반영(개정 기록 참고). 나머지 권장(R2·R4는 이번 결정·M1 수정으로 해결, R6·R7·R9~R13)은 spec을 바꿀 필요가 없는 코드 쪽 일이다.

| id | 고치기 전 설명 / avoid | 고친 뒤 설명 / avoid | 이유 |
|---|---|---|---|
| animal-09 bird | It has two wings and can fly. / bee,airplane | It has two wings and can fly. / bee,airplane,duck | 오리(duck)도 날개 둘에 날 수 있음 — 반드시 수정(M3) |
| clothes-07 dress | A girl or a woman wears it to a party. / — | Girls wear it. It is a top and skirt together. / — | 파티에 모자(hat)·외투(coat)도 입고 감 — 반드시 수정(M3). 원피스만 가리키게 설명 변경 |
| feeling-05 big | An elephant is this. A mouse is not. / tall | An elephant is this. A mouse is not. / tall,heavy | 코끼리는 무겁고(heavy) 쥐는 아님 — 반드시 수정(M3) |
| clothes-06 shirt | We wear it on the top part of our body. / coat | We wear it under a coat. It has buttons. / coat,dress,pants | "몸 윗부분"이면 모자(hat)도 맞음. 외투 안에 입고 단추가 있는 옷으로 |
| transport-01 bus | A big car for many people. / — | Many people ride it on the road. / — | "많은 사람이 타는 큰 차"면 기차(train)도 맞음. "도로 위"로 기차·지하철 제외 |
| time-10 yesterday | Today is Monday. It was Sunday. / — | Today is Tuesday, so Monday was this. / weekend | 일요일은 주말(weekend)이기도 함. 평일(월요일)로 바꾸고 "It"이 가리키는 것을 분명히 |
| feeling-12 heavy | It is hard to carry. / — | It is hard to carry, like a big rock. / big | "나르기 힘든"이면 큰(big)도 맞음. 큰 바위 비유 추가, big avoid |
| feeling-08 slow | It is not fast. / — | It takes a long time. It is not fast. / — | "빠르지 않다"만으로는 약함. "오래 걸린다"를 더함 |
| action-05 eat | We do this with food. / drink | We do this with food in our mouth. / drink,cook | "음식으로 하는 일"이면 요리하다(cook)도 맞음. "입에 넣고"로 좁힘 |
| home-04 spoon | We eat soup with it. / — | We hold it and eat soup with it. / mouth,cup | "수프를 먹는다"면 입(mouth)도 맞음. "손에 쥐고", 컵(cup)도 Plan 시뮬레이션에서 걸려 avoid |
| school-04 chair | We sit on it. / desk | We sit on it at a desk. / desk,bed | "앉는다"만이면 침대(bed)도 맞음. "책상에서"로 좁힘 |
| home-08 key | We open a door with it. / — | We put it in a door to open it. / hand | "문을 연다"면 손(hand)도 맞음. "문에 넣어서"로 좁힘 |
| home-06 knife | We cut food with it. / scissors | We cut food with it in the kitchen. / scissors,tooth | "음식을 자른다"면 이(tooth)도 맞음. "부엌에서" 더함 |
| transport-03 airplane | It flies people to other countries. / — | We ride in it to fly far away. / pilot | "사람을 날라 준다"면 조종사(pilot)도 맞음. "우리가 타고"로 바꿈 |
| nature-11 wind | We can not see it, but we can feel it. / — | We cannot see it, but it moves the trees. / cold | "cannot" 표기 + "느낄 수 있다"면 추운(cold)도 맞음. "나무를 움직인다"로 |
| transport-06 taxi | A yellow car. You pay to ride it. / — | A car with a driver. You pay to ride it. / bus | 노란 택시는 미국식(한국 아이에게 낯섦). 기사가 있고 돈을 내고 타는 차로. 버스(bus)도 맞을 수 있어 avoid |
| time-09 tomorrow | Today is Monday. It will be Tuesday. / — | Today is Monday, so Tuesday will be this. / — | "It"이 가리키는 것이 약함(Review H2). yesterday(time-10)와 같은 모양으로 맞춤. 사용자 결정(덧붙임) |

- 2026-11-26 **사용자 결정**(덧붙임): time-09 tomorrow 설명을 Plan 추천안 "Today is Monday, so Tuesday will be this."로 바꾼다(사용자 답 원문: "바꾸기"). → 고친 문항은 모두 17개.
- 2026-11-26 **Plan 수정 v2**(Review 재검토 9.5 N2, 지침 `docs/briefs/plan-fix-brief-v2.md`):
  - **사용자 결정**: 남은 권장 2건을 고친다(사용자 답 원문: "고치기").
  - **코디네이터 선택**(Review의 첫 번째 안): transport-06 taxi는 설명을 그대로 두고 avoid에 `subway, train`을 더한다 → avoid `bus` → `bus,subway,train`. 이유: 지하철·기차도 기사가 있고 돈을 내고 타서, 설명의 "car"를 놓치는 아이는 헷갈릴 수 있다.
  - Plan 확인: 고친 뒤 V1~V9 위반 0, 판 구성 흉내(학년군별 씨앗 5,000개)에서 taxi 문제에 subway·train·bus가 나오는 비율 0%, 오답 후보 부족 0건. 같은 주제 남은 오답(truck, airplane, boat, bike)은 "돈을 내고 타는 기사 있는 차"의 답이 되지 않는다. (N1 한국어 줄바꿈은 코드 쪽 일이라 spec 변경 없음.)

---

## 부록 A. 문항 161개 (3~4학년군 84, 5~6학년군 77)
- 열: id, word(정답), 학년군, topic, 한국어 뜻(ko), clue(설명), avoid(같이 오답으로 내지 않을 단어), base(목록에 그대로 없는 정답의 근거 어근).
- 2026-11-26 Plan의 임시 검사기로 V4~V8 위반 0건 확인. 사람 눈 검사(H1~H4)는 Review가 한다.
- 2026-11-26 Plan 수정 v1: 17문항(animal-09, school-04, home-04·06·08, clothes-06·07, nature-11, transport-01·03·06, time-09·10, feeling-05·08·12, action-05)의 설명·avoid를 고쳤다(15절 표). 고친 뒤 저장소의 `validateQuestions`(V1~V9)로 위반 0건, 초등 어휘 비율 97.4%를 다시 확인했다.

| id | word | 학년군 | topic | 한국어 뜻 | clue | avoid | base |
|---|---|---|---|---|---|---|---|
| animal-01 | cat | 3~4 | animal | 고양이 | A small pet. It says meow. |  |  |
| animal-02 | dog | 3~4 | animal | 개 | A pet animal. It says woof. |  |  |
| animal-03 | cow | 3~4 | animal | 소 | A farm animal. It gives us milk. |  |  |
| animal-04 | pig | 3~4 | animal | 돼지 | A pink farm animal. It says oink. |  |  |
| animal-05 | duck | 3~4 | animal | 오리 | A bird that can swim. It says quack. |  |  |
| animal-06 | rabbit | 3~4 | animal | 토끼 | It has long ears. It likes carrots. |  |  |
| animal-07 | monkey | 3~4 | animal | 원숭이 | It climbs trees and loves bananas. |  |  |
| animal-08 | fish | 3~4 | animal | 물고기 | It lives in water and swims all day. | duck |  |
| animal-09 | bird | 3~4 | animal | 새 | It has two wings and can fly. | bee,airplane,duck |  |
| animal-10 | elephant | 3~4 | animal | 코끼리 | A very big animal with a long nose. |  |  |
| animal-11 | lion | 5~6 | animal | 사자 | People call it the king of animals. | tiger |  |
| animal-12 | tiger | 5~6 | animal | 호랑이 | This big orange animal has black lines. |  |  |
| animal-13 | bear | 5~6 | animal | 곰 | A big animal. It sleeps all winter. |  |  |
| animal-14 | horse | 5~6 | animal | 말 | People ride this animal. It runs fast. |  |  |
| animal-15 | mouse | 5~6 | animal | 쥐 | A very small animal. It likes cheese. |  |  |
| animal-16 | bee | 5~6 | animal | 벌 | A small yellow and black bug. It makes honey. | bird |  |
| food-01 | apple | 3~4 | food | 사과 | A round red fruit. It grows on trees. | tomato |  |
| food-02 | banana | 3~4 | food | 바나나 | A long yellow fruit. Monkeys love it. |  |  |
| food-03 | milk | 3~4 | food | 우유 | A white drink. Cows give it to us. | juice |  |
| food-04 | egg | 3~4 | food | 달걀 | Chickens lay this. We eat it for breakfast. |  |  |
| food-05 | juice | 3~4 | food | 주스 | A drink made from fruit. | milk |  |
| food-06 | pizza | 3~4 | food | 피자 | Round food with cheese and tomato on top. |  |  |
| food-07 | carrot | 3~4 | food | 당근 | An orange vegetable. Rabbits like it. |  |  |
| food-08 | bread | 5~6 | food | 빵 | We bake it and make sandwiches with it. | cake |  |
| food-09 | cake | 5~6 | food | 케이크 | A sweet food for birthday parties. | bread,candy |  |
| food-10 | candy | 5~6 | food | 사탕 | This small sweet food is bad for your teeth. | cake |  |
| food-11 | cheese | 5~6 | food | 치즈 | This yellow food is made from milk. |  |  |
| food-12 | potato | 5~6 | food | 감자 | This brown vegetable grows under the ground. | carrot |  |
| food-13 | tomato | 5~6 | food | 토마토 | A red vegetable. We put it in salad. | apple |  |
| food-14 | watermelon | 5~6 | food | 수박 | A big green fruit. It is red inside. |  |  |
| body-01 | eye | 3~4 | body | 눈 | We see with it. |  |  |
| body-02 | ear | 3~4 | body | 귀 | We listen with it. |  |  |
| body-03 | nose | 3~4 | body | 코 | We smell with it. |  |  |
| body-04 | mouth | 3~4 | body | 입 | We eat and speak with it. | tooth |  |
| body-05 | hand | 3~4 | body | 손 | It has five fingers. |  |  |
| body-06 | foot | 3~4 | body | 발 | We put socks and shoes on it. | leg |  |
| body-07 | leg | 3~4 | body | 다리 | It is between your body and your foot. | foot |  |
| body-08 | tooth | 5~6 | body | 이 | It is white and hard. We brush it every day. | hair |  |
| body-09 | hair | 5~6 | body | 머리카락 | It grows on your head. It can be long. |  |  |
| body-10 | finger | 5~6 | body | 손가락 | Your hand has five of these. |  |  |
| body-11 | neck | 5~6 | body | 목 | It is between your head and your body. |  |  |
| people-01 | mother | 3~4 | people | 엄마 | She is your father's wife. |  |  |
| people-02 | father | 3~4 | people | 아빠 | He is your mother's husband. |  |  |
| people-03 | baby | 3~4 | people | 아기 | A very young child. It cries a lot. |  |  |
| people-04 | teacher | 3~4 | people | 선생님 | This person helps students learn at school. |  | teach |
| people-05 | friend | 3~4 | people | 친구 | A person you like and play with. |  |  |
| people-06 | doctor | 3~4 | people | 의사 | You see this person when you are sick. |  |  |
| people-07 | sister | 5~6 | people | 언니, 누나, 여동생 | A girl with the same mother and father as you. |  |  |
| people-08 | aunt | 5~6 | people | 이모, 고모 | Your mother's sister or your father's sister. |  |  |
| people-09 | uncle | 5~6 | people | 삼촌 | Your father's brother or your mother's brother. |  |  |
| people-10 | cook | 5~6 | people | 요리사 | This person makes food at a restaurant. |  |  |
| people-11 | pilot | 5~6 | people | 조종사 | This person flies an airplane. |  |  |
| people-12 | police | 5~6 | people | 경찰 | They catch bad people and keep us safe. |  |  |
| school-01 | book | 3~4 | school | 책 | We read it. It has many pages. |  |  |
| school-02 | pencil | 3~4 | school | 연필 | We write and draw with it. | paper |  |
| school-03 | desk | 3~4 | school | 책상 | We sit at it to study at school. | chair |  |
| school-04 | chair | 3~4 | school | 의자 | We sit on it at a desk. | desk,bed |  |
| school-05 | bag | 3~4 | school | 가방 | We carry our books in it. |  |  |
| school-06 | clock | 3~4 | school | 시계 | It tells us the time. |  |  |
| school-07 | scissors | 5~6 | school | 가위 | We cut paper with them. | knife |  |
| school-08 | homework | 5~6 | school | 숙제 | Your teacher gives it. You do it after school. |  |  |
| school-09 | map | 5~6 | school | 지도 | A picture that shows where places are. |  |  |
| school-10 | paper | 5~6 | school | 종이 | We write and draw on it. | pencil,book |  |
| home-01 | bed | 3~4 | home | 침대 | We sleep on it at night. |  |  |
| home-02 | door | 3~4 | home | 문 | We open it to go into a room. | window |  |
| home-03 | window | 3~4 | home | 창문 | We look out through it. It is glass. | door |  |
| home-04 | spoon | 3~4 | home | 숟가락 | We hold it and eat soup with it. | mouth,cup |  |
| home-05 | cup | 3~4 | home | 컵 | We drink water from it. |  |  |
| home-06 | knife | 5~6 | home | 칼 | We cut food with it in the kitchen. | scissors,tooth |  |
| home-07 | umbrella | 5~6 | home | 우산 | We use it when it rains. |  |  |
| home-08 | key | 5~6 | home | 열쇠 | We put it in a door to open it. | hand |  |
| home-09 | kitchen | 5~6 | home | 부엌 | We cook food in this room. |  |  |
| home-10 | television | 5~6 | home | 텔레비전 | We watch shows on it at home. |  |  |
| home-11 | telephone | 5~6 | home | 전화기 | We call our friends with it. | camera |  |
| home-12 | camera | 5~6 | home | 카메라 | We take pictures with it. | telephone |  |
| clothes-01 | hat | 3~4 | clothes | 모자 | We wear it on our head. |  |  |
| clothes-02 | shoes | 3~4 | clothes | 신발 | We wear them on our feet outside. | socks | shoe |
| clothes-03 | socks | 3~4 | clothes | 양말 | We wear them under our shoes. | shoes | sock |
| clothes-04 | pants | 3~4 | clothes | 바지 | We wear them on our legs. |  |  |
| clothes-05 | coat | 5~6 | clothes | 외투, 코트 | We wear it over our clothes when it is cold. | shirt |  |
| clothes-06 | shirt | 5~6 | clothes | 셔츠 | We wear it under a coat. It has buttons. | coat,dress,pants |  |
| clothes-07 | dress | 5~6 | clothes | 원피스, 드레스 | Girls wear it. It is a top and skirt together. |  |  |
| clothes-08 | belt | 5~6 | clothes | 허리띠, 벨트 | It holds up our pants. |  |  |
| nature-01 | sun | 3~4 | nature | 해, 태양 | It gives us light in the day. |  |  |
| nature-02 | moon | 3~4 | nature | 달 | It is round. We see it at night. |  |  |
| nature-03 | rain | 3~4 | nature | 비 | Water that falls from the clouds. | snow |  |
| nature-04 | snow | 3~4 | nature | 눈 | White and cold, it falls in winter. | rain |  |
| nature-05 | tree | 3~4 | nature | 나무 | A tall plant. Birds live in it. | flower |  |
| nature-06 | flower | 3~4 | nature | 꽃 | A pretty plant. It smells good. | tree |  |
| nature-07 | cloud | 5~6 | nature | 구름 | It is white or gray, up in the sky. | snow,airplane |  |
| nature-08 | river | 5~6 | nature | 강 | Water that runs to the sea. |  |  |
| nature-09 | sea | 5~6 | nature | 바다 | Very big salty water. Ships go on it. | river |  |
| nature-10 | mountain | 5~6 | nature | 산 | It is very high. People climb it. | tree |  |
| nature-11 | wind | 5~6 | nature | 바람 | We cannot see it, but it moves the trees. | cold |  |
| place-01 | zoo | 3~4 | place | 동물원 | We see lions and tigers here. |  |  |
| place-02 | school | 3~4 | place | 학교 | Students learn here with their teachers. |  |  |
| place-03 | park | 3~4 | place | 공원 | A green place to play and walk. | beach,zoo |  |
| place-04 | hospital | 3~4 | place | 병원 | Sick people go here to get well. |  |  |
| place-05 | library | 5~6 | place | 도서관 | You can borrow books here. |  |  |
| place-06 | farm | 5~6 | place | 농장 | Cows and pigs live here. |  |  |
| place-07 | restaurant | 5~6 | place | 식당 | We go here to eat food. A cook makes it. |  |  |
| place-08 | bank | 5~6 | place | 은행 | We keep our money here. |  |  |
| place-09 | beach | 5~6 | place | 해변 | We play in the sand here, by the sea. |  |  |
| transport-01 | bus | 3~4 | transport | 버스 | Many people ride it on the road. |  |  |
| transport-02 | train | 3~4 | transport | 기차 | It is long and runs on tracks. | subway |  |
| transport-03 | airplane | 3~4 | transport | 비행기 | We ride in it to fly far away. | pilot |  |
| transport-04 | boat | 3~4 | transport | 배 | It goes on the water. | duck,fish |  |
| transport-05 | bike | 3~4 | transport | 자전거 | It has two wheels. You ride it. |  |  |
| transport-06 | taxi | 5~6 | transport | 택시 | A car with a driver. You pay to ride it. | bus,subway,train |  |
| transport-07 | truck | 5~6 | transport | 트럭 | A big car that carries heavy things. | bus |  |
| transport-08 | subway | 5~6 | transport | 지하철 | A train that runs under the city. |  |  |
| music-01 | piano | 3~4 | music | 피아노 | It has many black and white keys. |  |  |
| music-02 | guitar | 3~4 | music | 기타 | It has six strings. We play it. |  |  |
| music-03 | drum | 3~4 | music | 북, 드럼 | We hit it to make music. |  |  |
| music-04 | dance | 3~4 | music | 춤추다 | We move our body to music. |  |  |
| music-05 | sing | 3~4 | music | 노래하다 | We do this with our voice and music. |  |  |
| sports-01 | swim | 3~4 | sports | 수영하다 | We move our arms and legs in water. | fish,duck,boat |  |
| sports-02 | soccer | 5~6 | sports | 축구 | Players kick a ball into a goal. |  |  |
| sports-03 | basketball | 5~6 | sports | 농구 | In this sport, players shoot at a high ring. |  |  |
| sports-04 | baseball | 5~6 | sports | 야구 | In this sport, players hit with a bat and run. |  |  |
| sports-05 | tennis | 5~6 | sports | 테니스 | Two players hit a small ball over a net. |  |  |
| sports-06 | ski | 5~6 | sports | 스키를 타다 | We do this on snow. We go down mountains. |  |  |
| time-01 | morning | 3~4 | time | 아침 | The time when the sun comes up. |  |  |
| time-02 | night | 3~4 | time | 밤 | It is dark. We sleep at this time. |  |  |
| time-03 | winter | 3~4 | time | 겨울 | The cold season with snow. |  |  |
| time-04 | summer | 3~4 | time | 여름 | The hottest season of the year. |  |  |
| time-05 | spring | 5~6 | time | 봄 | The season when flowers start to grow. |  |  |
| time-06 | autumn | 5~6 | time | 가을 | The season between summer and winter. |  |  |
| time-07 | weekend | 5~6 | time | 주말 | Saturday and Sunday. |  |  |
| time-08 | birthday | 5~6 | time | 생일 | A party with cake and presents, once a year. |  | birth+day |
| time-09 | tomorrow | 5~6 | time | 내일 | Today is Monday, so Tuesday will be this. |  |  |
| time-10 | yesterday | 5~6 | time | 어제 | Today is Tuesday, so Monday was this. | weekend |  |
| feeling-01 | happy | 3~4 | feeling | 행복한 | You feel this when you smile. |  |  |
| feeling-02 | sad | 3~4 | feeling | 슬픈 | You feel this when you cry. |  |  |
| feeling-03 | hot | 3~4 | feeling | 뜨거운, 더운 | Fire and the summer sun are this. |  |  |
| feeling-04 | cold | 3~4 | feeling | 차가운, 추운 | Ice and snow are this. |  |  |
| feeling-05 | big | 3~4 | feeling | 큰 | An elephant is this. A mouse is not. | tall,heavy |  |
| feeling-06 | small | 3~4 | feeling | 작은 | A mouse is this. An elephant is not. |  |  |
| feeling-07 | fast | 5~6 | feeling | 빠른 | It is not slow. |  |  |
| feeling-08 | slow | 5~6 | feeling | 느린 | It takes a long time. It is not fast. |  |  |
| feeling-09 | sick | 5~6 | feeling | 아픈 | You feel this way, so you go to a doctor. |  |  |
| feeling-10 | delicious | 5~6 | feeling | 맛있는 | Food that tastes very good is this. |  |  |
| feeling-11 | busy | 5~6 | feeling | 바쁜 | You have many things to do. |  |  |
| feeling-12 | heavy | 5~6 | feeling | 무거운 | It is hard to carry, like a big rock. | big |  |
| feeling-13 | beautiful | 5~6 | feeling | 아름다운 | Very, very pretty. |  | beauty |
| feeling-14 | brave | 5~6 | feeling | 용감한 | Not afraid of danger. |  |  |
| feeling-15 | tall | 5~6 | feeling | 키가 큰 | Basketball players are often this. | big |  |
| action-01 | run | 3~4 | action | 달리다 | Move your legs very fast. |  |  |
| action-02 | walk | 3~4 | action | 걷다 | Move on your feet, not fast. |  |  |
| action-03 | jump | 3~4 | action | 뛰어오르다 | Go up into the air with your legs. |  |  |
| action-04 | sleep | 3~4 | action | 자다 | We do this in bed at night. |  |  |
| action-05 | eat | 3~4 | action | 먹다 | We do this with food in our mouth. | drink,cook |  |
| action-06 | drink | 3~4 | action | 마시다 | We do this with water and juice. | eat |  |
| action-07 | read | 3~4 | action | 읽다 | We do this with books. | write |  |
| action-08 | write | 3~4 | action | 쓰다 | We do this with a pencil. | read |  |
| action-09 | cry | 5~6 | action | 울다 | We do this when we are very sad. |  |  |
| action-10 | climb | 5~6 | action | 오르다 | We go up a mountain or a tree this way. |  |  |
| action-11 | wash | 5~6 | action | 씻다 | We do this to our hands before we eat. |  |  |
| action-12 | buy | 5~6 | action | 사다 | We pay money to get things. |  |  |
| action-13 | listen | 5~6 | action | 듣다 | We do this with our ears. |  |  |
| action-14 | smile | 5~6 | action | 미소 짓다 | Your mouth does this when you are happy. |  |  |

## 부록 B. 2022 개정 기본 어휘 중 초등 권장(*) 단어 (Plan 추출, 819개 형태)
- 출처: 부록 C의 KICE Word Lister 안내 PDF 7~36쪽(인쇄 쪽 5~34) 「기본 어휘 목록」에서 `*` 하나만 붙은 단어. 철자 변이형(aeroplane, colour, cheque, okey, OK, nope, nay, yeah, yep, dialog, cooky, programme, maths/math, grey 등)과 서수 twenty-first 등이 같이 들어 있다. `I`는 대명사.
- `src/data/vocab/elementary-2022.txt`로 한 줄에 하나씩 옮긴다(소문자로 바꿔 비교).

a, about, above, across, act, add, address, adult, aeroplane, afraid, after, afternoon, again, against, age, ago, agree, ahead, air, airplane, album, all, almost, alone, along, already, alright, also, always, and, animal, another, answer, any, apartment, apple, area, arm, around, arrive, art, as, ask, at, aunt, autumn, away, baby, back, bad, badminton, bag, bake, ball, banana, bank, base, baseball, basket, basketball, bat, bath, be, beach, bear, beauty, because, become, bed, bee, beef, before, begin, behind, believe, bell, below, belt, beside, between, big, bike, bill, bird, birth, biscuit, black, blood, blue, board, boat, body, bone, book, borrow, both, bottle, bottom, box, boy, brave, bread, break, breakfast, bridge, bright, bring, brother, brown, brush, build, burn, bus, business, busy, but, butter, button, buy, by, cake, call, camera, camp, campaign, can, candy, cap, car, card, care, carrot, carry, case, cash, cat, catch, center, certain, chair, chance, change, cheap, check, cheese, cheque, chicken, child, chocolate, choose, church, circle, city, class, clean, clear, clever, climb, clock, close, clothes, cloud, club, coat, coffee, cold, collect, college, color, colour, come, comic, company, compute, condition, congratulate, control, cook, cookie, cooky, cool, corner, cost, could, country, couple, course, court, cousin, cover, cow, crayon, cream, cross, cry, culture, cup, curtain, customer, cut, dance, danger, dark, date, daughter, day, dead, death, decide, deep, delicious, design, desk, dialog, dialogue, die, difficult, dinner, discuss, do, doctor, dog, doll, door, double, doughnut, down, draw, dream, dress, drink, drive, drop, drum, dry, duck, during, ear, early, earth, east, eat, egg, eight, elephant, eleven, end, energy, enough, enter, evening, every, example, exercise, eye, face, fact, fail, fall, family, fan, far, farm, fast, fat, father, favorite, favourite, feel, festival, field, fight, file, fill, film, find, fine, finger, finish, fire, first, fish, five, fix, floor, flower, fly, focus, food, fool, foot, football, for, forest, forget, fork, form, four, fox, free, fresh, friend, from, front, fruit, full, fun, future, game, garden, gas, gentleman, get, girl, give, glad, glass, go, goal, god, gold, good, goodbye, grandfather, grape, grass, gray, great, green, grey, ground, group, grow, guess, guitar, gum, guy, habit, hair, hamburger, hand, hang, happy, hard, hat, hate, have, he, head, heart, heat, heavy, hello, helmet, help, here, hero, hey, hi, high, hike, hill, history, hit, hobby, hold, holiday, home, homework, honest, hope, horse, hospital, hot, hour, house, how, however, human, hundred, hunt, hurry, husband, I, ice, idea, if, image, in, inside, internet, into, introduce, invite, issue, it, jacket, jam, job, join, juice, jump, just, keep, key, kick, kid, kill, kind, king, kiss, kitchen, knife, know, lady, lake, land, large, laser, last, late, lazy, learn, left, leg, lesson, letter, library, lie, life, light, like, line, lion, lip, listen, little, live, long, look, love, low, luck, lunch, mad, mail, make, man, many, map, marathon, market, marry, math, mathematics, maths, may, meat, medal, meet, member, memory, middle, might, milk, mind, miss, model, money, monkey, month, moon, morning, mother, mountain, mouse, mouth, move, movie, much, music, must, name, nation, nature, nay, near, neck, need, never, new, news, newspaper, next, nice, night, nine, no, nope, north, nose, not, note, notebook, nothing, now, number, nurse, of, off, office, often, oil, OK, okay, okey, old, on, one, only, open, or, orange, out, over, page, paint, pants, paper, parent, park, part, partner, party, pass, pay, pen, pencil, people, phone, piano, pick, picture, pig, pilot, pink, pizza, place, plan, plastic, play, please, point, police, poor, potato, power, present, pretty, prince, print, problem, program, programme, project, puppy, push, put, queen, question, quick, quiet, quiz, rabbit, race, radio, rain, read, ready, recreation, red, remember, restaurant, restroom, return, ribbon, rich, right, ring, river, road, robot, rock, room, rose, run, sad, safe, salad, sale, salt, same, sand, sandwich, save, say, school, science, scissors, score, sea, season, second, see, sell, send, service, set, seven, she, ship, shirt, shoe, shop, short, should, show, shy, sick, side, sing, sister, sit, six, size, skate, ski, skin, skirt, sky, sleep, slow, small, smell, smile, snow, so, soccer, sock, soft, software, some, son, song, sorry, sound, soup, south, space, spaghetti, speak, speed, spoon, sport, spring, staff, stand, star, start, stay, steak, stone, stop, store, story, street, strong, study, style, subway, sugar, summer, sun, sure, swim, table, tail, take, talk, tall, tape, taste, taxi, teach, team, telephone, television, tell, ten, tennis, tent, test, textbook, than, thank, that, the, there, they, thing, think, third, thirst, thirteen, thirty, this, three, ticket, tiger, time, tire, to, today, together, tomato, tomorrow, tonight, too, tooth, top, touch, town, toy, track, train, travel, tree, trip, truck, true, try, turn, twelve, twenty, twenty-first, twenty-second, twenty-third, twice, two, type, ugly, umbrella, uncle, under, understand, up, use, vegetable, very, video, violin, visit, voice, wait, wake, walk, wall, want, war, warm, wash, watch, water, watermelon, way, we, wear, weather, website, wedding, week, weekend, weight, welcome, well, west, wet, what, when, where, white, who, why, wife, will, win, wind, window, wine, winter, wish, with, woman, wood, word, work, world, worry, write, wrong, yeah, year, yellow, yep, yes, yesterday, you, young, zoo

## 부록 C. 확인한 자료 (모두 2026-11-26 열람)
| 내용 | 주소 |
|---|---|
| Hand Landmarker Web 가이드(사용법·옵션·결과 형식·모델 주소). `ai.google.dev/...`에서 이 주소로 301 이동. 쪽에 "마지막 수정일" 표시 없음 | https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/web_js |
| Hand Landmarker 개요(21점 번호, 모델 묶음, Pixel 6 지연 시간, 추적 설명, Hugging Face 모델 주소) | https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker |
| Gesture Recognizer 개요(기본 제스처 8종, 지연 시간) | https://developers.google.com/edge/mediapipe/solutions/vision/gesture_recognizer |
| npm `@mediapipe/tasks-vision` 버전·게시일(`npm view`): latest 1.2.3(2026-11-11), nightly 1.3.0-rc.20261122 | https://www.npmjs.com/package/@mediapipe/tasks-vision |
| 1.2.3 파일 목록·크기 | https://data.jsdelivr.com/v1/packages/npm/@mediapipe/tasks-vision@1.2.3?structure=flat |
| 1.2.3 타입 정의(FilesetResolver, HandLandmarkerOptions, delegate, canvas) | https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/vision.d.ts |
| 1.2.3 번들(wasm 파일 이름 규칙, 로더 script 삽입) | https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/vision_bundle.mjs |
| 모델(Google): 200, 7,819,105B, `access-control-allow-origin: *` | https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task |
| 모델(Hugging Face) SHA-256 `fbc2a300…cde1`, 7,819,105B | https://huggingface.co/api/models/litert-community/MediaPipe-HandLandmarker-Full/tree/main |
| getUserMedia(보안 컨텍스트, 오류 이름, facingMode). 쪽 마지막 수정 2025-11-30 | https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia |
| GitHub Pages 한도(1GB, 대역폭 100GB/월 soft, 사용자 지정 워크플로는 빌드 횟수 제한 없음) | https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits |
| GitHub Pages 게시 원천을 GitHub Actions로 | https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site |
| GitHub 요금제(Free: 공개 저장소에서 Pages) | https://docs.github.com/en/get-started/learning-about-github/githubs-plans |
| 2022 개정 영어과 기본 어휘(KICE Word Lister 안내, 교육부 고시 제2022-33호 [별책 14] 인용) | https://www.goe.go.kr/resource/old/BBSMSTR_000000030136/BBS_202307111028067791.pdf |
| 저장소 상태(`gh repo view eversunk2-tech/english1`: 공개, 비어 있음) | https://github.com/eversunk2-tech/english1 |
| 형제 프로젝트 참고(읽기만): spec 형식, Vite 8/TS 6/Vitest 5, Pages 워크플로 | `/Users/sungchul/Desktop/play2/selectio game/`, `/Users/sungchul/Desktop/play2/game2/.github/workflows/pages.yml` |

**확인하지 못한 것**: 2022 개정 교육과정의 초등 문장 길이 기준(V4의 8/10낱말은 추정), iPad Safari에서 GPU 대리 실행이 실제로 되는지·속도, 어린이 손에서의 임계값(4.6), GitHub Pages의 `.wasm` MIME과 캐시 시간, 트레일링 슬래시 넘겨주기 — 모두 S2·S7과 12.4에서 확인한다.
