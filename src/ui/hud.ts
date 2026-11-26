// 설명 띠·점수·문제 번호·반응 문구(spec 6.2 놀이 화면).
import { bandHeight } from '../game/layout.ts';
import { h, ICONS, svg } from './dom.ts';
import { S } from './strings.ts';

export const CLUE_LINE_HEIGHT = 1.2;
const CLUE_MIN_PX = 14;

/** 설명 글자 크기: 가로 화면 clamp(22px, 3.2vw, 40px) */
export function clueBaseFont(W: number): number {
  return Math.max(22, Math.min(0.032 * W, 40));
}

export class Hud {
  readonly root: HTMLElement;
  private readonly band: HTMLElement;
  private readonly clue: HTMLElement;
  private readonly qno: HTMLElement;
  private readonly score: HTMLElement;
  private readonly feedback: HTMLElement;
  private readonly combo: HTMLElement;
  private readonly reveal: HTMLElement;
  private readonly hint: HTMLElement;
  private feedbackTimer = 0;
  private comboTimer = 0;
  private W = 0;
  private H = 0;

  constructor(root: HTMLElement, onPause: () => void) {
    this.root = root;
    this.clue = h('p', { class: 'clue', id: 'clue', lang: 'en' });
    this.qno = h('div', { class: 'qno', id: 'qno' });
    this.score = h('div', { class: 'score', id: 'score' });
    const pauseBtn = h('button', { class: 'pause-btn', id: 'pause-btn', type: 'button', 'aria-label': S.pause, onclick: () => onPause() }, svg(ICONS.pause));
    this.band = h(
      'div',
      { class: 'band' },
      h('div', { class: 'clue-wrap' }, this.clue),
      h('div', { class: 'band-side' }, this.qno, this.score, pauseBtn),
    );
    this.feedback = h('div', { class: 'feedback', id: 'feedback', lang: 'en', 'aria-live': 'polite' });
    this.combo = h('div', { class: 'combo', id: 'combo', lang: 'en' });
    this.reveal = h('div', { class: 'reveal', id: 'reveal', hidden: true });
    this.hint = h('div', { class: 'hint', id: 'hint' });
    root.replaceChildren(this.band, this.feedback, this.combo, this.reveal, this.hint);
  }

  show(on: boolean): void {
    this.root.hidden = !on;
  }

  resize(W: number, H: number): void {
    this.W = W;
    this.H = H;
    this.band.style.height = `${bandHeight(H)}px`;
    this.fitClue();
  }

  setClue(text: string): void {
    this.clue.textContent = text;
    this.fitClue();
  }

  /** 두 줄까지. 넘치면 글자를 줄인다. 줄 수를 돌려준다. */
  fitClue(): number {
    if (this.W === 0) return 0;
    let px = Math.round(clueBaseFont(this.W) * 10) / 10;
    const maxH = bandHeight(this.H) - 12;
    this.clue.style.fontSize = `${px}px`;
    while (px > CLUE_MIN_PX && (this.clueLines() > 2 || this.clue.scrollHeight > maxH + 1)) {
      px -= 1;
      this.clue.style.fontSize = `${px}px`;
    }
    return this.clueLines();
  }

  clueLines(): number {
    const px = parseFloat(this.clue.style.fontSize || '22');
    const lh = px * CLUE_LINE_HEIGHT;
    return Math.round(this.clue.getBoundingClientRect().height / lh);
  }

  clueInfo(): { lines: number; fontPx: number; height: number; bandH: number } {
    return {
      lines: this.clueLines(),
      fontPx: parseFloat(this.clue.style.fontSize || '0'),
      height: this.clue.getBoundingClientRect().height,
      bandH: this.band.getBoundingClientRect().height,
    };
  }

  setProgress(n: number, total: number, score: number): void {
    this.qno.textContent = S.questionNo(n, total);
    this.score.replaceChildren(h('span', { lang: 'en' }, S.score), ' ', h('b', {}, String(score)));
  }

  flash(text: string, kind: 'good' | 'bad', ms = 900): void {
    this.feedback.textContent = text;
    this.feedback.className = `feedback show ${kind}`;
    window.clearTimeout(this.feedbackTimer);
    this.feedbackTimer = window.setTimeout(() => {
      this.feedback.className = 'feedback';
    }, ms);
  }

  showCombo(text: string): void {
    this.combo.textContent = text;
    this.combo.className = 'combo show';
    window.clearTimeout(this.comboTimer);
    this.comboTimer = window.setTimeout(() => {
      this.combo.className = 'combo';
    }, 1200);
  }

  showReveal(word: string, ko: string): void {
    this.reveal.replaceChildren(
      h('div', { class: 'reveal-line', lang: 'en' }, `${S.answerIs} `, h('b', {}, word)),
      h('div', { class: 'reveal-ko' }, ko),
    );
    this.reveal.hidden = false;
  }

  hideReveal(): void {
    this.reveal.hidden = true;
  }

  setHint(text: string | null): void {
    this.hint.textContent = text ?? '';
    this.hint.classList.toggle('show', !!text);
  }

  clearTransient(): void {
    this.feedback.className = 'feedback';
    this.combo.className = 'combo';
    this.hideReveal();
    this.setHint(null);
  }
}
