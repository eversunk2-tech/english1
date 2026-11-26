// spec 5.6.1 ⑥ (v8·v9): 섞은 카드 더미 저장 — 메모리 + localStorage(catchword.bag.<3-4|5-6|vh-mid|vh-adv>).
// localStorage가 막혀 있으면 읽기는 빈 더미, 쓰기는 건너뛰고 그 페이지 동안 메모리로 이어 간다.
// persist: false(seed 모드, ?test=1&seed=…)면 localStorage를 읽지도 쓰지도 않고 빈 메모리 더미에서 시작한다.
import { STORAGE_KEYS } from '../config.ts';
import { BAG_NAMES, bagPool, emptyBag, sanitizeBag, serializeBag, type BagName, type BagPools, type BagState } from '../game/bag.ts';
import type { Question } from '../game/types.ts';
import { get, set } from './storage.ts';

export class BagStore {
  readonly persist: boolean;
  private readonly pools = new Map<BagName, Question[]>();
  private readonly mem = new Map<BagName, BagState>();

  constructor(pools: BagPools, opts: { persist: boolean }) {
    this.persist = opts.persist;
    for (const name of BAG_NAMES) this.pools.set(name, bagPool(name, pools));
  }

  /** 더미의 풀(데이터 파일 순서) */
  pool(name: BagName): Question[] {
    return this.pools.get(name) ?? [];
  }

  /** 이 페이지에서 이미 읽은 더미면 메모리 값, 아니면 localStorage에서 읽어 맞춘 값 */
  load(name: BagName): BagState {
    const m = this.mem.get(name);
    if (m) return copy(m);
    const st = this.persist ? sanitizeBag(get(STORAGE_KEYS.bagPrefix + name), this.pool(name).map((q) => q.id)) : emptyBag();
    this.mem.set(name, st);
    return copy(st);
  }

  /** 메모리에 두고 (persist면) localStorage에 쓴다 */
  save(name: BagName, state: BagState): void {
    this.mem.set(name, copy(state));
    if (this.persist) set(STORAGE_KEYS.bagPrefix + name, serializeBag(state));
  }
}

function copy(s: BagState): BagState {
  return { used: s.used.slice(), recent: s.recent.slice() };
}
