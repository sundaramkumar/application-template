import { eq, and, or, ilike, isNull, asc, desc, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import bcrypt from 'bcryptjs';
import { db, withTransaction, type Executor } from '../../db';
import { users } from '../../db/schema/users';
import { roles } from '../../db/schema/roles';
import { notFound, uniqueConflict, forbidden } from '../../lib/errors';
import { isUniqueViolation, uniqueField } from '../../lib/db-errors';
import { buildMeta, type ListQuery } from '../../lib/list-query';
import { buildFilterWhere, type FilterFieldMap } from '../../lib/filter';
import { recordAudit } from '../audit/audit.service';
import type { User, UserCreateRequest, UserUpdateRequest, PaginatedMeta } from '@shared';

const SALT_ROUNDS = 10;

// Self-joins resolving the creator / last editor to a display name.
const creator = alias(users, 'creator');
const updater = alias(users, 'updater');

const userSelect = {
  id:         users.id,
  username:   users.username,
  full_name:  users.full_name,
  email:      users.email,
  status:     users.status,
  role_id:    users.role_id,
  role_name:  roles.name,
  created_at:      users.created_at,
  updated_at:      users.updated_at,
  created_by:      users.created_by,
  created_by_name: creator.full_name,
  updated_by:      users.updated_by,
  updated_by_name: updater.full_name,
};

const SORT_COLUMNS = {
  id:         users.id,
  username:   users.username,
  full_name:  users.full_name,
  email:      users.email,
  status:     users.status,
  role_name:  roles.name,
  created_at:      users.created_at,
  updated_at:      users.updated_at,
  created_by_name: creator.full_name,
  updated_by_name: updater.full_name,
} as const;

// Whitelist of columns the advanced filter may target (anything else is dropped).
const FILTER_FIELDS: FilterFieldMap = {
  username:   { column: users.username,  type: 'text' },
  full_name:  { column: users.full_name, type: 'text' },
  email:      { column: users.email,     type: 'text' },
  status:     { column: users.status,    type: 'text' },
  role_name:  { column: roles.name,      type: 'text' },
  created_at: { column: users.created_at, type: 'date' },
  updated_at: { column: users.updated_at, type: 'date' },
  created_by_name: { column: creator.full_name, type: 'text' },
  updated_by_name: { column: updater.full_name, type: 'text' },
};

type UserRow = {
  id: string; username: string; full_name: string; email: string;
  status: 'active' | 'inactive'; role_id: string | null; role_name: string | null;
  created_at: Date | string | null; updated_at: Date | string | null;
  created_by: string | null; created_by_name: string | null;
  updated_by: string | null; updated_by_name: string | null;
};

function toIso(v: Date | string | null): string | null {
  if (!v) return null;
  return v instanceof Date ? v.toISOString() : String(v);
}

function mapUser(row: UserRow): User {
  return {
    id: row.id, username: row.username, full_name: row.full_name, email: row.email,
    status: row.status, role_id: row.role_id, role_name: row.role_name,
    created_at: toIso(row.created_at), updated_at: toIso(row.updated_at),
    created_by: row.created_by, created_by_name: row.created_by_name,
    updated_by: row.updated_by, updated_by_name: row.updated_by_name,
  };
}

function conflictField(err: unknown): string {
  return uniqueField(err, ['email', 'username'], 'username');
}

/** Anti-escalation: a non-admin may not assign a user to an admin-type role. */
async function assertCanAssignRole(exec: Executor, roleId: string | null | undefined, actorIsAdmin: boolean): Promise<void> {
  if (roleId == null || actorIsAdmin) return;
  const [r] = await exec.select({ type: roles.type }).from(roles).where(eq(roles.id, roleId)).limit(1);
  if (r?.type === 'admin') throw forbidden('Only admins can assign an admin role');
}

async function fetchUserById(exec: Executor, id: string): Promise<User> {
  const [row] = await exec
    .select(userSelect).from(users)
    .leftJoin(roles, eq(users.role_id, roles.id))
    .leftJoin(creator, eq(users.created_by, creator.id))
    .leftJoin(updater, eq(users.updated_by, updater.id))
    .where(and(eq(users.id, id), isNull(users.deleted_at)))
    .limit(1);
  if (!row) throw notFound('User');
  return mapUser(row);
}

export async function listUsers(q: ListQuery): Promise<{ data: User[]; meta: PaginatedMeta }> {
  const filters = [isNull(users.deleted_at)];
  if (q.search) {
    filters.push(or(
      ilike(users.username, `%${q.search}%`),
      ilike(users.full_name, `%${q.search}%`),
      ilike(users.email, `%${q.search}%`),
    )!);
  }
  const advanced = buildFilterWhere(q.filter, FILTER_FIELDS);
  if (advanced) filters.push(advanced);
  const where = and(...filters);

  const orderBy = q.sorts
    .filter(s => SORT_COLUMNS[s.field as keyof typeof SORT_COLUMNS])
    .map(s => {
      const col = SORT_COLUMNS[s.field as keyof typeof SORT_COLUMNS];
      return s.dir === 'asc' ? asc(col) : desc(col);
    });
  if (orderBy.length === 0) orderBy.push(asc(users.id));

  // The count query uses the same joins, so role / created-by / updated-by filters resolve there too.
  const [rows, [{ total }]] = await Promise.all([
    db.select(userSelect).from(users)
      .leftJoin(roles, eq(users.role_id, roles.id))
      .leftJoin(creator, eq(users.created_by, creator.id))
      .leftJoin(updater, eq(users.updated_by, updater.id))
      .where(where).orderBy(...orderBy).limit(q.limit).offset(q.offset),
    db.select({ total: sql<number>`count(*)::int` }).from(users)
      .leftJoin(roles, eq(users.role_id, roles.id))
      .leftJoin(creator, eq(users.created_by, creator.id))
      .leftJoin(updater, eq(users.updated_by, updater.id))
      .where(where),
  ]);

  return { data: rows.map(mapUser), meta: buildMeta(total, q.page, q.limit) };
}

export function getUserById(id: string): Promise<User> {
  return fetchUserById(db, id);
}

export async function createUser(input: UserCreateRequest, actorId: string | null, actorIsAdmin: boolean): Promise<User> {
  const password_hash = await bcrypt.hash(input.password, SALT_ROUNDS);
  try {
    return await withTransaction(async (tx) => {
      await assertCanAssignRole(tx, input.role_id, actorIsAdmin);
      const [row] = await tx.insert(users).values({
        username:      input.username.trim(),
        password_hash,
        full_name:     input.full_name.trim(),
        email:         input.email.trim().toLowerCase(),
        status:        input.status ?? 'active',
        role_id:       input.role_id ?? null,
        created_by:    actorId,
        updated_by:    actorId,
      }).returning({ id: users.id });
      const created = await fetchUserById(tx, row.id);
      await recordAudit(tx, { recordType: 'user', recordId: created.id, action: 'create', actorId, after: created });
      return created;
    });
  } catch (err) {
    if (isUniqueViolation(err)) throw uniqueConflict(`A user with this ${conflictField(err)} already exists`, conflictField(err));
    throw err;
  }
}

export async function updateUser(id: string, input: UserUpdateRequest, actorId: string | null, actorIsAdmin: boolean): Promise<User> {
  const set: Partial<typeof users.$inferInsert> = { updated_by: actorId };
  if (input.username  !== undefined) set.username  = input.username.trim();
  if (input.full_name !== undefined) set.full_name = input.full_name.trim();
  if (input.email     !== undefined) set.email     = input.email.trim().toLowerCase();
  if (input.status    !== undefined) set.status    = input.status;
  if (input.role_id   !== undefined) set.role_id   = input.role_id;
  if (input.password) set.password_hash = await bcrypt.hash(input.password, SALT_ROUNDS);

  try {
    return await withTransaction(async (tx) => {
      if (input.role_id !== undefined) await assertCanAssignRole(tx, input.role_id, actorIsAdmin);
      const before = await fetchUserById(tx, id);
      const [row] = await tx.update(users).set(set)
        .where(and(eq(users.id, id), isNull(users.deleted_at)))
        .returning({ id: users.id });
      if (!row) throw notFound('User');
      const after = await fetchUserById(tx, row.id);
      await recordAudit(tx, { recordType: 'user', recordId: id, action: 'update', actorId, before, after });
      return after;
    });
  } catch (err) {
    if (isUniqueViolation(err)) throw uniqueConflict(`A user with this ${conflictField(err)} already exists`, conflictField(err));
    throw err;
  }
}

export async function deleteUser(id: string, actorId: string | null): Promise<void> {
  await withTransaction(async (tx) => {
    const before = await fetchUserById(tx, id);  // throws notFound if absent
    await tx.update(users)
      .set({ deleted_at: new Date(), updated_by: actorId })
      .where(and(eq(users.id, id), isNull(users.deleted_at)));
    await recordAudit(tx, { recordType: 'user', recordId: id, action: 'delete', actorId, before });
  });
}
