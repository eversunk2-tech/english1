// spec 5.9·5.9.1: 영어 읽어 주기(Web Speech API). 목소리는 chooseVoice로 고른다(장난용 Albert 등은 고르지 않음).
// 목록은 늦게 올 수 있어 voiceschanged마다 다시 고르고, 'voice'로 고른 것만 기억한다.
// 영어 목소리가 하나도 없거나 API가 없으면 조용히 건너뛴다.
import { chooseVoice, describeChoice, type VoiceChoice } from './voicePick.ts';

type SynthLike = Pick<SpeechSynthesis, 'getVoices' | 'speak' | 'cancel'> & {
  addEventListener?: (type: 'voiceschanged', cb: () => void) => void;
};

export const SPEECH_RATE = 0.9;
export const SPEECH_PITCH = 1;

export class Speech {
  enabled = true;
  private chosen: SpeechSynthesisVoice | null = null;
  private lastChoice: VoiceChoice = { mode: 'lang-only' };
  private readonly synthOverride: SynthLike | null;
  private readonly UtteranceCtor: typeof SpeechSynthesisUtterance | null;
  private listening = false;

  /** 테스트에서 가짜 speechSynthesis·Utterance를 넣을 수 있다 */
  constructor(opts: { synth?: SynthLike; Utterance?: typeof SpeechSynthesisUtterance } = {}) {
    this.synthOverride = opts.synth ?? null;
    this.UtteranceCtor =
      opts.Utterance ?? (typeof SpeechSynthesisUtterance !== 'undefined' ? SpeechSynthesisUtterance : null);
    this.listen();
  }

  private get synth(): SynthLike | null {
    if (this.synthOverride) return this.synthOverride;
    return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
  }

  /** voiceschanged마다 다시 고른다(spec 5.9.1) */
  private listen(): void {
    const s = this.synth;
    if (!s || this.listening || typeof s.addEventListener !== 'function') return;
    this.listening = true;
    try {
      s.addEventListener('voiceschanged', () => {
        this.chosen = null;
        this.pick();
      });
    } catch {
      // 무시
    }
  }

  /** 지금 목록으로 고른다. 'voice'일 때만 기억 */
  private pick(): VoiceChoice {
    const s = this.synth;
    if (!s) return (this.lastChoice = { mode: 'skip' });
    if (this.chosen) return this.lastChoice;
    let voices: SpeechSynthesisVoice[] = [];
    try {
      voices = s.getVoices();
    } catch {
      voices = [];
    }
    const c = chooseVoice(voices);
    this.lastChoice = c;
    this.chosen = c.mode === 'voice' ? c.voice : null;
    return c;
  }

  /** 디버그 표시용: 고른 목소리 name (lang, local/remote, 등급) · mode */
  describe(): string {
    return describeChoice(this.lastChoice);
  }

  get choice(): VoiceChoice {
    return this.lastChoice;
  }

  /** iPad Safari: 첫 발화는 사용자 동작 안에서 — 시작 버튼을 누를 때 빈 발화를 한 번 한다. 목록 적재도 재촉 */
  prime(): void {
    const s = this.synth;
    if (!s || !this.enabled || !this.UtteranceCtor) return;
    try {
      s.getVoices();
      this.pick();
      const u = new this.UtteranceCtor(' ');
      u.volume = 0;
      s.speak(u);
    } catch {
      // 무시
    }
  }

  say(text: string): void {
    const s = this.synth;
    if (!s || !this.enabled || !this.UtteranceCtor) return;
    const c = this.pick();
    if (c.mode === 'skip') return; // 영어 목소리가 하나도 없음
    try {
      s.cancel();
      const u = new this.UtteranceCtor(text);
      if (c.mode === 'voice') {
        u.voice = c.voice;
        u.lang = c.voice.lang || 'en-US';
      } else {
        u.lang = 'en-US'; // 목록이 아직 없거나 장난용뿐: 브라우저가 기본 영어 목소리를 고르게
      }
      u.rate = SPEECH_RATE;
      u.pitch = SPEECH_PITCH;
      s.speak(u);
    } catch {
      // 무시
    }
  }

  cancel(): void {
    try {
      this.synth?.cancel();
    } catch {
      // 무시
    }
  }
}
