// spec 8.1: 터치·마우스 입력. pointerdown = 그 자리에서 잡기(펴기/쥐기 없음). 마우스는 pointermove로 커서·겨냥 표시.
import type { Point2 } from './tracker.ts';

export interface PointerTap {
  pos: Point2;
}

export class PointerInput {
  private taps: PointerTap[] = [];
  /** 마우스 커서 위치(터치에는 없음) */
  hover: Point2 | null = null;
  enabled = false;
  private readonly el: HTMLElement;
  private readonly onDown = (e: PointerEvent): void => {
    if (!this.enabled) return;
    const target = e.target as Element | null;
    // 버튼·입력 요소 위의 누르기는 게임 잡기가 아니다
    if (target && target.closest('button, a, input, select, label, [data-ui]')) return;
    this.taps.push({ pos: { x: e.clientX, y: e.clientY } });
    this.onTap?.();
  };
  private readonly onMove = (e: PointerEvent): void => {
    if (!this.enabled) return;
    if (e.pointerType === 'mouse') this.hover = { x: e.clientX, y: e.clientY };
  };
  private readonly onLeave = (): void => {
    this.hover = null;
  };

  private readonly onTap: (() => void) | undefined;

  /** onTap: 누르는 즉시 처리하고 싶을 때(다음 프레임까지 기다리지 않음) */
  constructor(el: HTMLElement, onTap?: () => void) {
    this.el = el;
    this.onTap = onTap;
    el.addEventListener('pointerdown', this.onDown);
    el.addEventListener('pointermove', this.onMove);
    el.addEventListener('pointerleave', this.onLeave);
  }

  drain(): PointerTap[] {
    const t = this.taps;
    this.taps = [];
    return t;
  }

  dispose(): void {
    this.el.removeEventListener('pointerdown', this.onDown);
    this.el.removeEventListener('pointermove', this.onMove);
    this.el.removeEventListener('pointerleave', this.onLeave);
  }
}
