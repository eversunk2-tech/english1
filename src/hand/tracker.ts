// spec 8.1: 손 입력 공통 형식.

export interface Point3 {
  x: number;
  y: number;
  z: number;
}

export interface Point2 {
  x: number;
  y: number;
}

export interface RawHand {
  /** 정규화 좌표(0~1, 영상 기준) 21점 */
  landmarks: Point3[];
  /** 손 중심 원점, 미터 단위 3D 21점 */
  worldLandmarks: Point3[];
}

export interface HandFrame {
  /** 시각(ms) */
  t: number;
  hands: RawHand[];
  videoSize: { w: number; h: number };
}

export interface HandSource {
  start(): Promise<void>;
  /** 새 프레임이 있으면 돌려준다(같은 영상 프레임은 다시 검사하지 않음) */
  poll(now: number): HandFrame | null;
  stop(): void;
  readonly kind: 'camera' | 'replay';
}
