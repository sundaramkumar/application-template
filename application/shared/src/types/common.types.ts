/* ── Envelope ─────────────────────────────────────────────────────── */

export interface ApiResponse<T> {
  success: true;
  data:    T;
}

export interface ApiError {
  success: false;
  error: {
    code:     string;
    message:  string;
    details?: unknown;
  };
}

export interface PaginatedMeta {
  page:       number;
  limit:      number;
  total:      number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  success: true;
  data:    T[];
  meta:    PaginatedMeta;
}

/* ── Filtering ────────────────────────────────────────────────────── */

export type FilterOperator =
  | 'eq' | 'neq'
  | 'contains' | 'starts_with' | 'ends_with'
  | 'gt' | 'gte' | 'lt' | 'lte'
  | 'is_empty' | 'not_empty';

export interface FilterParam {
  field:  string;
  op:     FilterOperator;
  value?: string | number;
}

export interface FilterGroup {
  id:         string;
  logic:      'and' | 'or';
  conditions: FilterParam[];
}

export interface FilterConfig {
  groupLogic: 'and' | 'or';
  groups:     FilterGroup[];
}

/* ── Pagination query ─────────────────────────────────────────────── */

export interface ListQueryParams {
  page?:   number;
  limit?:  number;
  sort?:   string;
  order?:  'asc' | 'desc';
  search?: string;
}
