export interface PaginationMeta {
  total: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

// Generic API envelope — used by every endpoint, backend and frontend agree on this shape
export type ApiResult<T> =
  | { ok: true; data: T; pagination?: PaginationMeta }
  | { ok: false; error: { code: string; message: string; details?: unknown } };
