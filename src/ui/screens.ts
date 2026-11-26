// 시작·준비·손 확인·카운트다운·일시정지·결과·오류 DOM 화면(spec 6.2).
import type { BandChoice } from '../game/types.ts';
import type { QuestionResult } from '../game/session.ts';
import { h, ICONS, keepWords, svg } from './dom.ts';
import { errorMessage, type AppError } from '../camera/errors.ts';
import { MARKS, S } from './strings.ts';

export interface StartHandlers {
  band: BandChoice;
  sound: boolean;
  onBand: (b: BandChoice) => void;
  onSound: (on: boolean) => void;
  onCamera: () => void;
  onTouch: () => void;
}

export class Screens {
  readonly root: HTMLElement;
  constructor(root: HTMLElement) {
    this.root = root;
  }

  clear(): void {
    this.root.replaceChildren();
    this.root.className = '';
  }

  private set(name: string, ...children: HTMLElement[]): HTMLElement {
    const panel = h('section', { class: `screen screen-${name}`, 'data-screen': name }, ...children);
    this.root.replaceChildren(panel);
    this.root.className = `has-${name}`;
    return panel;
  }

  start(o: StartHandlers): void {
    const bandBtn = (b: BandChoice, label: string): HTMLButtonElement =>
      h('button', {
        type: 'button',
        class: 'seg',
        'data-band': b,
        'aria-pressed': String(o.band === b),
        onclick: () => {
          o.onBand(b);
          for (const el of this.root.querySelectorAll<HTMLButtonElement>('[data-band]')) {
            el.setAttribute('aria-pressed', String(el.dataset.band === b));
          }
        },
      }, label);
    const soundBtn = (on: boolean, label: string): HTMLButtonElement =>
      h('button', {
        type: 'button',
        class: 'seg',
        'data-sound': on ? 'on' : 'off',
        'aria-pressed': String(o.sound === on),
        onclick: () => {
          o.onSound(on);
          for (const el of this.root.querySelectorAll<HTMLButtonElement>('[data-sound]')) {
            el.setAttribute('aria-pressed', String((el.dataset.sound === 'on') === on));
          }
        },
      }, label);
    this.set(
      'start',
      h('h1', { class: 'title', lang: 'en' }, S.title),
      h('p', { class: 'subtitle' }, keepWords(S.subtitle)),
      h(
        'div',
        { class: 'options' },
        h('div', { class: 'opt-row', role: 'group', 'aria-label': S.bandLabel },
          h('span', { class: 'opt-label' }, S.bandLabel),
          bandBtn('3-4', S.band34),
          bandBtn('5-6', S.band56),
          bandBtn('all', S.bandAll),
        ),
        h('div', { class: 'opt-row', role: 'group', 'aria-label': S.soundLabel },
          h('span', { class: 'opt-label' }, svg(ICONS.sound), S.soundLabel),
          soundBtn(true, S.soundOn),
          soundBtn(false, S.soundOff),
        ),
      ),
      h('div', { class: 'start-actions' },
        h('button', { type: 'button', class: 'btn btn-primary btn-big', id: 'btn-camera', onclick: () => o.onCamera() }, svg(ICONS.camera), S.startCamera),
        h('button', { type: 'button', class: 'btn btn-ghost', id: 'btn-touch', onclick: () => o.onTouch() }, svg(ICONS.hand), S.startTouch),
      ),
      h('p', { class: 'stand-hint' }, svg(ICONS.stand, 'icon stand'), h('span', {}, keepWords(S.standHint))),
      h('p', { class: 'privacy', id: 'privacy' }, svg(ICONS.camera), h('span', {}, keepWords(S.privacy))),
    );
  }

  loading(text: string, sub?: string): void {
    this.set(
      'loading',
      h('div', { class: 'spinner', 'aria-hidden': 'true' }),
      h('p', { class: 'loading-text', id: 'loading-text', 'aria-live': 'polite' }, text),
      sub ? h('p', { class: 'loading-sub' }, sub) : h('span', {}),
    );
  }

  setLoadingText(text: string): void {
    const el = this.root.querySelector('#loading-text');
    if (el) el.textContent = text;
  }

  /** 손 확인 화면. START 카드는 손으로 잡거나(카메라) 누른다(터치). */
  handcheck(touch: boolean, onStartTap: () => void): void {
    this.set(
      'handcheck',
      h('p', { class: 'hc-text', id: 'hc-text', 'aria-live': 'polite' }, touch ? S.handcheckTouch : S.handcheckShowPalm),
      h('button', { type: 'button', class: 'grab-card', id: 'start-card', lang: 'en', onclick: () => onStartTap() }, S.startCard),
      h('p', { class: 'hc-hint', id: 'hc-hint', 'aria-live': 'polite' }),
    );
  }

  setHandcheck(text: string, hint: string | null): void {
    const t = this.root.querySelector('#hc-text');
    if (t && t.textContent !== text) t.textContent = text;
    const hEl = this.root.querySelector('#hc-hint');
    if (hEl && hEl.textContent !== (hint ?? '')) hEl.textContent = hint ?? '';
  }

  countdown(n: number): void {
    const existing = this.root.querySelector('#countdown');
    if (existing) {
      if (existing.textContent !== String(n)) existing.textContent = String(n);
      return;
    }
    this.set('countdown', h('div', { class: 'countdown', id: 'countdown', 'aria-live': 'assertive' }, String(n)));
  }

  paused(noHand: boolean, onResume: () => void, onHome: () => void): void {
    this.set(
      'paused',
      h('div', { class: 'card-panel' },
        h('h2', {}, keepWords(noHand ? S.pausedNoHand : S.pausedTitle)),
        noHand ? h('p', { class: 'muted' }, keepWords(S.pausedNoHandResume)) : h('span', {}),
        h('div', { class: 'row' },
          h('button', { type: 'button', class: 'btn btn-primary', id: 'btn-resume', onclick: () => onResume() }, S.resume),
          h('button', { type: 'button', class: 'btn btn-ghost', id: 'btn-home', onclick: () => onHome() }, S.home),
        ),
      ),
    );
  }

  result(o: {
    score: number;
    correct: number;
    total: number;
    best: number;
    newRecord: boolean;
    results: QuestionResult[];
    showGrabCard: boolean;
    onAgain: () => void;
    onHome: () => void;
    onWord: (word: string) => void;
  }): void {
    const rows = o.results.map((r) =>
      h('tr', {},
        h('td', {}, h('button', { type: 'button', class: 'word-btn', lang: 'en', onclick: () => o.onWord(r.q.word) }, r.q.word)),
        h('td', {}, r.q.ko),
        h('td', { lang: 'en', class: 'clue-cell' }, r.q.clue),
        h('td', { class: `mark mark-${r.mark}`, 'aria-label': r.mark }, MARKS[r.mark]),
      ),
    );
    this.set(
      'result',
      h('div', { class: 'result-grid' },
        h('div', { class: 'result-summary' },
          h('div', { class: 'big-score', id: 'result-score' }, h('span', { lang: 'en' }, S.score), h('b', {}, String(o.score))),
          h('div', { class: 'result-line', id: 'result-correct' }, `${S.resultCorrectLabel} `, h('b', {}, S.resultCorrect(o.correct, o.total))),
          h('div', { class: 'result-line', id: 'result-best' }, `${S.resultBest} `, h('b', {}, String(o.best))),
          o.newRecord ? h('div', { class: 'new-record', id: 'new-record', lang: 'en' }, S.newRecord) : h('span', {}),
          o.showGrabCard ? h('button', { type: 'button', class: 'grab-card small', id: 'again-card', lang: 'en', onclick: () => o.onAgain() }, S.playAgainCard) : h('span', {}),
          h('div', { class: 'row' },
            h('button', { type: 'button', class: 'btn btn-primary', id: 'btn-again', onclick: () => o.onAgain() }, S.playAgain),
            h('button', { type: 'button', class: 'btn btn-ghost', id: 'btn-home', onclick: () => o.onHome() }, S.home),
          ),
          h('p', { class: 'muted rest' }, S.restArm),
        ),
        h('div', { class: 'result-table-wrap' },
          h('table', { class: 'review', id: 'review' },
            h('thead', {}, h('tr', {}, h('th', {}, S.reviewWord), h('th', {}, S.reviewKo), h('th', {}, S.reviewClue), h('th', {}, S.reviewMark))),
            h('tbody', {}, rows),
          ),
        ),
      ),
    );
  }

  error(err: AppError, onRetry: () => void, onTouch: () => void): void {
    this.set(
      'error',
      h('div', { class: 'card-panel' },
        h('h2', { id: 'error-title' }, keepWords(S.errorTitle)),
        h('p', { class: 'error-msg', id: 'error-msg' }, keepWords(errorMessage(err.kind))),
        h('div', { class: 'row' },
          h('button', { type: 'button', class: 'btn btn-primary', id: 'btn-retry', onclick: () => onRetry() }, S.retry),
          h('button', { type: 'button', class: 'btn btn-ghost', id: 'btn-touch', onclick: () => onTouch() }, S.startTouch),
        ),
        h('p', { class: 'error-name', id: 'error-name' }, S.errorDetail(err.name)),
      ),
    );
  }

  /** 손으로 잡을 수 있는 카드(START·AGAIN)의 화면 사각형 */
  grabCardRect(): DOMRect | null {
    const el = this.root.querySelector<HTMLElement>('.grab-card');
    return el ? el.getBoundingClientRect() : null;
  }

  setGrabCardAimed(on: boolean): void {
    this.root.querySelector('.grab-card')?.classList.toggle('aimed', on);
  }
}
