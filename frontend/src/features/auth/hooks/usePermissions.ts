import { useQuery } from '@tanstack/react-query';
import { getPermissionsApi } from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';
import type { UserPermissions, PermissionAction, RecordScope } from '@shared';

const EMPTY: UserPermissions = { isAdmin: false, modules: {} };

/** Current principal's permissions (resolved server-side). UX-only: the backend
    stays authoritative. Short staleTime + focus refetch so changes surface fast. */
export function usePermissions() {
  const user = useAuthStore(s => s.user);
  const { data, isLoading } = useQuery({
    queryKey: ['me', 'permissions'],
    queryFn:  () => getPermissionsApi(),
    enabled:  !!user,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
  const perms = data?.data ?? EMPTY;

  return {
    isAdmin: perms.isAdmin,
    loaded:  !!data,
    isLoading,
    can: (module: string, action: PermissionAction): boolean =>
      perms.isAdmin || !!perms.modules[module]?.[action],
    scope: (module: string): RecordScope => perms.modules[module]?.scope ?? 'all',
  };
}
