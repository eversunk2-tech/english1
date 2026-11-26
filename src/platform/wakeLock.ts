// spec 5.7: 놀이 중 화면 꺼짐 방지. 지원하지 않거나 실패하면 조용히 넘어간다.

interface WakeLockSentinelLike {
  release(): Promise<void>;
}

let sentinel: WakeLockSentinelLike | null = null;
let wanted = false;

export async function acquireWakeLock(): Promise<void> {
  wanted = true;
  if (sentinel) return;
  const wl = (navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<WakeLockSentinelLike> } })
    .wakeLock;
  if (!wl) return;
  try {
    const s = await wl.request('screen');
    if (!wanted) {
      void s.release().catch(() => undefined);
      return;
    }
    sentinel = s;
  } catch {
    // 조용히 넘어감
  }
}

export function releaseWakeLock(): void {
  wanted = false;
  const s = sentinel;
  sentinel = null;
  if (s) void s.release().catch(() => undefined);
}
