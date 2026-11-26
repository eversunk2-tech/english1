import { describe, expect, it } from 'vitest';
import { chooseVoice, voiceGrade, voiceNames } from '../../src/audio/voicePick.ts';
import { MAC_EN_US_NAMES, macVoices, v } from '../helpers/voices.ts';

const pickedName = (r: ReturnType<typeof chooseVoice>): string => (r.mode === 'voice' ? r.voice.name : r.mode);

describe('voicePick (spec 5.9.1, 12.1 ①~⑪)', () => {
  it('① 이 맥 en-US 28개 + 다른 언어 → Samantha', () => {
    expect(MAC_EN_US_NAMES.length).toBe(28);
    expect(pickedName(chooseVoice(macVoices()))).toBe('Samantha');
  });

  it('② 같은 목록을 say 표기(Eddy (영어(미국)), lang en_US)로 → Samantha (영어(미국))', () => {
    const list = MAC_EN_US_NAMES.map((n) => v(`${n} (영어(미국))`, 'en_US'));
    expect(pickedName(chooseVoice([v('Yuna (한국어(대한민국))', 'ko_KR'), ...list]))).toBe('Samantha (영어(미국))');
  });

  it('③ 장난용만(Albert, Bells, Zarvox) → lang-only', () => {
    expect(chooseVoice([v('Albert', 'en-US'), v('Bells', 'en-US'), v('Zarvox', 'en-US')])).toEqual({ mode: 'lang-only' });
  });

  it('④ 빈 목록 → lang-only', () => {
    expect(chooseVoice([])).toEqual({ mode: 'lang-only' });
  });

  it('⑤ ko-KR·ja-JP만 → skip', () => {
    expect(chooseVoice([v('Yuna', 'ko-KR'), v('Kyoko', 'ja-JP')])).toEqual({ mode: 'skip' });
  });

  it('⑥ 안드로이드 예 → English United States', () => {
    const list = [
      v('한국어 대한민국', 'ko-KR', { default: true }),
      v('English United States', 'en-US', { localService: true }),
      v('English United Kingdom', 'en-GB'),
    ];
    expect(pickedName(chooseVoice(list))).toBe('English United States');
  });

  const windows = () => [
    v('Microsoft David - English (United States)', 'en-US', { localService: true }),
    v('Microsoft Zira - English (United States)', 'en-US', { localService: true }),
    v('Microsoft Mark - English (United States)', 'en-US', { localService: true }),
    v('Google US English', 'en-US', { localService: false }),
    v('Google UK English Female', 'en-GB', { localService: false }),
  ];

  it('⑦ 윈도 크롬 예 → Microsoft David(같은 B 등급에서 local 먼저, 그다음 목록 순서)', () => {
    expect(pickedName(chooseVoice(windows()))).toBe('Microsoft David - English (United States)');
    // local이 먼저: 구글을 앞에 두어도 David
    const reordered = [windows()[3]!, ...windows().slice(0, 3)];
    expect(pickedName(chooseVoice(reordered))).toBe('Microsoft David - English (United States)');
  });

  it('⑧ 엣지 예(⑦ + Microsoft Aria Online (Natural) remote) → Aria', () => {
    const list = [...windows(), v('Microsoft Aria Online (Natural) - English (United States)', 'en-US', { localService: false })];
    expect(pickedName(chooseVoice(list))).toBe('Microsoft Aria Online (Natural) - English (United States)');
  });

  it('⑨ Samantha·Samantha (Enhanced) → Samantha (Enhanced)', () => {
    expect(pickedName(chooseVoice([v('Samantha', 'en-US'), v('Samantha (Enhanced)', 'en-US')]))).toBe('Samantha (Enhanced)');
  });

  it('⑩ en-US는 Eddy·Flo뿐 + en-GB Daniel → Daniel', () => {
    expect(pickedName(chooseVoice([v('Eddy', 'en-US'), v('Flo', 'en-US'), v('Daniel', 'en-GB')]))).toBe('Daniel');
    // Daniel이 없으면 맨 뒤 목록에서라도 고른다(아무 소리 없는 것보다 낫다)
    expect(pickedName(chooseVoice([v('Eddy', 'en-US'), v('Flo', 'en-US')]))).toBe('Eddy');
  });

  it('⑪ 대소문자·_/-가 섞인 lang(EN_us) 처리', () => {
    expect(pickedName(chooseVoice([v('Yuna', 'ko_KR'), v('Samantha', 'EN_us')]))).toBe('Samantha');
    expect(pickedName(chooseVoice([v('Daniel', 'en_GB'), v('Samantha', 'EN_us')]))).toBe('Samantha');
  });

  it('이름 정리·등급(spec 5.9.1 예)', () => {
    expect(voiceNames('Eddy (영어(미국))').base).toBe('eddy');
    expect(voiceNames('Samantha (Enhanced)')).toEqual({ full: 'samantha (enhanced)', base: 'samantha' });
    expect(voiceNames('Microsoft Zira - English (United States)').base).toBe('zira');
    expect(voiceGrade('Samantha (Enhanced)')).toBe('A');
    expect(voiceGrade('Google UK English Female')).toBe('B');
    expect(voiceGrade('English United States')).toBe('C');
    expect(voiceGrade('Grandpa (영어(미국))')).toBe('D');
    // 옛 장난용 이름도 고르지 않음
    expect(chooseVoice([v('Princess', 'en-US'), v('Pipe Organ', 'en-US'), v('Deranged', 'en-US'), v('Hysterical', 'en-US')])).toEqual({
      mode: 'lang-only',
    });
  });
});
