import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../../db';
import { users } from '../../db/schema/users';
import { roles } from '../../db/schema/roles';
import { env } from '../../config/env';
import { unauthorized } from '../../lib/errors';
import type { AuthUser } from '@shared';

const secret = new TextEncoder().encode(env.JWT_SECRET);
const TOKEN_TTL = '12h';

const userSelect = {
  id:            users.id,
  username:      users.username,
  password_hash: users.password_hash,
  full_name:     users.full_name,
  email:         users.email,
  status:        users.status,
  role_id:       users.role_id,
  role_name:     roles.name,
};

function toAuthUser(row: { id: string; username: string; full_name: string; email: string; status: 'active' | 'inactive'; role_id: string | null; role_name: string | null }): AuthUser {
  return {
    id:        row.id,
    username:  row.username,
    full_name: row.full_name,
    email:     row.email,
    status:    row.status,
    role_id:   row.role_id,
    role_name: row.role_name,
  };
}

export async function login(username: string, password: string): Promise<{ user: AuthUser; token: string }> {
  const [row] = await db
    .select(userSelect)
    .from(users)
    .leftJoin(roles, eq(users.role_id, roles.id))
    .where(and(eq(users.username, username), isNull(users.deleted_at)))
    .limit(1);

  if (!row) throw unauthorized('Invalid username or password');
  if (row.status !== 'active') throw unauthorized('Account is inactive');

  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) throw unauthorized('Invalid username or password');

  const token = await new SignJWT({ username: row.username, name: row.full_name, role: row.role_name })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(row.id))
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(secret);

  return { user: toAuthUser(row), token };
}

export async function getMe(userId: string): Promise<AuthUser> {
  const [row] = await db
    .select(userSelect)
    .from(users)
    .leftJoin(roles, eq(users.role_id, roles.id))
    .where(and(eq(users.id, userId), isNull(users.deleted_at)))
    .limit(1);

  if (!row) throw unauthorized();
  return toAuthUser(row);
}
