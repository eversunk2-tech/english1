// 사이트 밖으로 나가는 fetch를 막는다(spec 9절 "사이트 밖으로 요청 0개"의 보강).
// @mediapipe/tasks-vision 1.2.3 번들에는 사용 통계를 https://odml.pa.googleapis.com/v1/log 로 보내는 코드가 들어 있다
// (그래프를 만들 때·30초마다 기록, 60초마다·close() 때 fetch로 전송). CSP(connect-src 'self')도 막지만,
// CSP에 막히면 콘솔 오류가 남으므로 그 전에 여기서 조용히 거절한다. 거절되면 그 로거는 스스로 전송을 멈춘다.

let blocked = 0;
let installed = false;

export function blockedRequestCount(): number {
  return blocked;
}

export function installNetworkGuard(): void {
  if (installed || typeof window === 'undefined' || typeof window.fetch !== 'function') return;
  installed = true;
  const original = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let href: string;
    if (typeof input === 'string') href = input;
    else if (input instanceof URL) href = input.href;
    else href = input.url;
    let url: URL;
    try {
      url = new URL(href, document.baseURI);
    } catch {
      return original(input, init);
    }
    const local = url.protocol === 'blob:' || url.protocol === 'data:' || url.origin === window.location.origin;
    if (!local) {
      blocked += 1;
      return Promise.reject(new TypeError('blocked: external request'));
    }
    return original(input, init);
  };
}
