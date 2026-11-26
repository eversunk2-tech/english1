import { describe, expect, it } from 'vitest';
import { Speech } from '../../src/audio/speech.ts';
import { macVoices, v, type FakeVoice } from '../helpers/voices.ts';

class FakeUtterance {
  text: string;
  voice: FakeVoice | null = null;
  lang = '';
  rate = 1;
  pitch = 1;
  volume = 1;
  constructor(text: string) {
    this.text = text;
  }
}

class FakeSynth {
  voices: FakeVoice[] = [];
  spoken: FakeUtterance[] = [];
  private listeners: (() => void)[] = [];
  getVoices(): FakeVoice[] {
    return this.voices;
  }
  speak(u: FakeUtterance): void {
    this.spoken.push(u);
  }
  cancel(): void {}
  addEventListener(_t: 'voiceschanged', cb: () => void): void {
    this.listeners.push(cb);
  }
  setVoices(list: FakeVoice[]): void {
    this.voices = list;
    for (const l of this.listeners) l();
  }
}

function make(): { synth: FakeSynth; speech: Speech } {
  const synth = new FakeSynth();
  const speech = new Speech({
    synth: synth as never,
    Utterance: FakeUtterance as unknown as typeof SpeechSynthesisUtterance,
  });
  return { synth, speech };
}

describe('Speech (spec 5.9.1, 12.1 speech.test)', () => {
  it('빈 목록 → 첫 say()는 lang-only(en-US)로 말한다(건너뛰지 않음), rate 0.9·pitch 1', () => {
    const { synth, speech } = make();
    speech.say('A long yellow fruit.');
    expect(synth.spoken.length).toBe(1);
    const u = synth.spoken[0]!;
    expect(u.voice).toBe(null);
    expect(u.lang).toBe('en-US');
    expect(u.rate).toBe(0.9);
    expect(u.pitch).toBe(1);
    expect(speech.describe()).toBe('lang-only');
  });

  it('voiceschanged 뒤 목록이 오면 Samantha, 목록이 다시 바뀌면 다시 고른다', () => {
    const { synth, speech } = make();
    speech.say('one');
    synth.setVoices(macVoices());
    expect(speech.describe()).toContain('Samantha');
    speech.say('two');
    expect(synth.spoken[1]!.voice?.name).toBe('Samantha');
    expect(synth.spoken[1]!.lang).toBe('en-US');
    expect(synth.spoken.some((u) => u.voice?.name === 'Albert')).toBe(false);
    // 목록이 바뀜(고품질 목소리를 내려받음)
    synth.setVoices([...macVoices(), v('Samantha (Enhanced)', 'en-US')]);
    speech.say('three');
    expect(synth.spoken[2]!.voice?.name).toBe('Samantha (Enhanced)');
    expect(speech.describe()).toBe('Samantha (Enhanced) (en-US, local, A) · voice');
  });

  it('장난용만 → lang-only로 말함, 영어 목소리가 없으면 말하지 않음(skip)', () => {
    const { synth, speech } = make();
    synth.setVoices([v('Albert', 'en-US'), v('Zarvox', 'en-US')]);
    speech.say('x');
    expect(synth.spoken[0]!.voice).toBe(null);
    expect(synth.spoken[0]!.lang).toBe('en-US');
    synth.setVoices([v('Yuna', 'ko-KR')]);
    speech.say('y');
    expect(synth.spoken.length).toBe(1);
    expect(speech.describe()).toBe('skip');
  });

  it('소리 끔이면 말하지 않는다', () => {
    const { synth, speech } = make();
    synth.setVoices(macVoices());
    speech.enabled = false;
    speech.say('z');
    expect(synth.spoken.length).toBe(0);
  });
});
