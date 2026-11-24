import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users } from '../db/schema/users';
import { roles } from '../db/schema/roles';
import { rolePermissions } from '../db/schema/role_permissions';
import type { UserPermissions, ModulePermission, RecordScope } from '@shared';

/* Permissions are resolved server-side per request (token carries identity only).
   The role→permission map is cached by role_id and invalidated when a role's
   permissions change, so edits/reassignment take effect on the next request with
   no re-login. A short TTL is a safety net. */
interface Cached { perms: UserPermissions; at: number }
const TTL_MS = 60_000;
const cacheByRole = new Map<string, Cached>();

export function invalidateRolePermissions(roleId?: string): void {
  if (roleId === undefined) cacheByRole.clear();
  else cacheByRole.delete(roleId);
}

async function loadByRole(roleId: string, isAdmin: boolean): Promise<UserPermissions> {
  const hit = cacheByRole.get(roleId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.perms;

  const rows = await db.select().from(rolePermissions).where(eq(rolePermissions.role_id, roleId));
  const modules: Record<string, ModulePermission> = {};
  for (const r of rows) {
    modules[r.module] = {
      read: r.can_read, create: r.can_create, update: r.can_update, delete: r.can_delete,
      scope: r.scope as RecordScope,
    };
  }
  const perms: UserPermissions = { isAdmin, modules };
  cacheByRole.set(roleId, { perms, at: Date.now() });
  return perms;
}

/** Resolve permissions for a principal that carries a role (cookie user or, later,
    an API key). admin role type ⇒ full bypass (isAdmin). */
export async function resolveRolePermissions(roleId: string | null, type: string | null): Promise<UserPermissions> {
  if (roleId == null) return { isAdmin: false, modules: {} };
  return loadByRole(roleId, type === 'admin');
}

/** Resolve permissions for a logged-in user by their CURRENT role (one indexed lookup). */
export async function resolveUserPermissions(userId: string): Promise<UserPermissions> {
  const [u] = await db
    .select({ role_id: users.role_id, type: roles.type })
    .from(users).leftJoin(roles, eq(users.role_id, roles.id))
    .where(eq(users.id, userId)).limit(1);
  if (!u) return { isAdmin: false, modules: {} };
  return resolveRolePermissions(u.role_id, u.type);
}
