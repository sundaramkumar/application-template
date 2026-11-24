import { eq, inArray, type SQL } from 'drizzle-orm';
import type { AnyColumn } from 'drizzle-orm';
import { isOwnableModule, type UserPermissions } from '@shared';

/* Data-scope filter for list/record queries. Only meaningful for OWNABLE modules
   (those with an owner_id). admin / 'all' ⇒ no filter; 'own' ⇒ owner = me;
   'role' ⇒ owner in the set of users sharing my role. */
export function scopeCondition(
  perms: UserPermissions,
  module: string,
  ownerCol: AnyColumn,
  userId: string,
  sameRoleUserIds: string[],
): SQL | undefined {
  if (perms.isAdmin) return undefined;
  if (!isOwnableModule(module)) return undefined;          // scope N/A for admin modules
  const scope = perms.modules[module]?.scope ?? 'own';
  if (scope === 'all') return undefined;
  if (scope === 'own') return eq(ownerCol, userId);
  return inArray(ownerCol, sameRoleUserIds.length ? sameRoleUserIds : [userId]);
}
