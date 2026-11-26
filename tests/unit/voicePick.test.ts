import { describe, expect, it } from 'vitest';
import { chooseVoice, describeChoice, needsQualityHint, voiceGrade, voiceNames } from '../../src/audio/voicePick.ts';
import { MAC_EN_US_NAMES, edgeVoices, macChromeVoices, macVoices, remote, v, windowsChromeVoices } from '../helpers/voices.ts';

const pickedName = (r: ReturnType<typeof chooseVoice>): string => (r.mode === 'voice' ? r.voice.name : r.mode);
const pickedLang = (r: ReturnType<typeof chooseVoice>): string => (r.mode === 'voice' ? r.voice.lang : '');

const DAVID = 'Microsoft David - English (United States)';
const ZIRA = 'Microsoft Zira - English (United States)';
const ARIA = 'Microsoft Aria Online (Natural) - English (United States)';

describe('voicePick v7 (spec 5.9.1, 12.1 ①~⑲)', () => {
  it('① 이 맥 en-US 28개 + 다른 언어(맥 Safari 예상 목록, Google 없음) → Samantha', () => {
    expect(MAC_EN_US_NAMES.length).toBe(28);
    expect(pickedName(chooseVoice(macVoices()))).toBe('Samantha');
  });

  it('② 같은 목록을 say 표기(Eddy (영어(미국)), lang en_US)로 → Samantha (영어(미국))', () => {
    const list = MAC_EN_US_NAMES.map((n) => v(`${n} (영어(미국))`, 'en_US'));
    expect(pickedName(chooseVoice([v('Yuna (한국어(대한민국))', 'ko_KR'), ...list]))).toBe('Samantha (영어(미국))');
  });

  it('③ 장난용만(Albert, Bells, Zarvox) → skip (v5 lang-only)', () => {
    expect(chooseVoice([v('Albert', 'en-US'), v('Bells', 'en-US'), v('Zarvox', 'en-US')])).toEqual({ mode: 'skip' });
  });

  it('④ 빈 목록 → wait (v5 lang-only)', () => {
    expect(chooseVoice([])).toEqual({ mode: 'wait' });
    expect(chooseVoice([], { excludeRemote: true })).toEqual({ mode: 'wait' });
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

  it('⑦ 윈도 크롬 예 → Microsoft David(U1 — v5와 같음), Google을 맨 앞에 두어도 David, excludeRemote → David', () => {
    expect(pickedName(chooseVoice(windowsChromeVoices()))).toBe(DAVID);
    const w = windowsChromeVoices();
    const googleFirst = [w[3]!, w[4]!, ...w.slice(0, 3)];
    expect(googleFirst[0]!.name).toBe('Google US English');
    expect(pickedName(chooseVoice(googleFirst))).toBe(DAVID);
    expect(pickedName(chooseVoice(windowsChromeVoices(), { excludeRemote: true }))).toBe(DAVID);
  });

  it('⑧ 엣지 예 → Aria, excludeRemote → David, Google US English를 더해도 Aria(N이 G·B보다 먼저)', () => {
    expect(pickedName(chooseVoice(edgeVoices()))).toBe(ARIA);
    expect(pickedName(chooseVoice(edgeVoices(), { excludeRemote: true }))).toBe(DAVID);
    expect(pickedName(chooseVoice([...edgeVoices(), remote('Google US English', 'en-US')]))).toBe(ARIA);
    expect(pickedName(chooseVoice([remote('Google US English', 'en-US'), ...edgeVoices()]))).toBe(ARIA);
  });

  it('⑨ Samantha·Samantha (Enhanced) → Samantha (Enhanced)', () => {
    expect(pickedName(chooseVoice([v('Samantha', 'en-US'), v('Samantha (Enhanced)', 'en-US')]))).toBe('Samantha (Enhanced)');
  });

  it('⑩ en-US는 Eddy·Flo뿐 + en-GB Daniel → Daniel, Daniel이 없으면 Eddy', () => {
    expect(pickedName(chooseVoice([v('Eddy', 'en-US'), v('Flo', 'en-US'), v('Daniel', 'en-GB')]))).toBe('Daniel');
    expect(pickedName(chooseVoice([v('Eddy', 'en-US'), v('Flo', 'en-US')]))).toBe('Eddy');
  });

  it('⑪ 대소문자·_/-가 섞인 lang(EN_us) 처리', () => {
    expect(pickedName(chooseVoice([v('Yuna', 'ko_KR'), v('Samantha', 'EN_us')]))).toBe('Samantha');
    expect(pickedName(chooseVoice([v('Daniel', 'en_GB'), v('Samantha', 'EN_us')]))).toBe('Samantha');
  });

  it('⑫ 이 맥 Chrome 목록 → Google US English(G), excludeRemote → Samantha', () => {
    const r = chooseVoice(macChromeVoices());
    expect(pickedName(r)).toBe('Google US English');
    expect(r.mode === 'voice' && r.grade).toBe('G');
    expect(pickedName(chooseVoice(macChromeVoices(), { excludeRemote: true }))).toBe('Samantha');
  });

  it('⑬ ⑫ + Samantha (Enhanced) local → Samantha (Enhanced)(A가 G보다 먼저)', () => {
    expect(pickedName(chooseVoice([...macChromeVoices(), v('Samantha (Enhanced)', 'en-US')]))).toBe('Samantha (Enhanced)');
  });

  it('⑭ ⑫에서 en-US를 모두 뺀 목록 → Google UK English Female(G가 Daniel(B)보다 먼저, Female·Male은 목록 순서)', () => {
    const list = macChromeVoices().filter((x) => x.lang !== 'en-US');
    expect(list.some((x) => x.name === 'Daniel')).toBe(true);
    expect(pickedName(chooseVoice(list))).toBe('Google UK English Female');
  });

  it('⑮ 기본이 한국어인 목록: 결과가 ko-* 목소리가 아님', () => {
    const yuna = v('유나', 'ko-KR', { default: true });
    expect(chooseVoice([yuna])).toEqual({ mode: 'skip' });
    expect(chooseVoice([yuna, v('Albert', 'en-US'), v('Zarvox', 'en-US')])).toEqual({ mode: 'skip' });
    expect(pickedName(chooseVoice([yuna, v('Samantha', 'en-US')]))).toBe('Samantha');
    // 어떤 목록에서도 ko-* 아님
    const lists = [macVoices(), macChromeVoices(), windowsChromeVoices(), edgeVoices(), [yuna, remote('Google 한국의', 'ko-KR')]];
    for (const l of lists) {
      for (const excludeRemote of [false, true]) {
        expect(pickedLang(chooseVoice(l, { excludeRemote })).toLowerCase().startsWith('ko')).toBe(false);
      }
    }
  });

  it('⑯ excludeRemote인데 영어가 모두 remote(Google US English·Google UK English Female만) → skip', () => {
    const list = [remote('Google US English', 'en-US'), remote('Google UK English Female', 'en-GB')];
    expect(chooseVoice(list, { excludeRemote: true })).toEqual({ mode: 'skip' });
    expect(pickedName(chooseVoice(list))).toBe('Google US English');
  });

  it('⑰ 등급·describeChoice', () => {
    expect(voiceGrade('Samantha (Enhanced)')).toBe('A');
    expect(voiceGrade(ARIA)).toBe('N');
    expect(voiceGrade('Google US English')).toBe('G');
    expect(voiceGrade('Google UK English Female')).toBe('G');
    expect(voiceGrade('Samantha')).toBe('B');
    expect(voiceGrade('English United States')).toBe('C');
    expect(voiceGrade('Grandpa (영어(미국))')).toBe('D');
    expect(describeChoice(chooseVoice(macChromeVoices()))).toBe('Google US English (en-US, remote, G) · voice');
    expect(describeChoice({ mode: 'wait' })).toBe('wait');
    expect(describeChoice({ mode: 'skip' })).toBe('skip');
  });

  it('⑱ 한국어 윈도 크롬 예(Microsoft Heami ko-KR default + Google remote) → Google US English, excludeRemote → skip', () => {
    const list = [
      v('Microsoft Heami - Korean (Korean)', 'ko-KR', { default: true }),
      remote('Google US English', 'en-US'),
      remote('Google UK English Female', 'en-GB'),
      remote('Google 한국의', 'ko-KR'),
    ];
    expect(pickedName(chooseVoice(list))).toBe('Google US English');
    expect(chooseVoice(list, { excludeRemote: true })).toEqual({ mode: 'skip' });
  });

  it('⑲ 윈도 판별은 목록으로만: ⑫ + Microsoft Zira en-US local → Zira, ⑫ 그대로 → Google US English', () => {
    // spec ⑲는 더하는 자리를 정하지 않았다 — ④-6(목록 순서)상 Zira가 Samantha(같은 B·local)보다 앞이어야 Zira.
    // 앞에 더하면 Zira, 뒤에 더하면 Samantha — 어느 쪽이든 B가 G(Google)보다 먼저인 것이 요점.
    expect(pickedName(chooseVoice([v(ZIRA, 'en-US'), ...macChromeVoices()]))).toBe(ZIRA);
    const appended = chooseVoice([...macChromeVoices(), v(ZIRA, 'en-US')]);
    expect(appended.mode === 'voice' && appended.grade).toBe('B');
    expect(pickedName(appended)).toBe('Samantha');
    expect(pickedName(chooseVoice(macChromeVoices()))).toBe('Google US English');
    // chooseVoice는 인자만 본다: 같은 인자면 같은 결과(UA·navigator와 상관없음)
    expect(chooseVoice.length).toBeLessThanOrEqual(2);
  });

  it('이름 정리(spec 5.9.1 예)·옛 장난용 이름', () => {
    expect(voiceNames('Eddy (영어(미국))').base).toBe('eddy');
    expect(voiceNames('Samantha (Enhanced)')).toEqual({ full: 'samantha (enhanced)', base: 'samantha' });
    expect(voiceNames('Microsoft Zira - English (United States)').base).toBe('zira');
    expect(chooseVoice([v('Princess', 'en-US'), v('Pipe Organ', 'en-US'), v('Deranged', 'en-US'), v('Hysterical', 'en-US')])).toEqual({
      mode: 'skip',
    });
  });

  it('고품질 안내(5.9.1 디버그): 애플 기기 안 보통 목소리(B·C·D, local)일 때만', () => {
    expect(needsQualityHint(chooseVoice(macVoices()))).toBe(true); // Samantha B local
    expect(needsQualityHint(chooseVoice([v('Eddy', 'en-US')]))).toBe(true); // D
    expect(needsQualityHint(chooseVoice([v('Samantha (Enhanced)', 'en-US')]))).toBe(false); // A
    expect(needsQualityHint(chooseVoice(macChromeVoices()))).toBe(false); // Google G
    expect(needsQualityHint(chooseVoice(windowsChromeVoices()))).toBe(false); // David — 애플 아님
    expect(needsQualityHint(chooseVoice(edgeVoices()))).toBe(false); // Aria N
    expect(needsQualityHint({ mode: 'skip' })).toBe(false);
    // Safari 식 voiceURI(com.apple…)면 이름이 낯설어도 애플로 봄
    expect(needsQualityHint(chooseVoice([v('Fiona', 'en-GB', { voiceURI: 'com.apple.voice.compact.en-scotland.Fiona' })]))).toBe(true);
    // 안드로이드 기기 목소리는 아님
    expect(needsQualityHint(chooseVoice([v('English United States', 'en-US')]))).toBe(false);
  });
});
