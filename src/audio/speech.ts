// spec 5.9·5.9.1·5.9.2(v7): 영어 읽어 주기(Web Speech API). 목소리는 chooseVoice로 고른다.
// v7: 목소리를 정하지 않은 발화(lang-only)는 만들지 않는다 — 목록이 비어 있으면 최대 1초 기다렸다 말하고, 끝내 없으면 건너뛴다.
// 인터넷 목소리(localService false)는 1.5초 안에 onstart가 없거나 시작 전 오류면 실패로 보고, 이 페이지에서 인터넷 목소리를 끈 뒤
// 같은 문장을 기기 안 목소리로 한 번 다시 말한다. 새 say()·cancel()이 오면 앞의 기다림·감시·다시 말하기는 모두 무효.
// 타이머는 globalThis.setTimeout(게임 시계와 상관없음 — 단위 테스트는 vi.useFakeTimers()).
import { SPEECH } from '../config.ts';
import { chooseVoice, describeChoice, needsQualityHint, type VoiceChoice } from './voicePick.ts';

type SynthLike = Pick<SpeechSynthesis, 'getVoices' | 'speak' | 'cancel'> & {
  addEventListener?: (type: 'voiceschanged', cb: () => void) => void;
};

export const SPEECH_RATE = SPEECH.RATE;
export const SPEECH_PITCH = SPEECH.PITCH;

/** 실패가 아닌 오류: 우리 cancel()이나 다음 say()가 끊은 것 */
const NOT_FAILURE_ERRORS: ReadonlySet<string> = new Set(['interrupted', 'canceled']);

type Timer = ReturnType<typeof setTimeout>;

export class Speech {
  enabled = true;
  /** 인터넷 목소리를 이 페이지에서 끔(5.9.2 실패 뒤). 새로고침하면 다시 시도 */
  private remoteOff = false;
  /** say()·cancel()마다 하나씩 올린다 — 마지막 것만 산다 */
  private token = 0;
  private lastChoice: VoiceChoice = { mode: 'wait' };
  /** wait 중인 문장(하나만) */
  private pending: { token: number; text: string } | null = null;
  private waitTimer: Timer | null = null;
  private watchTimer: Timer | null = null;
  /** 말하는 중인 발화 — Chrome이 onstart/onend를 놓치지 않게 참조를 잡아 둔다 */
  private utter: SpeechSynthesisUtterance | null = null;
  private readonly synthOverride: SynthLike | null;
  private readonly UtteranceCtor: typeof SpeechSynthesisUtterance | null;

  /** 테스트에서 가짜 speechSynthesis·Utterance를 넣을 수 있다 */
  constructor(opts: { synth?: SynthLike; Utterance?: typeof SpeechSynthesisUtterance } = {}) {
    this.synthOverride = opts.synth ?? null;
    this.UtteranceCtor =
      opts.Utterance ?? (typeof SpeechSynthesisUtterance !== 'undefined' ? SpeechSynthesisUtterance : null);
    this.listen();
    // 목록 미리 받기(5.9.2): 페이지가 열릴 때 getVoices()를 한 번 불러 적재를 재촉
    this.choose();
  }

  private get synth(): SynthLike | null {
    if (this.synthOverride) return this.synthOverride;
    return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
  }

  private listen(): void {
    const s = this.synth;
    if (!s || typeof s.addEventListener !== 'function') return;
    try {
      s.addEventListener('voiceschanged', () => this.onVoicesChanged());
    } catch {
      // 무시
    }
  }

  /** 지금 목록으로 고른다(인터넷 목소리를 껐으면 빼고). 결과를 디버그용으로 기억 */
  private choose(): VoiceChoice {
    const s = this.synth;
    if (!s) return (this.lastChoice = { mode: 'skip' });
    let voices: SpeechSynthesisVoice[] = [];
    try {
      voices = s.getVoices() ?? [];
    } catch {
      voices = [];
    }
    return (this.lastChoice = chooseVoice(voices, { excludeRemote: this.remoteOff }));
  }

  /** 목록이 오거나 바뀜(고품질 목소리 내려받기 등) → 다시 고르고, 기다리던 문장이 있으면 말한다 */
  private onVoicesChanged(): void {
    const c = this.choose();
    const p = this.pending;
    if (!p || p.token !== this.token) return;
    if (c.mode === 'wait') return; // 아직 빈 목록 — 계속 기다림
    this.clearWait();
    if (c.mode === 'voice' && this.enabled) this.speakWith(p.token, p.text, c);
  }

  /** 디버그 표시용: name (lang, local/remote, 등급) · voice | wait | skip [· 인터넷 목소리 끔] */
  describe(): string {
    return describeChoice(this.lastChoice) + (this.remoteOff ? ' · 인터넷 목소리 끔' : '');
  }

  get choice(): VoiceChoice {
    return this.lastChoice;
  }

  /** 디버그 화면 고품질 목소리 안내 줄을 보일지(5.9.1 디버그·5.9.3) */
  qualityHint(): boolean {
    return needsQualityHint(this.lastChoice);
  }

  /** iPad Safari: 첫 발화는 사용자 동작 안에서 — 시작 버튼을 누를 때 소리 0인 빈 발화(목소리 지정 없음, 감시 없음). 목록 적재도 재촉 */
  prime(): void {
    const s = this.synth;
    if (!s || !this.enabled || !this.UtteranceCtor) return;
    try {
      this.choose();
      const u = new this.UtteranceCtor(' ');
      u.volume = 0;
      s.speak(u);
    } catch {
      // 무시
    }
  }

  say(text: string): void {
    const t = ++this.token;
    this.clearWait();
    this.clearWatch();
    const s = this.synth;
    if (!s || !this.enabled || !this.UtteranceCtor) return;
    const c = this.choose();
    if (c.mode === 'voice') {
      this.speakWith(t, text, c);
    } else if (c.mode === 'wait') {
      // 목록이 아직 없음: 이 문장을 기다리는 문장으로 두고 최대 VOICE_WAIT_MS 기다린다
      this.pending = { token: t, text };
      this.waitTimer = globalThis.setTimeout(() => {
        this.waitTimer = null;
        if (!this.pending || this.pending.token !== t) return;
        this.pending = null;
        const again = this.choose();
        if (again.mode === 'voice' && this.enabled && this.token === t) {
          this.speakWith(t, text, again); // voiceschanged 없이 목록이 채워진 경우
        } else if (again.mode === 'wait') {
          this.lastChoice = { mode: 'skip' }; // 끝내 목록 없음 → 이 문장은 건너뜀
        }
      }, SPEECH.VOICE_WAIT_MS);
    }
    // skip → 말하지 않는다
  }

  /** 고른 목소리로 말한다. 인터넷 목소리면 시작을 감시한다 */
  private speakWith(t: number, text: string, c: Extract<VoiceChoice, { mode: 'voice' }>): void {
    const s = this.synth;
    if (!s || !this.UtteranceCtor) return;
    try {
      this.utter = null; // cancel()이 낼 수 있는 앞 발화의 오류는 무시되게
      s.cancel();
      const u = new this.UtteranceCtor(text);
      u.voice = c.voice as SpeechSynthesisVoice;
      u.lang = c.voice.lang || 'en-US';
      u.rate = SPEECH.RATE;
      u.pitch = SPEECH.PITCH;
      this.utter = u;
      if (c.voice.localService === false) this.watch(t, text, u);
      s.speak(u);
    } catch {
      // 무시
    }
  }

  /** 인터넷 목소리 감시(5.9.2) */
  private watch(t: number, text: string, u: SpeechSynthesisUtterance): void {
    let started = false;
    const live = (): boolean => this.utter === u && this.token === t;
    u.onstart = () => {
      started = true;
      if (live()) this.clearWatch();
    };
    u.onend = () => {
      // onstart 없이 onend만(사용자 동작 전 자동 재생 막힘 등)은 실패가 아님 — 감시만 끝
      if (live()) this.clearWatch();
    };
    u.onerror = (e: SpeechSynthesisErrorEvent) => {
      if (!live()) return;
      const err = String((e as { error?: string } | undefined)?.error ?? '');
      if (NOT_FAILURE_ERRORS.has(err)) {
        this.clearWatch();
        return;
      }
      if (started) {
        // 말하다 끊김: 다시 말하지 않고, 다음 문장부터 기기 안 목소리
        this.clearWatch();
        this.remoteOff = true;
        this.choose();
        return;
      }
      this.fail(t, text);
    };
    this.watchTimer = globalThis.setTimeout(() => {
      this.watchTimer = null;
      if (!started && live()) this.fail(t, text);
    }, SPEECH.REMOTE_START_TIMEOUT_MS);
  }

  /** 인터넷 목소리 실패: 끄고, 같은 문장을 기기 안 목소리로 한 번 다시 */
  private fail(t: number, text: string): void {
    this.clearWatch();
    this.remoteOff = true;
    this.utter = null;
    try {
      this.synth?.cancel();
    } catch {
      // 무시
    }
    const c = this.choose();
    if (c.mode === 'voice' && this.enabled && this.token === t) this.speakWith(t, text, c);
  }

  private clearWait(): void {
    if (this.waitTimer !== null) globalThis.clearTimeout(this.waitTimer);
    this.waitTimer = null;
    this.pending = null;
  }

  private clearWatch(): void {
    if (this.watchTimer !== null) globalThis.clearTimeout(this.watchTimer);
    this.watchTimer = null;
  }

  /** 일시정지·처음으로·결과: 기다리는 문장·감시 타이머를 지우고 멈춘다 */
  cancel(): void {
    this.token++;
    this.clearWait();
    this.clearWatch();
    this.utter = null;
    try {
      this.synth?.cancel();
    } catch {
      // 무시
    }
  }
}
