import { apiFetch } from '@/shared/api/client';
import type { SortRule } from '@/shared/components/ui';
import type { ApiResponse, PaginatedResponse, ListQueryParams, FilterConfig, User, UserCreateRequest, UserUpdateRequest } from '@shared';

export function listUsersApi(params: Omit<ListQueryParams, 'sort' | 'order'> & { filter?: FilterConfig; sort?: SortRule[] } = {}) {
  const qs = new URLSearchParams();
  if (params.page)        qs.set('page', String(params.page));
  if (params.limit)       qs.set('limit', String(params.limit));
  if (params.sort?.length) qs.set('sort', params.sort.map(s => `${s.field}:${s.dir}`).join(','));
  if (params.search?.trim()) qs.set('search', params.search.trim());
  if (params.filter?.groups.length) qs.set('filters', JSON.stringify(params.filter));
  const s = qs.toString();
  return apiFetch<PaginatedResponse<User>>(`/api/users${s ? `?${s}` : ''}`);
}

export function getUserApi(id: string) {
  return apiFetch<ApiResponse<User>>(`/api/users/${id}`);
}

export function createUserApi(body: UserCreateRequest) {
  return apiFetch<ApiResponse<User>>('/api/users', { method: 'POST', body: JSON.stringify(body) });
}

export function updateUserApi(id: string, body: UserUpdateRequest) {
  return apiFetch<ApiResponse<User>>(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export function deleteUserApi(id: string) {
  return apiFetch<void>(`/api/users/${id}`, { method: 'DELETE' });
}
