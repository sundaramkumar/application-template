import { apiFetch } from '@/shared/api/client';
import type { SortRule } from '@/shared/components/ui';
import type { ApiResponse, PaginatedResponse, ListQueryParams, ApiKey, ApiKeyCreateResponse, ApiKeyCreateRequest } from '@shared';

export function listApiKeysApi(params: Omit<ListQueryParams, 'sort' | 'order'> & { sort?: SortRule[] } = {}) {
  const qs = new URLSearchParams();
  if (params.page)         qs.set('page', String(params.page));
  if (params.limit)        qs.set('limit', String(params.limit));
  if (params.sort?.length)  qs.set('sort', params.sort.map(s => `${s.field}:${s.dir}`).join(','));
  if (params.search?.trim()) qs.set('search', params.search.trim());
  const s = qs.toString();
  return apiFetch<PaginatedResponse<ApiKey>>(`/api/apikeys${s ? `?${s}` : ''}`);
}

export function createApiKeyApi(body: ApiKeyCreateRequest) {
  return apiFetch<ApiResponse<ApiKeyCreateResponse>>('/api/apikeys', { method: 'POST', body: JSON.stringify(body) });
}

export function revokeApiKeyApi(id: string) {
  return apiFetch<ApiResponse<ApiKey>>(`/api/apikeys/${id}/revoke`, { method: 'POST' });
}
