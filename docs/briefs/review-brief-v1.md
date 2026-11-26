# Review 지침 v1 — Catch the Word! (Build S1~S6 검증)

작성: 2026-11-26, 코디네이터
대상: Review 서브에이전트 (Opus 5.5). Build와는 다른 별도 서브에이전트다.

## 1. 너의 일

Build가 spec.md(사용자 승인 완료)대로 S1~S6을 구현했다고 보고했다. 그것이 **정말 정상 동작하는지, 코드에 문제가 없는지** 직접 확인하고 `review.md`를 쓴다.

- 프로젝트 루트: `/Users/sungchul/Desktop/play2/영어게임` (경로에 한글 → 명령에서 항상 따옴표).
- 기준: `spec.md`. **Build의 보고는 확인 대상이지 근거가 아니다.** 직접 재현·측정하고, 스크린샷은 직접 열어 본 것만으로 판정한다.
- 점수·판정은 저장소 코드를 쓰지 않고 **spec 문장만 보고 짠 독립 계산**과 견준다(예: 5.5 점수식, 4.1~4.3 주먹 판정, 5.4 배치 겹침).

## 2. 수정 범위 (엄수)

- **만들거나 고칠 수 있는 파일: `/Users/sungchul/Desktop/play2/영어게임/review.md` 하나뿐.**
- 코드·테스트·설정·spec.md·CLAUDE.md·docs/briefs는 고치지 않는다. git 금지. `npm install` 금지(이미 설치됨).
- 빌드·테스트 실행은 자유(`dist/`, `test-results/`, `playwright-report/`가 다시 생기는 것은 괜찮다).
- 독립 계산 스크립트, 스크린샷, 임시 파일은 scratchpad 폴더에만 둔다:
  `/private/tmp/claude-501/-Users-sungchul-Desktop-play2-----/7bd2217c-e14d-425c-9176-0b2e64f9c244/scratchpad/review`
- 띄운 서버는 끝나면 모두 끈다.

## 3. 확인할 것

### A. 자동 검사 재현
- `npm run check`(typecheck + test + check:data + test:e2e)를 직접 돌려 숫자를 적는다. 실패가 있으면 혼자 다시 돌려 우연인지 가린다.
- `npm run build` 뒤 `dist/` 안에 `/`로 시작하는 절대 경로가 없는지, 외부 주소(http로 시작하는 주소)가 남아 있는지 살핀다.

### B. spec 대조 (코드 읽기)
- 4절 판정(fist, gestureState, handTracks, hitTest), 3절 좌표(mapping, 거울), 5절 규칙(session, scoring, questions, layout)이 spec 식·임계값·상태 규칙과 같은지. `src/config.ts` 값이 spec 4.6·5.3과 같은지.
- 테스트가 실제로 의미 있는 것을 확인하는지(항상 통과하는 빈 검사, 코드 결과를 기대값으로 쓰는 자기 참조 검사가 없는지).
- 6절 문구, 8절 오류 문구, 9절 개인정보 안내가 화면에 그대로 나오는지.

### C. Build가 spec과 다르게 했다고 보고한 것
- **`src/platform/networkGuard.ts`**: MediaPipe 1.2.3 번들 안에 `https://odml.pa.googleapis.com/v1/log`로 통계를 보내는 코드가 있다는 주장이 사실인지 `node_modules/@mediapipe/tasks-vision`에서 직접 확인. 가드가 같은 출처 요청(모델·wasm 적재)을 막지 않는지, 바깥 요청을 모두 막는지(fetch 말고 XHR·sendBeacon 등 다른 경로는 없는지), 부작용이 없는지.
- 추가 파일(`src/data/words.ts`, `src/ui/dom.ts`), `#cursor-layer`, DOM 버튼으로 만든 START/AGAIN 카드의 손 잡기 판정, tsconfig `types: node`, `predev:https`, 테스트 조정(콘솔 INFO 로그 제외, `probeLayout`·`state()` 확장 훅) — 각각 문제가 없는지. 특히 테스트 훅이 `?test=1` 없이 노출되지 않는지, 게임 규칙을 바꿀 수 없는지.

### D. 실제로 화면 보기
- `?input=pointer`로 한 판을 직접 해 보고(Playwright 스크립트로 조작 가능) 시작·문제·오답·놓침·일시정지·결과 화면 스크린샷을 찍어 **직접 열어 본다**. 화면 크기 3종(1180×820, 820×1180, 1024×768). 글자 넘침, 겹침, 읽기 어려운 대비, 깨진 레이아웃이 없는지.
- 카메라 모드(가짜 카메라)로 손 확인 화면까지 가서 스크린샷.

### E. 문항 데이터 사람 눈 검사 (spec 7절 H1~H4)
- 161문항 전부를 읽고: 설명이 정답 하나만 가리키는지(같은 판에 나올 수 있는 다른 단어도 맞는 답이 되는지), 정답 단어나 그 변형이 설명에 들어 있지 않은지, 초등 수준인지, 한국어 뜻이 맞는지, 영어 문법·철자 오류가 없는지. 문제 문항은 id와 이유를 적는다.
- 부록 B 어휘 목록에서 무작위 20개를 골라 원문(spec 부록 C의 교육과정 PDF 주소)과 맞춰 본다. 원문을 열 수 없으면 그렇게 적는다.

### F. 코드 품질·안전
- 메모리·자원 누수(카메라 트랙 정지, rAF·타이머 해제, HandLandmarker `close()`), 오류 처리, CSP, `localStorage` try/catch, 테스트 훅의 운영 노출, GitHub 워크플로(`ci.yml`, `pages.yml`)가 맞게 쓰였는지(권한, Pages 배포 방식, Node 버전, 모델 파일 포함 여부).
- 커밋되면 안 되는 것(비밀값, 큰 불필요 파일)이 `.gitignore` 밖에 있는지.

### G. 태블릿 사람 확인 목록
- spec 12.4를 바탕으로, 배포 뒤 사용자가 iPad에서 따라 할 수 있는 짧은 체크리스트(한국어, 초등 교사가 이해할 말로)를 review.md 끝에 만든다.

## 4. review.md 형식 (한국어)

1. **판정**: `통과`(반드시 수정 0건) 또는 `수정 필요`
2. 직접 돌린 명령과 결과 숫자
3. **반드시 수정**: 각 항목에 파일:줄, 무엇이 왜 문제인지, 재현 방법, 고치는 방향
4. **권장 수정**(고치면 좋지만 배포를 막지 않음)
5. 문항 검사 결과(문제 문항 목록)
6. Build 보고와 실제가 다른 점
7. 사용자 결정이 필요한 것
8. 자동으로 확인할 수 없어 남은 것 + 태블릿 체크리스트

"반드시 수정"은 실제로 재현했거나 spec과 명백히 어긋나는 것만 넣는다. 추측은 "권장"이나 "남은 것"으로.

## 5. 끝나면 보고 (최종 메시지)
판정, 반드시 수정 항목 요약, 권장 수정 개수, 사용자 결정 필요 항목을 한국어로 짧게.
