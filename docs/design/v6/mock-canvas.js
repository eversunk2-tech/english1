/*
 * 시안 전용 — 캔버스에 그릴 v6 카드·커서·입자를 DOM으로 흉내 낸다(실제 게임 캔버스는 CSS로 바꿀 수 없어서).
 * 위치·크기는 지금 게임의 window.__eg.state() 카드 사각형을 그대로 쓴다. 그리는 규칙은 spec 17.5와 같다.
 * Build는 이 규칙을 src/render/canvasRenderer.ts에 Canvas 2D로 옮긴다(이 파일은 쓰지 않는다).
 */
(() => {
  const INK = '#141414', PAPER2 = '#fffdf7', YELLOW = '#ffd400', RED = '#ff4a1c', GREEN = '#2fd27a', COBALT = '#2b4bff';
  const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";
  const cv = document.createElement('canvas').getContext('2d');
  // spec 5.4 글자 크기 규칙 그대로(0.48·cardH에서 시작, 카드 너비 − 24에 맞춤, 최소 18) — 굵기만 900
  function fontPx(word, w, h) {
    let px = Math.floor(0.48 * h);
    for (; px > 18; px--) { cv.font = `900 ${px}px ${FONT}`; if (cv.measureText(word).width <= w - 24) break; }
    return px;
  }
  function layer() {
    let el = document.getElementById('mock-layer');
    if (!el) {
      el = document.createElement('div');
      el.id = 'mock-layer';
      el.style.cssText = 'position:fixed;inset:0;z-index:2;pointer-events:none';
      document.getElementById('stage').after(el);
      const cur = document.createElement('div');
      cur.id = 'mock-cursor-layer';
      cur.style.cssText = 'position:fixed;inset:0;z-index:5;pointer-events:none';
      document.body.append(cur);
    }
    return el;
  }
  const badge = (sym, bg) =>
    `<div style="position:absolute;right:-14px;top:-16px;width:34px;height:34px;border-radius:50%;background:${bg};border:3px solid ${INK};display:grid;place-items:center;font:900 20px ${FONT};color:${INK}">${sym}</div>`;

  function renderCards(cards) {
    const el = layer();
    el.innerHTML = '';
    for (const c of cards) {
      if (c.status === 'gone') continue;
      const r = c.rect;
      let bg = PAPER2, sh = 6, lift = 0, extra = '', alpha = 1, inner = '';
      const px = fontPx(c.word, r.w, r.h);
      if (c.status === 'fading') alpha = 0.35;
      if (c.aimed && c.status === 'falling') {
        lift = 3; sh = 10;
        extra = `box-shadow:0 0 0 7px ${YELLOW},0 0 0 10px ${INK},${sh}px ${sh + 1}px 0 10px ${INK};`;
      }
      let tilt = 0;
      if (c.status === 'wrong') { bg = RED; inner = badge('✕', PAPER2); tilt = -3; }
      if (c.status === 'caught') { bg = GREEN; inner = badge('✓', YELLOW); }
      const text = c.status === 'caught'
        ? `<div style="font:900 ${Math.round(px * 0.85)}px ${FONT};line-height:1">${c.word}</div><div style="font:800 ${Math.max(16, Math.round(px * 0.6))}px ${FONT};line-height:1.1;margin-top:4px">${c.ko || ''}</div>`
        : `<div style="font:900 ${px}px ${FONT};line-height:1;letter-spacing:-0.01em">${c.word}</div>`;
      const gloss = c.status === 'caught' || c.status === 'wrong'
        ? `<div style="position:absolute;left:8px;right:8px;top:5px;height:22%;border-radius:6px;background:rgba(255,255,255,.45)"></div>` : '';
      el.insertAdjacentHTML('beforeend',
        `<div style="position:absolute;left:${r.x - lift}px;top:${r.y - lift}px;width:${r.w}px;height:${r.h}px;opacity:${alpha};transform:rotate(${tilt}deg);
          box-sizing:border-box;border:4px solid ${INK};border-radius:10px;background:${bg};color:${INK};
          box-shadow:${sh}px ${sh + 1}px 0 ${INK};${extra}display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">${gloss}<div style="position:relative">${text}</div>${inner}</div>`);
    }
  }

  // 커서: 흰 고리 + 검은 외곽선, 쥠 정도(C)만큼 노란 호, 가운데 손 모양(노랑 + 검은 선)
  function renderCursor(cur) {
    layer();
    const el = document.getElementById('mock-cursor-layer');
    el.innerHTML = '';
    if (!cur) return;
    const R = 32, C = cur.C || 0, fill = cur.color || YELLOW;
    const a = Math.PI * 2 * Math.min(1, C);
    const ex = R * Math.sin(a), ey = -R * Math.cos(a);
    const arc = C > 0.01 ? `<path d="M0 ${-R} A${R} ${R} 0 ${a > Math.PI ? 1 : 0} 1 ${ex.toFixed(1)} ${ey.toFixed(1)}" fill="none" stroke="${fill}" stroke-width="7" stroke-linecap="round"/>` : '';
    const hand = cur.closed
      ? `<rect x="-13" y="-11" width="26" height="22" rx="7" fill="${fill}" stroke="${INK}" stroke-width="2.5"/><path d="M-5 -11v8M1 -11v8M7 -11v8" stroke="${INK}" stroke-width="2"/>`
      : `<path d="M-11 4 v-12 a3 3 0 0 1 6 0 v6 v-11 a3 3 0 0 1 6 0 v11 v-9 a3 3 0 0 1 6 0 v10 v-6 a3 3 0 0 1 6 0 v10 a12 12 0 0 1 -12 12 h-2 a10 10 0 0 1 -9 -6 l-5 -8 a3 3 0 0 1 5 -3 z" fill="${fill}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round" transform="translate(-1 -2)"/>`;
    el.innerHTML = `<svg style="position:absolute;left:${cur.x - 50}px;top:${cur.y - 50}px;opacity:${cur.offscreen ? 0.35 : 1}" width="100" height="100" viewBox="-50 -50 100 100"><g>
      <circle r="${R}" fill="none" stroke="${INK}" stroke-width="13"/>
      <circle r="${R}" fill="none" stroke="${PAPER2}" stroke-width="7"/>
      ${arc}<g transform="scale(1.25)">${hand}</g></g></svg>`;
  }

  // 입자: 팔레트 색 네모·별(정답 터짐) — 120개 상한은 그대로
  function renderBurst(x, y, n = 26, seed = 3) {
    const el = layer();
    const cols = [YELLOW, RED, COBALT, GREEN, PAPER2];
    let s = seed;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < n; i++) {
      const ang = rnd() * Math.PI * 2, d = 40 + rnd() * 110, sz = 7 + rnd() * 8;
      el.insertAdjacentHTML('beforeend', `<div style="position:absolute;left:${x + Math.cos(ang) * d}px;top:${y + Math.sin(ang) * d - 20}px;width:${sz}px;height:${sz}px;background:${cols[i % cols.length]};border:2px solid ${INK};transform:rotate(${rnd() * 90}deg)"></div>`);
    }
  }

  window.__mock = {
    hideCanvas() {
      document.getElementById('stage').style.opacity = '0';
      document.getElementById('cursor-layer').style.opacity = '0';
    },
    renderCards, renderCursor, renderBurst,
    clear() { const a = document.getElementById('mock-layer'); if (a) a.innerHTML = ''; const b = document.getElementById('mock-cursor-layer'); if (b) b.innerHTML = ''; },
    camera(dimCss) {
      if (!document.getElementById('mock-cam')) {
        const d = document.createElement('div');
        d.id = 'mock-cam';
        document.getElementById('app').prepend(d);
      }
      document.getElementById('camera-dim').style.background = dimCss;
    },
    accentTitle() {
      const t = document.querySelector('.screen-start .title');
      if (t && t.textContent === 'Catch the Word!') t.innerHTML = 'Catch the <span class="accent">Word!</span>';
    },
  };
})();
