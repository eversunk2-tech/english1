// 작은 DOM 도우미.

type Attrs = Record<string, string | number | boolean | null | undefined | ((e: Event) => void)>;
type Child = Node | string | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: (Child | Child[])[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (typeof v === 'function') {
      el.addEventListener(k.replace(/^on/, '').toLowerCase(), v as EventListener);
    } else if (k === 'class') el.className = String(v);
    else if (k === 'text') el.textContent = String(v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return el;
}

/**
 * 한국어 문구를 어절(띄어쓰기로 나뉜 덩어리)마다 줄바꿈 없는 span으로 감싼다 — 줄은 띄어쓰기에서만 바뀐다(review N1).
 * CSS `word-break: keep-all`만으로는 닫는 괄호 뒤(예: "카메라)에서")에서 끊기는 브라우저가 있어 이렇게 한다.
 * textContent는 원래 문구와 글자 하나 다르지 않다.
 */
export function keepWords(text: string): Node[] {
  const out: Node[] = [];
  for (const part of text.split(/(\s+)/)) {
    if (part === '') continue;
    if (/^\s+$/.test(part)) out.push(document.createTextNode(part));
    else {
      const span = document.createElement('span');
      span.className = 'kw';
      span.textContent = part;
      out.push(span);
    }
  }
  return out;
}

/** 인라인 SVG(이모지 대신, spec 2.2) */
export function svg(markup: string, className = 'icon'): HTMLElement {
  const span = document.createElement('span');
  span.className = className;
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = markup;
  return span;
}

export const ICONS = {
  camera:
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h4l2-3h6l2 3h4v13H3z"/><circle cx="12" cy="13" r="4"/></svg>',
  pause:
    '<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1.5"/><rect x="14" y="4" width="4" height="16" rx="1.5"/></svg>',
  hand:
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 11V5a1.5 1.5 0 0 1 3 0v5M10 10V3.5a1.5 1.5 0 0 1 3 0V10M13 10V4.5a1.5 1.5 0 0 1 3 0V11M16 11V7.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-2.7L3.5 14.5a1.5 1.5 0 0 1 2.4-1.8L7 14"/></svg>',
  stand:
    '<svg viewBox="0 0 64 28" width="64" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="4" y="6" width="10" height="14" rx="2"/><path d="M9 20v6M5 26h8"/><circle cx="52" cy="6" r="3"/><path d="M52 9v9M52 18l-4 8M52 18l4 8M52 12l-5 3M52 12l5-3"/><path d="M18 24h28" stroke-dasharray="3 3"/></svg>',
  sound:
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>',
} as const;
