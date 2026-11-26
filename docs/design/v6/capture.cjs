/*
 * v6 시안 찍기(Plan, 2026-11-27). 지금 빌드를 열어
 *   now: 지금 모습 그대로(+ 놀이·손 확인은 시안용 가짜 카메라 장면 위에서)
 *   new: v6.css를 덧씌우고 캔버스 카드·커서를 mock-canvas.js로 v6 규칙대로 그린 모습
 * 을 1180×820(가로)·820×1180(세로)에서 찍고, new는 시작 화면이 화면 4종에서 스크롤 없이 들어가는지도 잰다.
 * 쓰는 법(프로젝트 루트에서 빌드를 따로 띄운 뒤):
 *   npx vite build --outDir <scratch>/dist && node scripts/serve-dist.mjs --dir <scratch>/dist --prefix /english1/ --port 4181
 *   node docs/design/v6/capture.cjs now|new
 */
const path = require('node:path');
const fs = require('node:fs');
const ROOT = path.resolve(__dirname, '../../..');
const { chromium } = require(path.join(ROOT, 'node_modules/@playwright/test'));
const variant = process.argv[2] === 'now' ? 'now' : 'new';
const OUT = path.join(__dirname, variant);
fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.V6_BASE || 'http://127.0.0.1:4181/english1/';
const CSS = fs.readFileSync(path.join(__dirname, 'v6.css'), 'utf8');
const CAM = fs.readFileSync(path.join(__dirname, 'mock-camera.css'), 'utf8');
const MOCK = fs.readFileSync(path.join(__dirname, 'mock-canvas.js'), 'utf8');
const ko = {};
for (const f of ['questions.json', 'veryhard.json']) {
  for (const q of JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data', f), 'utf8')).questions) ko[q.word] = q.ko;
}
const NOW_DIM = 'rgba(8, 16, 32, 0.45)';
const NEW_DIM = 'rgba(20, 20, 20, 0.45)';

async function dress(page) {
  await page.evaluate(MOCK);
  await page.addStyleTag({ content: CAM });
  if (variant === 'new') {
    await page.addStyleTag({ content: CSS });
    // 스틸 사진에서는 흐르는 빛(7초 주기)을 멈춰 둔다
    await page.addStyleTag({ content: '#btn-camera::after,#btn-again::after{animation:none!important;left:-45%!important}' });
    await page.evaluate(() => window.__mock.hideCanvas());
  }
}

(async () => {
  const browser = await chromium.launch();
  const fit = [];
  for (const sz of [{ name: 'land', width: 1180, height: 820 }, { name: 'port', width: 820, height: 1180 }]) {
    const ctx = await browser.newContext({ viewport: { width: sz.width, height: sz.height }, deviceScaleFactor: 1, bypassCSP: true });
    const page = await ctx.newPage();
    const st = () => page.evaluate(() => window.__eg.state());
    const step = (ms) => page.evaluate((m) => window.__eg.clock.step(m), ms);
    const shot = async (n) => {
      await page.waitForTimeout(250);
      await page.screenshot({ path: `${OUT}/${variant}-${n}-${sz.name}.png` });
      if (variant === 'new') fs.writeFileSync(`${OUT}/${variant}-${n}-${sz.name}.html`, await snapshot(page));
    };
    const cam = () => page.evaluate((d) => window.__mock.camera(d), variant === 'new' ? NEW_DIM : NOW_DIM);
    let aimedId = null;
    let cursor = null;
    const draw = async (extra = {}) => {
      if (variant !== 'new') return;
      const s = await st();
      const cards = s.cards.map((c) => ({ ...c, ko: ko[c.word], aimed: c.id === aimedId }));
      await page.evaluate(([cs, cu, b]) => {
        window.__mock.renderCards(cs);
        window.__mock.renderCursor(cu);
        if (b) window.__mock.renderBurst(b.x, b.y);
      }, [cards, cursor, extra.burst || null]);
    };

    await page.goto(BASE + '?input=pointer&seed=7&test=1&clock=manual');
    await page.waitForSelector('.screen-start');
    await dress(page);
    await page.click('[data-band="5-6"]');
    await page.click('[data-difficulty="hard"]');
    if (variant === 'new') await page.evaluate(() => window.__mock.accentTitle());
    await shot('start');
    await page.click('[data-difficulty="veryhard"]');
    await shot('start-vh');
    await page.click('[data-difficulty="hard"]');

    await page.click('#btn-touch');
    await page.waitForSelector('#start-card');
    await cam();
    await shot('handcheck');
    await page.click('#start-card');
    await step(1000);
    await shot('countdown');
    await step(2200);
    let s;
    for (let i = 0; i < 200; i++) {
      s = await st();
      if (s.phase === 'falling' && s.cards.length && s.cards.every((c) => c.rect.y > s.bandH + 60)) break;
      await step(50);
    }
    await step(600);
    s = await st();
    const corr = s.cards.find((c) => c.correct);
    const cx = corr.rect.x + corr.rect.w * 0.8, cy = corr.rect.y + corr.rect.h * 0.7;
    await page.mouse.move(cx, cy);
    await step(16);
    aimedId = corr.id;
    cursor = { x: cx, y: cy, C: 0.62, closed: false };
    await draw();
    await shot('play');
    s = await st();
    const wrong = s.cards.find((c) => !c.correct && c.grabbable);
    if (wrong) {
      aimedId = null;
      await page.mouse.click(wrong.rect.x + wrong.rect.w / 2, wrong.rect.y + wrong.rect.h / 2);
      await step(120);
      // 시안: 카드 글자가 보이게 커서를 카드 오른쪽 아래 모서리 쪽에 둠
      cursor = { x: wrong.rect.x + wrong.rect.w * 0.9, y: wrong.rect.y + wrong.rect.h * 0.95, C: 1, closed: true };
      await draw();
      await shot('play-wrong');
      await step(500);
    }
    s = await st();
    const c2 = s.cards.find((c) => c.correct);
    await page.mouse.click(c2.rect.x + c2.rect.w / 2, c2.rect.y + c2.rect.h / 2);
    await step(150);
    cursor = { x: c2.rect.x + c2.rect.w * 0.9, y: c2.rect.y + c2.rect.h * 0.95, C: 1, closed: true };
    await draw({ burst: { x: c2.rect.x + c2.rect.w / 2, y: c2.rect.y + c2.rect.h / 2 } });
    await shot('play-correct');
    await step(1600);
    cursor = null;
    await page.click('#pause-btn');
    await step(50);
    await draw();
    await shot('paused');
    await page.click('#btn-resume');
    await step(3200);
    for (let q = 2; q <= 10; q++) {
      for (let i = 0; i < 400; i++) {
        s = await st();
        if (s.screen === 'result') break;
        if (s.question === q && s.phase === 'falling' && s.cards.some((c) => c.correct && c.grabbable && c.rect.y > s.bandH + 20)) break;
        await step(100);
      }
      if (q === 4) {
        for (let i = 0; i < 200; i++) { s = await st(); if (s.question !== 4 || s.phase !== 'falling') break; await step(100); }
        await step(300);
        await draw();
        if (sz.name === 'land') await shot('play-miss');
        continue;
      }
      s = await st();
      const c = s.cards.find((x) => x.correct && x.grabbable);
      if (!c) continue;
      await page.mouse.click(c.rect.x + c.rect.w / 2, c.rect.y + c.rect.h / 2);
      await step(1700);
    }
    for (let i = 0; i < 300; i++) { s = await st(); if (s.screen === 'result') break; await step(100); }
    await step(100);
    if (variant === 'new') await page.evaluate(() => window.__mock.clear());
    await shot('result');

    await page.goto(BASE + '?test=1');
    await page.waitForSelector('.screen-start');
    await dress(page);
    await page.evaluate(() => window.__eg.forceError('denied'));
    await page.waitForTimeout(100);
    await shot('error');
    await ctx.close();
  }

  // new: 시작 화면 스크롤 없음·난이도 4칸 한 줄·높이 ≥ 56·한국어 어절 끊김 없음(E6과 같은 재기) — 화면 4종 × 학년 3 × 난이도 4
  if (variant === 'new') {
    const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 }, bypassCSP: true });
    const page = await ctx.newPage();
    await page.goto(BASE + '?test=1');
    await page.waitForSelector('.screen-start');
    await dress(page);
    await page.evaluate(() => window.__mock.accentTitle());
    for (const size of [{ width: 1024, height: 768 }, { width: 1180, height: 820 }, { width: 768, height: 1024 }, { width: 820, height: 1180 }]) {
      await page.setViewportSize(size);
      for (const band of ['3-4', '5-6', 'all']) for (const d of ['easy', 'normal', 'hard', 'veryhard']) {
        await page.click(`[data-band="${band}"]`);
        await page.click(`[data-difficulty="${d}"]`);
        await page.waitForTimeout(30);
        const m = await page.evaluate(() => {
          const sc = document.querySelector('.screen-start');
          const kids = [...sc.children].map((c) => c.getBoundingClientRect());
          const tops = [...document.querySelectorAll('[data-difficulty]')].map((e) => Math.round(e.getBoundingClientRect().top));
          const hs = [...document.querySelectorAll('[data-difficulty]')].map((e) => e.getBoundingClientRect().height);
          const rights = [...document.querySelectorAll('[data-difficulty]')].map((e) => e.getBoundingClientRect().right);
          // 한국어 어절 가운데 줄바꿈 찾기
          const bad = [];
          for (const sel of ['.subtitle', '#difficulty-desc', '.stand-hint', '#privacy', '#privacy-voice', '#band-note']) {
            const el = document.querySelector(sel);
            if (!el || el.closest('[hidden]')) continue;
            const chars = [];
            const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
            for (let n = w.nextNode(); n; n = w.nextNode()) {
              const t = n.textContent;
              for (let i = 0; i < t.length; i++) {
                const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + 1);
                const rc = r.getClientRects()[0];
                chars.push({ ch: t[i], top: rc ? rc.top : NaN });
              }
            }
            let last = NaN, prev = '';
            for (const c of chars) {
              if (/\s/.test(c.ch) || Number.isNaN(c.top)) { prev = c.ch; continue; }
              if (!Number.isNaN(last) && c.top > last + 2 && !/\s/.test(prev)) bad.push(`${sel}:${prev}|${c.ch}`);
              last = c.top; prev = c.ch;
            }
          }
          return {
            scrollH: sc.scrollHeight, clientH: sc.clientHeight, docH: document.documentElement.scrollHeight, winH: innerHeight,
            top: Math.min(...kids.map((r) => r.top)), bottom: Math.max(...kids.map((r) => r.bottom)),
            oneLine: new Set(tops).size === 1, minH: Math.min(...hs), maxRight: Math.max(...rights), winW: innerWidth, bad,
          };
        });
        const ok = m.scrollH <= m.clientH && m.docH <= m.winH && m.top >= 0 && m.bottom <= m.winH && m.oneLine && m.minH >= 56 && m.maxRight <= m.winW && m.bad.length === 0;
        fit.push({ size: `${size.width}x${size.height}`, band, d, ok, bottom: Math.round(m.bottom), winH: m.winH, oneLine: m.oneLine, minH: Math.round(m.minH), bad: m.bad });
      }
      await page.click('[data-band="5-6"]');
      await page.click('[data-difficulty="hard"]');
      await page.waitForTimeout(250);
      await page.screenshot({ path: `${OUT}/new-start-${size.width}x${size.height}.png` });
    }
    await ctx.close();
    fs.writeFileSync(path.join(OUT, 'start-fit.json'), JSON.stringify(fit, null, 1));
    const fails = fit.filter((f) => !f.ok);
    console.log(`start-fit: ${fit.length - fails.length}/${fit.length} ok`);
    for (const f of fails) console.log('FAIL', JSON.stringify(f));
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });

// 정적 스냅숏(스크립트 없이 그 순간의 DOM + 스타일). 오프라인으로 열린다.
async function snapshot(page) {
  return page.evaluate(() => {
    const css = [...document.styleSheets].map((sh) => { try { return [...sh.cssRules].map((r) => r.cssText).join('\n'); } catch { return ''; } }).join('\n');
    const app = document.getElementById('app').cloneNode(true);
    for (const c of app.querySelectorAll('canvas, video, script')) c.remove();
    return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Catch the Word! v6 시안(정적 스냅숏)</title><style>${css}</style></head><body>${app.outerHTML}${document.getElementById('mock-cursor-layer')?.outerHTML ?? ''}</body></html>`;
  });
}
