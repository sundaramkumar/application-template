import type { MiddlewareHandler } from 'hono';
import { unauthorized } from '../lib/errors';
import { resolveApiKey } from '../features/apikeys/apikey.service';
import { resolveRolePermissions } from '../lib/permissions';
import type { JwtPayload } from '../types/hono.types';

/** Extract a presented API key from the request, if any.
    Supports `Authorization: Bearer app_…` and the `X-API-Key` header. */
function presentedKey(c: Parameters<MiddlewareHandler>[0]): string | null {
  const auth = c.req.header('authorization');
  if (auth?.startsWith('Bearer ') && auth.slice(7).startsWith('app_')) return auth.slice(7).trim();
  const x = c.req.header('x-api-key');
  if (x?.startsWith('app_')) return x.trim();
  return null;
}

/* Authenticates programmatic callers via API key. Runs BEFORE authMiddleware:
   - No key header  → fall through (cookie/session auth handles it).
   - Valid key      → set a synthetic principal + the bound role's permissions,
                      so downstream requirePermission gates apply unchanged.
   - Invalid/expired/revoked key → 401 (don't silently fall through). */
export const apiKeyMiddleware: MiddlewareHandler = async (c, next) => {
  const presented = presentedKey(c);
  if (!presented) return next();

  const resolved = await resolveApiKey(presented);
  if (!resolved) throw unauthorized('Invalid or expired API key');

  const principal: JwtPayload = {
    sub:      resolved.created_by ?? '',
    username: 'apikey',
    name:     `API: ${resolved.name}`,
    role:     resolved.role_name,
  };
  c.set('user', principal);
  c.set('perms', await resolveRolePermissions(resolved.role_id, resolved.role_type));

  await next();
};
