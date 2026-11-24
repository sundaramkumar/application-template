import { eq, and, ilike, isNull, asc, desc, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db, withTransaction, type Executor } from '../../db';
import { roles } from '../../db/schema/roles';
import { users } from '../../db/schema/users';
import { notFound, uniqueConflict, badRequest } from '../../lib/errors';
import { isUniqueViolation } from '../../lib/db-errors';
import { buildMeta, type ListQuery } from '../../lib/list-query';
import { buildFilterWhere, type FilterFieldMap } from '../../lib/filter';
import { recordAudit } from '../audit/audit.service';
import { rolePermissions } from '../../db/schema/role_permissions';
import { invalidateRolePermissions } from '../../lib/permissions';
import { summarizePermissions } from '@shared';
import type { Role, RoleCreateRequest, RoleUpdateRequest, PaginatedMeta, RoleType, RecordScope, RolePermissionRow } from '@shared';

// Self-joins resolving the creator / last editor to a display name.
const creator = alias(users, 'creator');
const updater = alias(users, 'updater');

const roleSelect = {
  id:              roles.id,
  name:            roles.name,
  type:            roles.type,
  is_system:       roles.is_system,
  created_at:      roles.created_at,
  updated_at:      roles.updated_at,
  created_by:      roles.created_by,
  created_by_name: creator.full_name,
  updated_by:      roles.updated_by,
  updated_by_name: updater.full_name,
};

const SORT_COLUMNS = {
  id: roles.id, name: roles.name, type: roles.type,
  created_at: roles.created_at, updated_at: roles.updated_at,
  created_by_name: creator.full_name, updated_by_name: updater.full_name,
} as const;

// Whitelist of columns the advanced filter may target.
const FILTER_FIELDS: FilterFieldMap = {
  name:            { column: roles.name,        type: 'text' },
  type:            { column: roles.type,        type: 'text' },
  created_at:      { column: roles.created_at,  type: 'date' },
  updated_at:      { column: roles.updated_at,  type: 'date' },
  created_by_name: { column: creator.full_name, type: 'text' },
  updated_by_name: { column: updater.full_name, type: 'text' },
};

const toIso = (v: Date | string | null | undefined): string | null =>
  v instanceof Date ? v.toISOString() : (v ?? null);

function mapRole(r: {
  id: string; name: string; type?: string; is_system?: boolean;
  created_at: Date | string | null; updated_at?: Date | string | null;
  created_by?: string | null; created_by_name?: string | null;
  updated_by?: string | null; updated_by_name?: string | null;
}): Role {
  return {
    id: r.id, name: r.name,
    type: (r.type as RoleType) ?? 'user',
    is_system: r.is_system ?? false,
    created_at: toIso(r.created_at), updated_at: toIso(r.updated_at),
    created_by: r.created_by ?? null, created_by_name: r.created_by_name ?? null,
    updated_by: r.updated_by ?? null, updated_by_name: r.updated_by_name ?? null,
  };
}

async function fetchRoleById(exec: Executor, id: string): Promise<Role> {
  const [row] = await exec.select(roleSelect).from(roles)
    .leftJoin(creator, eq(roles.created_by, creator.id))
    .leftJoin(updater, eq(roles.updated_by, updater.id))
    .where(and(eq(roles.id, id), isNull(roles.deleted_at)))
    .limit(1);
  if (!row) throw notFound('Role');
  return mapRole(row);
}

export async function listRoles(q: ListQuery): Promise<{ data: Role[]; meta: PaginatedMeta }> {
  const filters = [isNull(roles.deleted_at)];
  if (q.search) filters.push(ilike(roles.name, `%${q.search}%`));
  const advanced = buildFilterWhere(q.filter, FILTER_FIELDS);
  if (advanced) filters.push(advanced);
  const where = and(...filters);

  const orderBy = q.sorts
    .filter(s => SORT_COLUMNS[s.field as keyof typeof SORT_COLUMNS])
    .map(s => {
      const col = SORT_COLUMNS[s.field as keyof typeof SORT_COLUMNS];
      return s.dir === 'asc' ? asc(col) : desc(col);
    });
  if (orderBy.length === 0) orderBy.push(asc(roles.name));

  // Count uses the same joins so created-by / updated-by filters resolve there too.
  const [rows, [{ total }]] = await Promise.all([
    db.select(roleSelect).from(roles)
      .leftJoin(creator, eq(roles.created_by, creator.id))
      .leftJoin(updater, eq(roles.updated_by, updater.id))
      .where(where).orderBy(...orderBy).limit(q.limit).offset(q.offset),
    db.select({ total: sql<number>`count(*)::int` }).from(roles)
      .leftJoin(creator, eq(roles.created_by, creator.id))
      .leftJoin(updater, eq(roles.updated_by, updater.id))
      .where(where),
  ]);

  return { data: rows.map(mapRole), meta: buildMeta(total, q.page, q.limit) };
}

export function getRoleById(id: string): Promise<Role> {
  return fetchRoleById(db, id);
}

export async function createRole(input: RoleCreateRequest, actorId: string | null): Promise<Role> {
  try {
    return await withTransaction(async (tx) => {
      const [row] = await tx.insert(roles)
        .values({ name: input.name.trim(), type: input.type ?? 'user', created_by: actorId, updated_by: actorId })
        .returning({ id: roles.id });
      const created = await fetchRoleById(tx, row.id);
      await recordAudit(tx, { recordType: 'role', recordId: created.id, action: 'create', actorId, after: created });
      return created;
    });
  } catch (err) {
    if (isUniqueViolation(err)) throw uniqueConflict('A role with this name already exists', 'name');
    throw err;
  }
}

export async function updateRole(id: string, input: RoleUpdateRequest, actorId: string | null): Promise<Role> {
  if (input.name === undefined && input.type === undefined) throw badRequest('Nothing to update');
  try {
    const after = await withTransaction(async (tx) => {
      const [beforeRow] = await tx.select().from(roles)
        .where(and(eq(roles.id, id), isNull(roles.deleted_at))).limit(1);
      if (!beforeRow) throw notFound('Role');
      if (beforeRow.is_system) throw badRequest('Built-in roles cannot be modified');
      const set: Partial<typeof roles.$inferInsert> = { updated_by: actorId };
      if (input.name !== undefined) set.name = input.name.trim();
      if (input.type !== undefined) set.type = input.type;
      const [row] = await tx.update(roles)
        .set(set)
        .where(and(eq(roles.id, id), isNull(roles.deleted_at)))
        .returning({ id: roles.id });
      const updated = await fetchRoleById(tx, row.id);
      await recordAudit(tx, { recordType: 'role', recordId: id, action: 'update', actorId, before: mapRole(beforeRow), after: updated });
      return updated;
    });
    invalidateRolePermissions(id);  // type change → re-resolve isAdmin next request
    return after;
  } catch (err) {
    if (isUniqueViolation(err)) throw uniqueConflict('A role with this name already exists', 'name');
    throw err;
  }
}

export async function deleteRole(id: string, actorId: string | null): Promise<void> {
  await withTransaction(async (tx) => {
    const [beforeRow] = await tx.select().from(roles)
      .where(and(eq(roles.id, id), isNull(roles.deleted_at))).limit(1);
    if (!beforeRow) throw notFound('Role');
    if (beforeRow.is_system) throw badRequest('Built-in roles cannot be deleted');

    // Block deletion if any *live* user still references this role.
    const [{ count }] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(and(eq(users.role_id, id), isNull(users.deleted_at)));
    if (count > 0) throw badRequest('Cannot delete a role that is assigned to users');

    await tx.update(roles)
      .set({ deleted_at: new Date(), updated_by: actorId })
      .where(and(eq(roles.id, id), isNull(roles.deleted_at)));
    await recordAudit(tx, { recordType: 'role', recordId: id, action: 'delete', actorId, before: mapRole(beforeRow) });
  });
  invalidateRolePermissions(id);
}

/* ── Permissions matrix ──────────────────────────────────────────── */
export async function getRolePermissions(roleId: string): Promise<RolePermissionRow[]> {
  await getRoleById(roleId); // 404 if missing/deleted
  const rows = await db.select().from(rolePermissions).where(eq(rolePermissions.role_id, roleId));
  return rows.map(r => ({
    module: r.module,
    can_read: r.can_read, can_create: r.can_create, can_update: r.can_update, can_delete: r.can_delete,
    scope: r.scope as RecordScope,
  }));
}

export async function setRolePermissions(roleId: string, perms: RolePermissionRow[], actorId: string | null): Promise<RolePermissionRow[]> {
  await getRoleById(roleId);  // 404 if missing
  // Permissions are editable even for built-in roles (e.g. configure the default
  // "User" role). Only name/type/deletion of built-ins are protected (see above).
  const before = await getRolePermissions(roleId);

  await withTransaction(async (tx) => {
    await tx.delete(rolePermissions).where(eq(rolePermissions.role_id, roleId));
    if (perms.length) {
      await tx.insert(rolePermissions).values(perms.map(p => ({
        role_id:    roleId,
        module:     p.module,
        can_read:   p.can_read,
        can_create: p.can_create,
        can_update: p.can_update,
        can_delete: p.can_delete,
        scope:      p.scope,
      })));
    }
    const beforeSummary = summarizePermissions(before), afterSummary = summarizePermissions(perms);
    // A permission change is a change to the role: stamp updated_by (updated_at follows via $onUpdate).
    if (JSON.stringify(beforeSummary) !== JSON.stringify(afterSummary)) {
      await tx.update(roles).set({ updated_by: actorId }).where(eq(roles.id, roleId));
    }
    await recordAudit(tx, { recordType: 'role', recordId: roleId, action: 'update', actorId, before: { permissions: beforeSummary }, after: { permissions: afterSummary } });
  });

  invalidateRolePermissions(roleId);  // changes take effect on the next request
  return getRolePermissions(roleId);
}
