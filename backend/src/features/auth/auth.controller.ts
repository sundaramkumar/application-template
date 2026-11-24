import type { Context } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import { env } from '../../config/env';
import { ok } from '../../lib/response';
import * as authService from './auth.service';
import { resolveUserPermissions } from '../../lib/permissions';
import type { JwtPayload } from '../../types/hono.types';
import type { AuthLoginRequest } from '@shared';

const COOKIE_NAME = 'app_token';
const COOKIE_MAX_AGE = 60 * 60 * 12; // 12h, matches token TTL

export async function login(c: Context) {
  const { username, password } = c.req.valid('json' as never) as AuthLoginRequest;
  const { user, token } = await authService.login(username, password);

  setCookie(c, COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'Lax',
    secure:   env.NODE_ENV === 'production',
    path:     '/',
    maxAge:   COOKIE_MAX_AGE,
  });

  return ok(c, { user });
}

export async function me(c: Context) {
  const payload = c.get('user') as JwtPayload;
  const user = await authService.getMe(payload.sub);
  return ok(c, user);
}

export async function permissions(c: Context) {
  const payload = c.get('user') as JwtPayload;
  return ok(c, await resolveUserPermissions(payload.sub));
}

export async function logout(c: Context) {
  deleteCookie(c, COOKIE_NAME, { path: '/' });
  return ok(c, { message: 'Logged out' });
}
