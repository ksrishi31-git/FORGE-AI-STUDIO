/** Shared API contract types (BAD §5, §12). */

export interface ErrorDetail {
  field: string;
  reason: string;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  request_id?: string;
  path?: string;
  ts?: string;
  details?: ErrorDetail[];
}

/** Standard error envelope returned by the backend for every non-2xx response. */
export interface ApiErrorEnvelope {
  error: ApiErrorBody;
}

/** Paginated list response convention (BAD §5). */
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}
