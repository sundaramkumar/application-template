import type { MiddlewareHandler } from 'hono';
import { unauthorized, forbidden } from '../lib/errors';
import { resolveUserPermissions } from '../lib/permissions';
import { isUuid } from '../lib/ids';
import type { JwtPayload } from '../types/hono.types';
import type { UserPermissions, PermissionAction } from '@shared';

/** Resolve the principal's permissions once per request and stash on context.
    Runs after authMiddleware; no-op for unauthenticated/public requests. */
export const withPermissions: MiddlewareHandler = async (c, next) => {
  // An API key already resolved the bound role's permissions — don't overwrite.
  if (c.get('perms')) return next();
  const user = c.get('user') as JwtPayload | undefined;
  if (user) c.set('perms', isUuid(user.sub) ? await resolveUserPermissions(user.sub) : { isAdmin: false, modules: {} });
  await next();
};

/** Gate a route by a module action. admin role type bypasses all checks. */
export const requirePermission = (module: string, action: PermissionAction): MiddlewareHandler =>
  async (c, next) => {
    const perms = c.get('perms') as UserPermissions | undefined;
    if (!perms) throw unauthorized();
    if (perms.isAdmin || perms.modules[module]?.[action]) return next();
    throw forbidden('Insufficient permissions');
  };
