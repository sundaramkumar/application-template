import type { MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import { jwtVerify } from 'jose';
import { env } from '../config/env';
import { unauthorized, forbidden } from '../lib/errors';
import { isUuid } from '../lib/ids';
import type { JwtPayload } from '../types/hono.types';

const secret = new TextEncoder().encode(env.JWT_SECRET);

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  // Skip if already authenticated (e.g. by API key middleware)
  if (c.get('user')) return next();

  const token = getCookie(c, 'app_token');
  if (!token) throw unauthorized();

  let payload: JwtPayload;
  try {
    payload = (await jwtVerify(token, secret)).payload as unknown as JwtPayload;
  } catch {
    throw unauthorized('Invalid or expired token');
  }
  // User ids are UUIDs; a token minted before that change (numeric sub) must re-login.
  if (!isUuid(payload.sub)) throw unauthorized('Session expired — please sign in again');
  c.set('user', payload);

  await next();
};

/** Allow the request only if the user's role is one of `roles`. Runs after
    authMiddleware. Throws a proper AppError (403) so the global handler formats
    it. Interim measure until the scope/permission-based RBAC lands. */
export const requireRole = (...roles: string[]): MiddlewareHandler => async (c, next) => {
  const user = c.get('user') as JwtPayload | undefined;
  if (!user) throw unauthorized();
  if (!user.role || !roles.includes(user.role)) throw forbidden('Insufficient permissions');
  await next();
};
