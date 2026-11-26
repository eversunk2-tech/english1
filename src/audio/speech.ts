// spec 5.9: 영어 읽어 주기(Web Speech API). 영어 목소리가 없거나 API가 없으면 조용히 건너뛴다.

export class Speech {
  enabled = true;
  private voice: SpeechSynthesisVoice | null = null;

  private get synth(): SpeechSynthesis | null {
    return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
  }

  private pickVoice(): SpeechSynthesisVoice | null {
    const s = this.synth;
    if (!s) return null;
    if (this.voice) return this.voice;
    let voices: SpeechSynthesisVoice[] = [];
    try {
      voices = s.getVoices();
    } catch {
      return null;
    }
    this.voice =
      voices.find((v) => v.lang === 'en-US') ??
      voices.find((v) => v.lang.replace('_', '-').toLowerCase() === 'en-us') ??
      voices.find((v) => v.lang.toLowerCase().startsWith('en')) ??
      null;
    return this.voice;
  }

  /** iPad Safari: 첫 발화는 사용자 동작 안에서 — 시작 버튼을 누를 때 빈 발화를 한 번 한다 */
  prime(): void {
    const s = this.synth;
    if (!s || !this.enabled) return;
    try {
      s.getVoices();
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      s.speak(u);
    } catch {
      // 무시
    }
  }

  say(text: string): void {
    const s = this.synth;
    if (!s || !this.enabled) return;
    const voice = this.pickVoice();
    if (!voice) return; // 영어 목소리가 없으면 건너뜀
    try {
      s.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.voice = voice;
      u.lang = voice.lang || 'en-US';
      u.rate = 0.9;
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
