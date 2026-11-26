import { expect, test, type Page } from '@playwright/test';
import { synthHand } from '../helpers/handSynth.ts';
import { VH, VW, clickAt, screenToNorm, startTouchGame, step, stepUntil } from './helpers.ts';

// E11(v6 디자인, spec 12.2·17.11): 대비 ≥ 4.5 · 키보드 포커스 바깥선 · 움직임 줄이기 · 고른 칸이 색만으로 구분되지 않음 · 글꼴 파일 요청 0

/** 글자색과 가장 가까운 불투명 배경색으로 WCAG 대비를 잰다(selector에 맞는 모든 요소 중 가장 낮은 값과 그 내용) */
async function contrast(page: Page, selector: string): Promise<{ min: number; worst: string; count: number }> {
  return page.evaluate((sel) => {
    const parse = (c: string): [number, number, number, number] => {
      const m = c.match(/rgba?\(([^)]+)\)/);
      if (!m) return [0, 0, 0, 0];
      const p = m[1]!.split(/[\s,/]+/).filter(Boolean).map(Number);
      return [p[0]!, p[1]!, p[2]!, p.length > 3 ? p[3]! : 1];
    };
    const lum = ([r, g, b]: number[]): number => {
      const f = (v: number): number => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * f(r!) + 0.7152 * f(g!) + 0.0722 * f(b!);
    };
    const bgOf = (el: Element): number[] => {
      for (let e: Element | null = el; e; e = e.parentElement) {
        const c = parse(getComputedStyle(e).backgroundColor);
        if (c[3] >= 0.99) return c;
      }
      return [255, 255, 255, 1];
    };
    let min = Infinity;
    let worst = '';
    const els = [...document.querySelectorAll(sel)];
    for (const el of els) {
      const fg = parse(getComputedStyle(el).color);
      const bg = bgOf(el);
      const a = lum(fg);
      const b = lum(bg);
      const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      if (ratio < min) {
        min = ratio;
        worst = `${(el.textContent ?? '').trim().slice(0, 30)} ${getComputedStyle(el).color} on ${bg.join(',')}`;
      }
    }
    return { min, worst, count: els.length };
  }, selector);
}

/** CSS rgb()/rgba() 두 색의 WCAG 대비(배경은 불투명으로 봄) */
function ratio(fg: string, bg: string): number {
  const p = (c: string): number[] => (c.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
  const l = (c: number[]): number => {
    const f = (v: number): number => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(c[0]!) + 0.7152 * f(c[1]!) + 0.0722 * f(c[2]!);
  };
  const a = l(p(fg));
  const b = l(p(bg));
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

async function expectContrast(page: Page, selector: string): Promise<void> {
  const r = await contrast(page, selector);
  expect(r.count, `${selector} 요소가 있어야 함`).toBeGreaterThan(0);
  expect(r.min, `${selector}: ${r.worst}`).toBeGreaterThanOrEqual(4.5);
}

/** 터치 모드 Easy 한 판을 정답만 눌러 결과 화면까지 */
async function playToResult(page: Page, touch: boolean): Promise<void> {
  for (let q = 1; q <= 10; q++) {
    const s = await stepUntil(page, (st) => st.question === q && st.phase === 'falling' && st.cards.some((c) => c.correct && c.grabbable && c.rect.y > st.bandH + 20));
    const c = s.cards.find((x) => x.correct)!;
    await clickAt(page, c.rect.x + c.rect.w / 2, c.rect.y + c.rect.h / 2, touch);
    await step(page, 1600);
  }
  await stepUntil(page, (st) => st.screen === 'result');
}

test('E11 ① 주요 글자 짝의 대비 ≥ 4.5(시작·놀이·결과·오류) ⑤ 글꼴 파일 요청 0', async ({ page }, info) => {
  test.setTimeout(120_000);
  const touch = info.project.use.hasTouch === true;
  const fontReqs: string[] = [];
  page.on('request', (r) => {
    if (/\.(woff2?|ttf|otf)(\?|#|$)/i.test(new URL(r.url()).pathname)) fontReqs.push(r.url());
  });

  await page.goto('./?input=pointer&seed=7&test=1&clock=manual&difficulty=easy');
  await page.waitForSelector('.screen-start');
  // 시작: 고른 칸(코발트 위 흰 글자), 대표 버튼(노랑 위 검정)
  await expectContrast(page, '.seg[aria-pressed="true"]');
  await expectContrast(page, '#btn-camera');
  await expectContrast(page, '#btn-touch');
  await expectContrast(page, '#difficulty-desc');
  await expectContrast(page, '#privacy');

  // 놀이: 설명 띠·점수 스티커
  await startTouchGame(page);
  await expectContrast(page, '#clue');
  await expectContrast(page, '#score b');
  await expectContrast(page, '#qno');
  await expectContrast(page, '#diff-badge');

  // 결과: 복습표 칸
  await playToResult(page, touch);
  await expectContrast(page, '.review td');
  await expectContrast(page, '.review th');
  await expectContrast(page, '.word-btn');
  await expectContrast(page, '#result-correct');

  // 오류
  await page.goto('./?test=1');
  await page.waitForSelector('.screen-start');
  await page.evaluate(() => window.__eg!.forceError('denied'));
  await page.waitForSelector('#error-msg');
  await expectContrast(page, '#error-msg');
  await expectContrast(page, '#error-title');

  expect(fontReqs).toEqual([]);
});

test('E11 ② Tab으로 #btn-camera에 가면 포커스 바깥선(실선, 3px 이상)이 보인다', async ({ page }) => {
  await page.goto('./?test=1');
  await page.waitForSelector('.screen-start');
  let found = false;
  for (let i = 0; i < 40 && !found; i++) {
    await page.keyboard.press('Tab');
    found = await page.evaluate(() => document.activeElement?.id === 'btn-camera');
  }
  expect(found).toBe(true);
  const o = await page.evaluate(() => {
    const cs = getComputedStyle(document.getElementById('btn-camera')!);
    return { style: cs.outlineStyle, width: parseFloat(cs.outlineWidth), visible: document.getElementById('btn-camera')!.matches(':focus-visible') };
  });
  expect(o.visible).toBe(true);
  expect(o.style).toBe('solid');
  expect(o.width).toBeGreaterThanOrEqual(3);
});

test('E11 ③ 움직임 줄이기: 흐르는 빛 없음(보통 때는 있음)', async ({ page }) => {
  const sheen = (): Promise<{ name: string; display: string }> =>
    page.evaluate(() => {
      const cs = getComputedStyle(document.getElementById('btn-camera')!, '::after');
      return { name: cs.animationName, display: cs.display };
    });
  await page.goto('./?test=1');
  await page.waitForSelector('#btn-camera');
  expect((await sheen()).name).toBe('sheen');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./?test=1');
  await page.waitForSelector('#btn-camera');
  const r = await sheen();
  expect(r.name === 'none' || r.display === 'none', JSON.stringify(r)).toBe(true);
  // 버튼 누름 전환도 없음
  const tr = await page.evaluate(() => getComputedStyle(document.getElementById('btn-camera')!).transitionDuration);
  expect(tr.split(',').every((t) => parseFloat(t) === 0)).toBe(true);
});

test('E11 ④ 고른 칸과 안 고른 칸은 색만이 아니라 그림자 모양도 다르다', async ({ page }) => {
  await page.goto('./?test=1');
  await page.waitForSelector('.screen-start');
  for (const attr of ['data-band', 'data-difficulty', 'data-sound']) {
    const shadows = await page.evaluate((a) => {
      const on = document.querySelector(`[${a}][aria-pressed="true"]`)!;
      const off = document.querySelector(`[${a}][aria-pressed="false"]`)!;
      return { on: getComputedStyle(on).boxShadow, off: getComputedStyle(off).boxShadow };
    }, attr);
    expect(shadows.on, attr).not.toBe(shadows.off);
    expect(shadows.on, attr).toContain('inset');
  }
});

test('E11 R1(review 22): 고르기 칸을 누른 바로 그 순간에도 글자 대비 ≥ 4.5(바탕·글자색 전환 없음)', async ({ page }) => {
  await page.goto('./?test=1');
  await page.waitForSelector('.screen-start');
  // 결정적 확인: 고르기 칸은 background·color를 전환하지 않는다
  const props = await page.evaluate(() => getComputedStyle(document.querySelector('.seg')!).transitionProperty);
  expect(props.split(',').map((x) => x.trim())).not.toEqual(expect.arrayContaining(['all']));
  for (const bad of ['all', 'background', 'background-color', 'color']) expect(props.split(',').map((x) => x.trim())).not.toContain(bad);
  // 실제로 누른 직후(같은 프레임)와 50ms 뒤, 새로 고른 칸과 풀린 칸 모두
  for (const [attr, from, to] of [
    ['data-band', '3-4', '5-6'],
    ['data-difficulty', 'normal', 'hard'],
    ['data-sound', 'on', 'off'],
  ] as const) {
    await page.click(`[${attr}="${from}"]`);
    await page.waitForTimeout(200);
    for (const wait of [0, 50]) {
      if (wait === 0) {
        // 누르고 같은 태스크 안에서 바로 잰다
        const r = await page.evaluate(([a, t, f]) => {
          (document.querySelector(`[${a}="${t}"]`) as HTMLElement).click();
          return [t, f].map((v) => {
            const el = document.querySelector(`[${a}="${v}"]`)!;
            return { color: getComputedStyle(el).color, bg: getComputedStyle(el).backgroundColor };
          });
        }, [attr, to, from] as const);
        for (const x of r) expect(ratio(x.color, x.bg), `${attr} 0ms ${JSON.stringify(x)}`).toBeGreaterThanOrEqual(4.5);
      } else {
        await page.click(`[${attr}="${from}"]`);
        await page.waitForTimeout(wait);
        await expectContrast(page, `[${attr}]`);
      }
    }
  }
});

test('E11 M1(review 22): START 카드 가장자리 근처에 편 손을 가만히 두면 겨냥 표시가 깜빡이지 않는다', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('./?input=replay&seed=7&test=1&clock=manual');
  await page.click('#btn-camera');
  await expect.poll(async () => (await page.evaluate(() => window.__eg!.state())).screen).toBe('handcheck');
  const { W, H, r0 } = await page.evaluate(() => {
    const st = window.__eg!.state();
    return { W: st.viewport.W, H: st.viewport.H, r0: st.grabCardRect! };
  });
  let sawOn = false;
  let sawOff = false;
  const flicker: string[] = [];
  // 판정 여유(약 20~30px) 끝을 지나도록 오른쪽·아래 가장자리 바깥 20~36px를 1px씩
  for (const side of ['right', 'bottom'] as const) {
    for (let d = 20; d <= 36; d++) {
      const x = side === 'right' ? r0.x + r0.w + d : r0.x + r0.w / 2;
      const y = side === 'bottom' ? r0.y + r0.h + d : r0.y + r0.h / 2;
      const { u, v } = screenToNorm(x, y, W, H);
      const frames = [];
      for (let t = 0; t < 1000; t += 1000 / 30) frames.push({ t, hands: [synthHand({ bend: 0, u, v, palm: 0.08, videoW: VW, videoH: VH })], videoSize: { w: VW, h: VH } });
      await page.evaluate((f) => window.__eg!.loadReplay(f), frames);
      const seq = await page.evaluate(async () => {
        const out: boolean[] = [];
        for (let k = 0; k < 30; k++) {
          window.__eg!.clock.step(33);
          await new Promise((r) => setTimeout(r, 0));
          out.push(document.querySelector('.grab-card')!.classList.contains('aimed'));
        }
        return out;
      });
      const rect = await page.evaluate(() => window.__eg!.state().grabCardRect!);
      // 겨냥돼도 카드(= 판정 사각형)는 움직이지 않는다
      expect(rect, `${side}+${d}`).toEqual(r0);
      let toggles = 0;
      for (let k = 1; k < seq.length; k++) if (seq[k] !== seq[k - 1]) toggles++;
      if (seq.some(Boolean)) sawOn = true;
      if (seq.some((a) => !a)) sawOff = true;
      if (toggles > 1) flicker.push(`${side}+${d}px: 바뀜 ${toggles}`);
    }
  }
  expect(flicker).toEqual([]);
  // 재기가 헛돌지 않았는지: 가까운 곳에서는 겨냥되고 먼 곳에서는 풀린다
  expect(sawOn).toBe(true);
  expect(sawOff).toBe(true);
});
