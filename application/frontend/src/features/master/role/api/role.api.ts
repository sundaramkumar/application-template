import { apiFetch } from '@/shared/api/client';
import type { SortRule } from '@/shared/components/ui';
import type { ApiResponse, PaginatedResponse, ListQueryParams, FilterConfig, Role, RoleCreateRequest, RoleUpdateRequest, RolePermissionRow } from '@shared';

export function getRolePermissionsApi(id: string) {
  return apiFetch<ApiResponse<RolePermissionRow[]>>(`/api/roles/${id}/permissions`);
}

export function setRolePermissionsApi(id: string, permissions: RolePermissionRow[]) {
  return apiFetch<ApiResponse<RolePermissionRow[]>>(`/api/roles/${id}/permissions`, {
    method: 'PATCH',
    body: JSON.stringify({ permissions }),
  });
}

export function listRolesApi(params: Omit<ListQueryParams, 'sort' | 'order'> & { filter?: FilterConfig; sort?: SortRule[] } = {}) {
  const qs = new URLSearchParams();
  if (params.page)        qs.set('page', String(params.page));
  if (params.limit)       qs.set('limit', String(params.limit));
  if (params.sort?.length) qs.set('sort', params.sort.map(s => `${s.field}:${s.dir}`).join(','));
  if (params.search?.trim()) qs.set('search', params.search.trim());
  if (params.filter?.groups.length) qs.set('filters', JSON.stringify(params.filter));
  const s = qs.toString();
  return apiFetch<PaginatedResponse<Role>>(`/api/roles${s ? `?${s}` : ''}`);
}

export function getRoleApi(id: string) {
  return apiFetch<ApiResponse<Role>>(`/api/roles/${id}`);
}

export function createRoleApi(body: RoleCreateRequest) {
  return apiFetch<ApiResponse<Role>>('/api/roles', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateRoleApi(id: string, body: RoleUpdateRequest) {
  return apiFetch<ApiResponse<Role>>(`/api/roles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deleteRoleApi(id: string) {
  return apiFetch<void>(`/api/roles/${id}`, { method: 'DELETE' });
}
