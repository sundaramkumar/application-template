import { apiFetch } from '@/shared/api/client';
import type { ApiResponse, AuthUser, AuthLoginResponse, UserPermissions } from '@shared';

export function loginApi(username: string, password: string) {
  return apiFetch<ApiResponse<AuthLoginResponse>>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function getMeApi() {
  return apiFetch<ApiResponse<AuthUser>>('/api/auth/me');
}

export function getPermissionsApi() {
  return apiFetch<ApiResponse<UserPermissions>>('/api/auth/permissions');
}

export function logoutApi() {
  return apiFetch<ApiResponse<{ message: string }>>('/api/auth/logout', { method: 'POST' });
}
