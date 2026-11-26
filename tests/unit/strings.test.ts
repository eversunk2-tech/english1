import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CHALLENGE_LINES, DIFFICULTY_LABELS, difficultyDesc, upLevelName, ERROR_MESSAGES, PRIVACY_NOTICE, PRIVACY_VOICE_NOTICE, S, V2, VOICE_QUALITY_HINT, VERYHARD_BAND_NOTE, signed } from '../../src/ui/strings.ts';

const spec = readFileSync(resolve(__dirname, '..', '..', 'spec.md'), 'utf8');

describe('strings (spec 6·8.2·9)', () => {
  it('8.2 오류 문구가 spec과 글자 그대로 같다', () => {
    const map: [keyof typeof ERROR_MESSAGES, string][] = [
      ['insecure', '이 주소에서는 카메라를 쓸 수 없어요. https:// 로 시작하는 주소로 열어 주세요.'],
      ['denied', "카메라 사용이 허락되지 않았어요. 주소창 옆(또는 설정 › Safari › 카메라)에서 카메라를 '허용'으로 바꾼 뒤 [다시 시도]를 눌러 주세요."],
      ['notfound', '카메라를 찾지 못했어요. 카메라가 있는 태블릿에서 열어 주세요.'],
      ['busy', '다른 앱이 카메라를 쓰고 있어요. 다른 앱을 닫고 [다시 시도]를 눌러 주세요.'],
      ['download', '손 인식 파일을 받지 못했어요. 인터넷 연결을 확인하고 [다시 시도]를 눌러 주세요.'],
      ['init', '이 기기에서는 손 인식을 시작하지 못했어요. 터치로 할 수 있어요.'],
      ['other', '카메라를 켜지 못했어요. [다시 시도]를 누르거나 터치로 해 보세요.'],
    ];
    for (const [k, text] of map) {
      expect(ERROR_MESSAGES[k]).toBe(text);
      expect(spec.includes(`"${text}"`)).toBe(true);
    }
  });

  it('9절 개인정보 안내가 spec과 같다', () => {
    expect(PRIVACY_NOTICE).toBe('카메라 영상은 이 태블릿 안에서 손 위치를 찾는 데만 쓰여요. 저장하거나 다른 곳으로 보내지 않아요.');
    expect(spec.includes(`**"${PRIVACY_NOTICE}"**`)).toBe(true);
  });

  it('9절 v7 개인정보 안내 둘째 줄(PRIVACY_VOICE_NOTICE)이 spec과 같다', () => {
    expect(PRIVACY_VOICE_NOTICE).toBe('영어 읽어 주기는 인터넷 목소리(Google 등)를 쓸 수 있어요. 이때 영어 문제 문장만 보내져요.');
    expect(spec.includes(`**"${PRIVACY_VOICE_NOTICE}"**`)).toBe(true);
    expect(S.privacyVoice).toBe(PRIVACY_VOICE_NOTICE);
    expect(S.privacy).toBe(PRIVACY_NOTICE);
  });

  it('5.9.3 ① 디버그 고품질 목소리 안내 줄이 spec과 같다', () => {
    expect(VOICE_QUALITY_HINT).toBe('더 자연스러운 목소리: 고품질 영어 목소리를 내려받으세요');
    expect(spec.includes(`"${VOICE_QUALITY_HINT}")`)).toBe(true);
  });

  it('6절 문구', () => {
    expect(S.title).toBe('Catch the Word!');
    expect(S.subtitle).toBe('영어 설명을 읽고, 맞는 단어를 손으로 잡아요!');
    expect(S.standHint).toBe('태블릿을 가슴 높이에 세우고, 한 걸음 반(1~1.5m) 떨어져 서요');
    expect(S.startCamera).toBe('카메라로 시작');
    expect(S.startTouch).toBe('터치로 하기');
    expect(S.loadingCamera).toBe('카메라를 켜는 중…');
    expect(S.loadingModel(37)).toBe('손 인식 준비 중… 37%');
    expect(S.handcheckShowPalm).toBe('손바닥을 펴서 보여 주세요');
    expect(S.handcheckGrab).toBe('이제 START 위에서 주먹을 꽉 쥐어 보세요');
    expect(S.comeCloser).toBe('조금 더 가까이 와 주세요');
    expect(S.stepBack).toBe('조금 뒤로 가 주세요');
    expect(S.handNotVisible).toBe('손이 보이지 않아요');
    expect(S.pausedTitle).toBe('잠깐 멈췄어요');
    expect(S.pausedNoHand).toBe('손을 화면에 보여 주세요');
    expect(S.restArm).toBe('팔을 잠깐 쉬어요');
    expect(S.combo(3)).toBe('Combo ×3!');
    // Plan 수정 v1에서 확정된 문구(spec 5.1·5.7·5.8·6.2·8.2)
    expect(S.handcheckTouch).toBe('START 카드를 눌러 시작해요');
    expect(S.pausedNoHandResume).toBe('손바닥을 펴서 보여 주면 이어서 해요');
    expect(S.playAgainCard).toBe('AGAIN');
    expect(S.errorTitle).toBe('시작하지 못했어요');
    for (const t of [S.handcheckTouch, S.pausedNoHandResume, S.errorTitle]) expect(spec.includes(`"${t}"`)).toBe(true);
    expect(spec.includes('`AGAIN`')).toBe(true);
  });

  it('v2 난이도 문구가 spec 5.8·6.2와 글자 그대로 같다', () => {
    for (const d of ['easy', 'normal', 'hard', 'veryhard'] as const) {
      expect(spec.includes(`"${CHALLENGE_LINES[d]}"`), CHALLENGE_LINES[d]).toBe(true);
      expect(spec.includes(`\`${DIFFICULTY_LABELS[d].en}\`/`) || spec.includes(`/\`${DIFFICULTY_LABELS[d].en}\``)).toBe(true);
      expect(spec.includes(`\`${DIFFICULTY_LABELS[d].ko}\``), DIFFICULTY_LABELS[d].ko).toBe(true);
      expect(spec.includes(`[${DIFFICULTY_LABELS[d].en} ${DIFFICULTY_LABELS[d].ko}]`)).toBe(true);
    }
    expect(V2.penalty(20)).toBe('\u221220');
    expect(signed(142)).toBe('+142');
    expect(signed(0)).toBe('0');
    expect(signed(-20)).toBe('\u221220');
    expect(V2.wrongSummary(0, 0)).toBe('오답 0번');
    expect(V2.wrongSummary(3, 60)).toBe('오답 3번 (\u221260)');
    expect(spec.includes('"오답 3번 (−60)"')).toBe(true);
    expect(V2.wrongRow(1, 20)).toBe('오답 1번 \u221220');
    expect(spec.includes('"오답 1번 −20"')).toBe(true);
    expect(V2.wrongWords(['cat'])).toBe('오답: cat');
    expect(spec.includes('"오답: cat"')).toBe(true);
    expect(V2.resultCombo('5-6', 'hard')).toBe('5~6학년 · Hard');
    // v4 → v9: Very Hard 결과 머리·안내·권유
    expect(V2.resultCombo('3-4', 'veryhard')).toBe('Very Hard · 중학·심화 단어');
    expect(V2.resultCombo('all', 'veryhard')).toBe('Very Hard · 중학·심화 단어');
    expect(spec.includes('"Very Hard · 중학·심화 단어"')).toBe(true);
    expect(VERYHARD_BAND_NOTE).toBe('Very Hard는 학년과 상관없이 중학·심화 단어로 나와요');
    expect(spec.includes(`"${VERYHARD_BAND_NOTE}"`)).toBe(true);
    expect(CHALLENGE_LINES.hard).toBe('다음엔 Very Hard에 도전해 볼까요?');
    expect(DIFFICULTY_LABELS.veryhard).toEqual({ en: 'Very Hard', ko: '매우 어려움' });
    expect(spec.includes('"5~6학년 · Hard"')).toBe(true);
    expect(V2.resultCombo('3-4', 'normal')).toBe('3~4학년 · Normal');
    expect([S.great, S.goodJob, S.tryAgain, S.newRecord, S.startCard, S.score]).toEqual([
      'Great!', 'Good job!', 'Try again!', 'New record!', 'START', 'Score',
    ]);
  });

  it('v9 한 줄 설명이 spec 6.2와 글자 그대로 같고, Normal·Hard는 학년군(3~4·5~6·모두)에 따라 {위}가 바뀐다', () => {
    // spec 6.2 v9 문장(테스트 안에 따로 적음)
    const want = {
      easy: '천천히 떨어져요. 처음 하는 친구에게 좋아요.',
      normal: '조금 빨라요. {위} 단어가 2개 섞여 나와요.',
      hard: '빠르고 헷갈려요. {위} 단어가 4개 나와요!',
      veryhard: '중학·심화 단어가 아주 빠르게! 최고의 도전!',
    } as const;
    const up = { '3-4': '5~6학년', '5-6': '중학', all: '중학' } as const;
    for (const d of ['easy', 'normal', 'hard', 'veryhard'] as const) {
      expect(spec.includes(`"${want[d]}"`), want[d]).toBe(true);
      for (const band of ['3-4', '5-6', 'all'] as const) {
        expect(upLevelName(band)).toBe(up[band]);
        expect(difficultyDesc(d, band)).toBe(want[d].replace('{위}', up[band]));
      }
    }
    // spec 6.2의 예시 두 줄
    expect(difficultyDesc('normal', '5-6')).toBe('조금 빨라요. 중학 단어가 2개 섞여 나와요.');
    expect(spec.includes('"조금 빨라요. 중학 단어가 2개 섞여 나와요."')).toBe(true);
    expect(difficultyDesc('hard', '3-4')).toBe('빠르고 헷갈려요. 5~6학년 단어가 4개 나와요!');
    expect(spec.includes('"빠르고 헷갈려요. 5~6학년 단어가 4개 나와요!"')).toBe(true);
    // 가장 긴 줄은 Normal·3~4 선택 28자(spec 18.8)
    const lens = (['easy', 'normal', 'hard', 'veryhard'] as const).flatMap((d) => (['3-4', '5-6', 'all'] as const).map((b) => [...difficultyDesc(d, b)].length));
    expect(Math.max(...lens)).toBe(28);
    expect([...difficultyDesc('normal', '3-4')].length).toBe(28);
  });

  it('v9 디버그 더미 줄(spec 5.6.1 ⑨·18.8): base·up 더미를 ` · `로, 이름은 3-4·5-6·중학·심화', async () => {
    const { bagDebugLine } = await import('../../src/debug/debugOverlay.ts');
    const sizes = { '3-4': 143, '5-6': 87, 'vh-mid': 71, 'vh-adv': 48 };
    expect(bagDebugLine({ names: ['5-6', 'vh-mid'], remaining: { '3-4': 143, '5-6': 57, 'vh-mid': 40, 'vh-adv': 48 }, sizes, persist: true })).toBe(
      '문제 더미: 5-6 57/87 · 중학 40/71 남음',
    );
    expect(spec.includes('`문제 더미: 5-6 57/87 · 중학 40/71 남음`')).toBe(true);
    expect(bagDebugLine({ names: ['vh-mid', 'vh-adv'], remaining: { '3-4': 0, '5-6': 0, 'vh-mid': 71, 'vh-adv': 44 }, sizes, persist: false })).toBe(
      '문제 더미: 중학 71/71 · 심화 44/48 남음 · 저장 안 함',
    );
    expect(bagDebugLine({ names: ['3-4', '5-6'], remaining: { '3-4': 120, '5-6': 57, 'vh-mid': 71, 'vh-adv': 48 }, sizes, persist: true })).toBe(
      '문제 더미: 3-4 120/143 · 5-6 57/87 남음',
    );
  });
});
