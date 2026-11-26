// v6(spec 17.11): 낱말 카드 글자 폭 재기(makeMeasure)와 그리기가 같은 굵기(CARD_FONT_WEIGHT = 900)를 쓰는지
import { describe, expect, it } from 'vitest';
import { CARD_FONT_WEIGHT, FONT_STACK, cardFont, makeMeasure } from '../../src/render/canvasRenderer.ts';

describe('CARD_FONT_WEIGHT', () => {
  it('900이고, makeMeasure가 재기 전에 그 굵기로 글꼴을 맞춘다', () => {
    expect(CARD_FONT_WEIGHT).toBe(900);
    const fonts: string[] = [];
    const fake = { font: '', measureText: (text: string) => ({ width: text.length * 10 }) };
    fake.measureText = (text: string) => {
      fonts.push(fake.font);
      return { width: text.length * 10 };
    };
    const ctx = fake as unknown as CanvasRenderingContext2D;
    const w = makeMeasure(ctx)('umbrella', 42);
    expect(w).toBe(80);
    expect(fonts).toEqual([`${CARD_FONT_WEIGHT} 42px ${FONT_STACK}`]);
    // 그리기 쪽이 쓰는 글꼴 문자열과 같다
    expect(fonts[0]).toBe(cardFont(42));
  });

  it('시스템 글꼴만 쓴다(외부 글꼴 이름 없음, spec 17.4)', () => {
    expect(FONT_STACK.startsWith('system-ui')).toBe(true);
    expect(FONT_STACK).toMatch(/sans-serif$/);
  });
});
