import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SPEECH_PITCH, SPEECH_RATE, Speech } from '../../src/audio/speech.ts';
import { SPEECH } from '../../src/config.ts';
import { macChromeVoices, macVoices, v, type FakeVoice } from '../helpers/voices.ts';

// spec 5.9.2·12.1 speech.test(v7): 가짜 speechSynthesis(목록 바꾸기 + voiceschanged), 발화의 onstart/onend/onerror는 테스트가 부른다.
class FakeUtterance {
  text: string;
  voice: FakeVoice | null = null;
  lang = '';
  rate = 1;
  pitch = 1;
  volume = 1;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

class FakeSynth {
  voices: FakeVoice[] = [];
  spoken: FakeUtterance[] = [];
  cancels = 0;
  private listeners: (() => void)[] = [];
  getVoices(): FakeVoice[] {
    return this.voices;
  }
  speak(u: FakeUtterance): void {
    this.spoken.push(u);
  }
  cancel(): void {
    this.cancels++;
  }
  addEventListener(_t: 'voiceschanged', cb: () => void): void {
    this.listeners.push(cb);
  }
  setVoices(list: FakeVoice[]): void {
    this.voices = list;
    for (const l of this.listeners) l();
  }
  /** 소리가 있는(빈 글자가 아닌) 발화 */
  audible(): FakeUtterance[] {
    return this.spoken.filter((u) => u.text.trim() !== '');
  }
  last(): FakeUtterance {
    return this.spoken[this.spoken.length - 1]!;
  }
}

function make(voices: FakeVoice[] = []): { synth: FakeSynth; speech: Speech } {
  const synth = new FakeSynth();
  synth.voices = voices;
  const speech = new Speech({
    synth: synth as never,
    Utterance: FakeUtterance as unknown as typeof SpeechSynthesisUtterance,
  });
  return { synth, speech };
}

/** 어떤 경우에도: 소리가 있는 발화 중 voice가 null이거나 ko-*인 것 0, Albert 0 */
function expectNoBadUtterance(synth: FakeSynth): void {
  for (const u of synth.audible()) {
    expect(u.voice, `"${u.text}"`).not.toBe(null);
    expect(u.voice!.lang.toLowerCase().startsWith('ko'), `"${u.text}" ${u.voice!.name}`).toBe(false);
    expect(u.voice!.name).not.toBe('Albert');
  }
}

const GOOGLE = 'Google US English';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('Speech v7 (spec 5.9.2, 12.1 speech ①~⑮)', () => {
  it('값: SPEECH(5.9.2)와 다시 내보낸 SPEECH_RATE·SPEECH_PITCH', () => {
    expect(SPEECH.RATE).toBe(0.9);
    expect(SPEECH.PITCH).toBe(1);
    expect(SPEECH.VOICE_WAIT_MS).toBe(1000);
    expect(SPEECH.REMOTE_START_TIMEOUT_MS).toBe(1500);
    expect(SPEECH_RATE).toBe(0.9);
    expect(SPEECH_PITCH).toBe(1);
  });

  it('목록 미리 받기: 만들 때 getVoices()를 부른다', () => {
    const synth = new FakeSynth();
    const spy = vi.spyOn(synth, 'getVoices');
    new Speech({ synth: synth as never, Utterance: FakeUtterance as unknown as typeof SpeechSynthesisUtterance });
    expect(spy).toHaveBeenCalled();
  });

  it('① 빈 목록에서 say() → 바로 말하지 않음, 300ms 뒤 voiceschanged(맥 Chrome 목록) → 그 문장을 Google US English로', () => {
    const { synth, speech } = make();
    speech.say('A long yellow fruit.');
    expect(synth.spoken.length).toBe(0);
    expect(speech.describe()).toBe('wait');
    vi.advanceTimersByTime(300);
    synth.setVoices(macChromeVoices());
    expect(synth.spoken.length).toBe(1);
    expect(synth.spoken[0]!.text).toBe('A long yellow fruit.');
    expect(synth.spoken[0]!.voice?.name).toBe(GOOGLE);
    expect(synth.spoken[0]!.lang).toBe('en-US');
    // 기다림 타이머가 남아 다시 말하지 않음
    synth.spoken[0]!.onstart?.();
    vi.advanceTimersByTime(3000);
    expect(synth.spoken.length).toBe(1);
    expectNoBadUtterance(synth);
  });

  it('② 빈 목록에서 1000ms 동안 목록이 안 옴 → 아무것도 말하지 않음(describe = skip), 그 뒤 목록이 오고 say() → 말함', () => {
    const { synth, speech } = make();
    speech.say('one');
    vi.advanceTimersByTime(999);
    expect(synth.spoken.length).toBe(0);
    vi.advanceTimersByTime(1);
    expect(synth.spoken.length).toBe(0);
    expect(speech.describe()).toBe('skip');
    synth.setVoices(macVoices());
    expect(synth.spoken.length).toBe(0); // 지난 문장은 말하지 않음
    speech.say('two');
    expect(synth.spoken.map((u) => u.text)).toEqual(['two']);
    expect(synth.spoken[0]!.voice?.name).toBe('Samantha');
    expectNoBadUtterance(synth);
  });

  it('③ 기다리는 중 새 say(b) → b만 말함', () => {
    const { synth, speech } = make();
    speech.say('a');
    vi.advanceTimersByTime(400);
    speech.say('b');
    vi.advanceTimersByTime(400);
    synth.setVoices(macVoices());
    vi.advanceTimersByTime(2000);
    expect(synth.spoken.map((u) => u.text)).toEqual(['b']);
  });

  it('④ 기다리는 중 cancel() → 목록이 와도 말하지 않음', () => {
    const { synth, speech } = make();
    speech.say('a');
    vi.advanceTimersByTime(200);
    speech.cancel();
    synth.setVoices(macVoices());
    vi.advanceTimersByTime(2000);
    expect(synth.spoken.length).toBe(0);
  });

  it('⑤ remote가 1500ms 안에 시작 안 함 → cancel() 뒤 같은 문장을 Samantha로, 다음 say()는 바로 Samantha, describe 끝 "인터넷 목소리 끔"', () => {
    const { synth, speech } = make(macChromeVoices());
    speech.say('clue');
    expect(synth.last().voice?.name).toBe(GOOGLE);
    expect(speech.describe()).toBe('Google US English (en-US, remote, G) · voice');
    vi.advanceTimersByTime(1499);
    expect(synth.spoken.length).toBe(1);
    const cancelsBefore = synth.cancels;
    vi.advanceTimersByTime(1);
    expect(synth.cancels).toBeGreaterThan(cancelsBefore);
    expect(synth.spoken.length).toBe(2);
    expect(synth.spoken[1]!.text).toBe('clue');
    expect(synth.spoken[1]!.voice?.name).toBe('Samantha');
    expect(speech.describe()).toBe('Samantha (en-US, local, B) · voice · 인터넷 목소리 끔');
    speech.say('next');
    expect(synth.spoken.length).toBe(3);
    expect(synth.spoken[2]!.voice?.name).toBe('Samantha');
    expect(speech.describe().endsWith('· 인터넷 목소리 끔')).toBe(true);
    expectNoBadUtterance(synth);
  });

  it('⑥ remote가 1499ms에 onstart → 다시 말하지 않음, 인터넷 목소리 그대로', () => {
    const { synth, speech } = make(macChromeVoices());
    speech.say('clue');
    vi.advanceTimersByTime(1499);
    synth.last().onstart?.();
    vi.advanceTimersByTime(5000);
    expect(synth.spoken.length).toBe(1);
    speech.say('next');
    expect(synth.last().voice?.name).toBe(GOOGLE);
    expect(speech.describe()).toBe('Google US English (en-US, remote, G) · voice');
  });

  it('⑦ remote onerror(network)(시작 전) → 타이머를 기다리지 않고 바로 Samantha로 다시', () => {
    const { synth, speech } = make(macChromeVoices());
    speech.say('clue');
    vi.advanceTimersByTime(100);
    synth.last().onerror?.({ error: 'network' });
    expect(synth.spoken.length).toBe(2);
    expect(synth.spoken[1]!.text).toBe('clue');
    expect(synth.spoken[1]!.voice?.name).toBe('Samantha');
    vi.advanceTimersByTime(5000);
    expect(synth.spoken.length).toBe(2);
    expect(speech.describe().endsWith('· 인터넷 목소리 끔')).toBe(true);
  });

  for (const err of ['interrupted', 'canceled']) {
    it(`⑧ onerror(${err}) → 다시 말하지 않고 인터넷 목소리 그대로`, () => {
      const { synth, speech } = make(macChromeVoices());
      speech.say('clue');
      synth.last().onerror?.({ error: err });
      vi.advanceTimersByTime(5000);
      expect(synth.spoken.length).toBe(1);
      speech.say('next');
      expect(synth.last().voice?.name).toBe(GOOGLE);
      expect(speech.describe()).not.toContain('인터넷 목소리 끔');
    });
  }

  it('⑨ onstart 없이 onend(사용자 동작 전 흉내) → 다시 말하지 않고 인터넷 목소리 그대로', () => {
    const { synth, speech } = make(macChromeVoices());
    speech.say('clue');
    synth.last().onend?.();
    vi.advanceTimersByTime(5000);
    expect(synth.spoken.length).toBe(1);
    speech.say('next');
    expect(synth.last().voice?.name).toBe(GOOGLE);
    expect(speech.describe()).not.toContain('인터넷 목소리 끔');
  });

  it('⑩ onstart 뒤 onerror(network) → 다시 말하지 않음, 다음 say()부터 Samantha', () => {
    const { synth, speech } = make(macChromeVoices());
    speech.say('clue');
    synth.last().onstart?.();
    synth.last().onerror?.({ error: 'network' });
    vi.advanceTimersByTime(5000);
    expect(synth.spoken.length).toBe(1);
    expect(speech.describe().endsWith('· 인터넷 목소리 끔')).toBe(true);
    speech.say('next');
    expect(synth.last().voice?.name).toBe('Samantha');
  });

  it('⑪ remote 감시 중 새 say(b) → 앞 문장의 1500ms 타이머가 와도 아무것도 다시 말하지 않음', () => {
    const { synth, speech } = make(macChromeVoices());
    speech.say('a');
    vi.advanceTimersByTime(1000);
    speech.say('b');
    synth.last().onstart?.(); // b는 제때 시작
    vi.advanceTimersByTime(600); // a의 1500ms가 지남
    vi.advanceTimersByTime(5000);
    expect(synth.spoken.map((u) => `${u.text}:${u.voice?.name}`)).toEqual([`a:${GOOGLE}`, `b:${GOOGLE}`]);
    expect(speech.describe()).not.toContain('인터넷 목소리 끔');
  });

  it('⑫ 장난용만 → 말하지 않음, 한국어만 → 말하지 않음(voice null·ko-* 발화 0 — prime()의 소리 0 빈 발화만 예외)', () => {
    const { synth, speech } = make([v('유나', 'ko-KR', { default: true }), v('Albert', 'en-US'), v('Zarvox', 'en-US')]);
    speech.prime();
    speech.say('x');
    vi.advanceTimersByTime(2000);
    expect(synth.audible().length).toBe(0);
    expect(speech.describe()).toBe('skip');
    synth.setVoices([v('유나', 'ko-KR', { default: true }), v('Kyoko', 'ja-JP')]);
    speech.say('y');
    vi.advanceTimersByTime(2000);
    expect(synth.audible().length).toBe(0);
    // prime()의 빈 발화: 소리 0, 목소리 지정 없음
    const primed = synth.spoken.filter((u) => u.text.trim() === '');
    expect(primed.length).toBe(1);
    expect(primed[0]!.volume).toBe(0);
    expectNoBadUtterance(synth);
  });

  it('⑬ local 목소리(Samantha)는 감시 타이머를 걸지 않음', () => {
    const { synth, speech } = make(macVoices());
    speech.say('clue');
    expect(synth.last().voice?.name).toBe('Samantha');
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(5000);
    expect(synth.spoken.length).toBe(1);
  });

  it('⑭ rate 0.9·pitch 1, 소리 끔이면 말하지 않음', () => {
    const { synth, speech } = make(macChromeVoices());
    speech.say('a');
    expect(synth.last().rate).toBe(0.9);
    expect(synth.last().pitch).toBe(1);
    speech.enabled = false;
    speech.say('b');
    vi.advanceTimersByTime(5000);
    expect(synth.spoken.map((u) => u.text)).toEqual(['a']);
    // 기다리는 중 소리를 끄면 목록이 와도 말하지 않음
    const m = make();
    m.speech.say('c');
    m.speech.enabled = false;
    m.synth.setVoices(macVoices());
    vi.advanceTimersByTime(2000);
    expect(m.synth.spoken.length).toBe(0);
  });

  it('⑮ 고품질 목소리를 내려받아 목록이 바뀜 → 다시 고름', () => {
    const { synth, speech } = make(macVoices());
    speech.say('one');
    expect(synth.last().voice?.name).toBe('Samantha');
    synth.setVoices([...macVoices(), v('Samantha (Enhanced)', 'en-US')]);
    expect(speech.describe()).toBe('Samantha (Enhanced) (en-US, local, A) · voice');
    speech.say('two');
    expect(synth.last().voice?.name).toBe('Samantha (Enhanced)');
    expect(synth.spoken.some((u) => u.voice?.name === 'Albert')).toBe(false);
  });

  it('인터넷 목소리를 끈 뒤 기기 안 영어 목소리가 없으면 다시 말하지 않음(skip)', () => {
    const { synth, speech } = make([v('유나', 'ko-KR', { default: true }), { ...v(GOOGLE, 'en-US'), localService: false }]);
    speech.say('clue');
    vi.advanceTimersByTime(1500);
    expect(synth.spoken.length).toBe(1);
    expect(speech.describe()).toBe('skip · 인터넷 목소리 끔');
    expectNoBadUtterance(synth);
  });

  it('cancel()이 감시 타이머를 지운다(일시정지 뒤 다시 말하지 않음)', () => {
    const { synth, speech } = make(macChromeVoices());
    speech.say('clue');
    speech.cancel();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(5000);
    expect(synth.spoken.length).toBe(1);
    expect(speech.describe()).not.toContain('인터넷 목소리 끔');
  });
});
