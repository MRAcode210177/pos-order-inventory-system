// Generic API envelope — used by every endpoint, backend and frontend agree on this shape
export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; details?: unknown } };
