// spec 8.2: 오류 분류 → 한국어 문구.
import { ERROR_MESSAGES, type ErrorKind } from '../ui/strings.ts';

export type { ErrorKind };

/** 오류 화면에 보여 줄 정보: 분류와 원래 오류 이름(교사가 물어볼 때 도움) */
export interface AppError {
  kind: ErrorKind;
  name: string;
}

export function errorMessage(kind: ErrorKind): string {
  return ERROR_MESSAGES[kind];
}

/** getUserMedia가 낸 오류 → 분류 */
export function classifyCameraError(err: unknown): AppError {
  const name =
    err && typeof err === 'object' && 'name' in err && typeof (err as { name: unknown }).name === 'string'
      ? (err as { name: string }).name
      : 'Error';
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
    case 'PermissionDeniedError':
      return { kind: 'denied', name };
    case 'NotFoundError':
    case 'OverconstrainedError':
    case 'DevicesNotFoundError':
      return { kind: 'notfound', name };
    case 'NotReadableError':
    case 'AbortError':
    case 'TrackStartError':
    case 'TrackEnded':
      return { kind: 'busy', name };
    case 'InsecureContext':
      return { kind: 'insecure', name };
    case 'DownloadError':
      return { kind: 'download', name };
    case 'InitError':
      return { kind: 'init', name };
    default:
      return { kind: 'other', name };
  }
}

/** 이름이 붙은 오류를 만든다(모델 받기 실패 등 우리 쪽 오류용) */
export function namedError(name: 'DownloadError' | 'InitError' | 'InsecureContext', message: string): Error {
  const e = new Error(message);
  e.name = name;
  return e;
}
