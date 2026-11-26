# Embed 지침 v1 — 첫 커밋과 GitHub 푸시

작성: 2026-11-26, 코디네이터
대상: Embed 서브에이전트 (Sonnet)

## 1. 배경
Review 재검토 판정 **통과**(반드시 수정 0건, `review.md` 9절). CLAUDE.md 작업 사이클의 Embed = "깃 커밋하고 GitHub에 푸시한다". 저장소는 사용자가 정한 `eversunk2-tech/english1`(공개, 지금 비어 있음). `gh`는 eversunk2-tech 계정으로 로그인되어 있다.

## 2. 할 일
1. 프로젝트 루트 `/Users/sungchul/Desktop/play2/영어게임`(경로에 한글 → 항상 따옴표)에서 `git init -b main`.
2. 커밋 전에 확인:
   - `.gitignore`가 `node_modules/`, `dist/`, `public/mediapipe/`, `test-results/`, `playwright-report/`, `.DS_Store`를 빼는지.
   - `git add -A` 뒤 `git status`로 올라갈 파일 목록을 본다. 비밀값(.env, 토큰, 키), 큰 불필요 파일이 없어야 한다. `public/models/hand_landmarker.task`(약 7.5MB)는 spec대로 **포함**한다. 100MB 넘는 파일이 없는지 확인.
   - 문제가 보이면 커밋하지 말고 멈춰서 보고한다(`.gitignore`를 고치는 것도 하지 않는다 — 보고만).
3. 커밋 하나. 메시지(한국어 제목 + 본문 몇 줄: 무엇을 만들었는지, Review 통과). 메시지 끝에 빈 줄 다음 정확히:
   `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
   작성자는 이 맥의 git 전역 설정을 그대로 쓴다(바꾸지 않는다).
4. `git remote add origin https://github.com/eversunk2-tech/english1.git` → `git push -u origin main`.
5. 푸시 뒤 `gh run list --repo eversunk2-tech/english1 --commit <전체 40자 해시>`로 워크플로가 시작됐는지 본다. CI가 끝날 때까지 기다려 결과를 확인한다(`gh run watch <id> --repo ... --exit-status`, 최대 약 15분). 실패하면 `gh run view <id> --log-failed`에서 원인 줄을 뽑아 보고한다(고치지 않는다).
   - Pages 배포 워크플로는 저장소 Settings → Pages의 Source가 아직 "GitHub Actions"로 켜져 있지 않아 실패할 수 있다. 그 경우 실패 원인만 보고한다.

## 3. 하지 않는 것 (엄수)
- 코드·spec·문서 파일 수정 금지. 강제 푸시(`--force`) 금지. 다른 브랜치·태그 만들기 금지.
- **저장소 설정 변경 금지**(Pages 켜기, 공개 여부, 브랜치 보호 등 — `gh api`로 설정을 바꾸는 호출 포함). 사용자 승인이 필요한 일이다.
- 원격에 이미 커밋이 있으면(비어 있지 않으면) 푸시하지 말고 멈춰서 보고한다.

## 4. 보고 (최종 메시지, 한국어)
- 커밋 해시(전체), 커밋에 들어간 파일 수와 큰 파일 목록
- 푸시 결과
- 워크플로별 결과(이름, 상태, 실패면 원인 줄)
