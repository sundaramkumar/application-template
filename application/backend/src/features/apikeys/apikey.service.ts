import { eq, and, ilike, asc, desc, sql, isNull, gt, or } from 'drizzle-orm';
import { db, withTransaction, type Executor } from '../../db';
import { apiKeys } from '../../db/schema/api_keys';
import { roles } from '../../db/schema/roles';
import { notFound, badRequest } from '../../lib/errors';
import { buildMeta, type ListQuery } from '../../lib/list-query';
import { generateKey, hashKey } from '../../lib/apikey';
import { recordAudit } from '../audit/audit.service';
import type { ApiKey, ApiKeyCreateResponse, ApiKeyCreateRequest, PaginatedMeta } from '@shared';

const keySelect = {
  id:           apiKeys.id,
  name:         apiKeys.name,
  prefix:       apiKeys.prefix,
  role_id:      apiKeys.role_id,
  role_name:    roles.name,
  active:       apiKeys.active,
  expires_at:   apiKeys.expires_at,
  last_used_at: apiKeys.last_used_at,
  created_at:   apiKeys.created_at,
  revoked_at:   apiKeys.revoked_at,
};

const SORT_COLUMNS = {
  id:           apiKeys.id,
  name:         apiKeys.name,
  created_at:   apiKeys.created_at,
  last_used_at: apiKeys.last_used_at,
  expires_at:   apiKeys.expires_at,
} as const;

type KeyRow = {
  id: string; name: string; prefix: string; role_id: string; role_name: string | null;
  active: boolean; expires_at: Date | string | null; last_used_at: Date | string | null;
  created_at: Date | string | null; revoked_at: Date | string | null;
};

function toIso(v: Date | string | null): string | null {
  if (!v) return null;
  return v instanceof Date ? v.toISOString() : String(v);
}

function mapKey(r: KeyRow): ApiKey {
  return {
    id: r.id, name: r.name, prefix: r.prefix, role_id: r.role_id, role_name: r.role_name,
    active: r.active, expires_at: toIso(r.expires_at), last_used_at: toIso(r.last_used_at),
    created_at: toIso(r.created_at), revoked_at: toIso(r.revoked_at),
  };
}

export async function listApiKeys(q: ListQuery): Promise<{ data: ApiKey[]; meta: PaginatedMeta }> {
  const filters = [];
  if (q.search) filters.push(ilike(apiKeys.name, `%${q.search}%`));
  const where = filters.length ? and(...filters) : undefined;

  const orderBy = q.sorts
    .filter(s => SORT_COLUMNS[s.field as keyof typeof SORT_COLUMNS])
    .map(s => {
      const col = SORT_COLUMNS[s.field as keyof typeof SORT_COLUMNS];
      return s.dir === 'asc' ? asc(col) : desc(col);
    });
  if (orderBy.length === 0) orderBy.push(desc(apiKeys.created_at));

  const [rows, [{ total }]] = await Promise.all([
    db.select(keySelect).from(apiKeys)
      .leftJoin(roles, eq(apiKeys.role_id, roles.id))
      .where(where).orderBy(...orderBy).limit(q.limit).offset(q.offset),
    db.select({ total: sql<number>`count(*)::int` }).from(apiKeys).where(where),
  ]);

  return { data: rows.map(mapKey), meta: buildMeta(total, q.page, q.limit) };
}

async function fetchKeyById(exec: Executor, id: string): Promise<ApiKey> {
  const [row] = await exec.select(keySelect).from(apiKeys)
    .leftJoin(roles, eq(apiKeys.role_id, roles.id))
    .where(eq(apiKeys.id, id)).limit(1);
  if (!row) throw notFound('API key');
  return mapKey(row);
}

export async function createApiKey(input: ApiKeyCreateRequest, actorId: string | null): Promise<ApiKeyCreateResponse> {
  // The bound role must exist and be live.
  const [role] = await db.select({ id: roles.id }).from(roles)
    .where(and(eq(roles.id, input.role_id), isNull(roles.deleted_at))).limit(1);
  if (!role) throw badRequest('Selected role does not exist');

  const { key, prefix, hash } = generateKey();
  const expires_at = input.expires_at ? new Date(input.expires_at) : null;
  if (expires_at && Number.isNaN(expires_at.getTime())) throw badRequest('Invalid expiry date');

  const created = await withTransaction(async (tx) => {
    const [row] = await tx.insert(apiKeys).values({
      name: input.name.trim(), prefix, key_hash: hash, role_id: input.role_id,
      expires_at, created_by: actorId,
    }).returning({ id: apiKeys.id });
    const full = await fetchKeyById(tx, row.id);
    await recordAudit(tx, { recordType: 'apikey', recordId: full.id, action: 'create', actorId,
      after: { name: full.name, role_name: full.role_name, expires_at: full.expires_at } });
    return full;
  });

  return { ...created, key };   // plaintext returned once
}

export async function revokeApiKey(id: string, actorId: string | null): Promise<ApiKey> {
  return withTransaction(async (tx) => {
    const before = await fetchKeyById(tx, id);  // 404 if missing
    if (!before.active) throw badRequest('API key is already revoked');
    await tx.update(apiKeys)
      .set({ active: false, revoked_at: new Date() })
      .where(eq(apiKeys.id, id));
    const after = await fetchKeyById(tx, id);
    await recordAudit(tx, { recordType: 'apikey', recordId: id, action: 'delete', actorId,
      before: { name: before.name, role_name: before.role_name } });
    return after;
  });
}

/* ── Authentication ──────────────────────────────────────────────── */
export interface ResolvedKey {
  keyId:      string;
  name:       string;
  role_id:    string;
  role_type:  string | null;
  role_name:  string | null;
  created_by: string | null;
}

/** Resolve a presented key to its principal, or null if not a valid active key.
    Updates last_used_at (throttled to ~once/minute). */
export async function resolveApiKey(presented: string): Promise<ResolvedKey | null> {
  const hash = hashKey(presented);
  const [row] = await db
    .select({
      id: apiKeys.id, name: apiKeys.name, role_id: apiKeys.role_id,
      role_type: roles.type, role_name: roles.name, created_by: apiKeys.created_by,
      last_used_at: apiKeys.last_used_at,
    })
    .from(apiKeys)
    .leftJoin(roles, eq(apiKeys.role_id, roles.id))
    .where(and(
      eq(apiKeys.key_hash, hash),
      eq(apiKeys.active, true),
      isNull(apiKeys.revoked_at),
      or(isNull(apiKeys.expires_at), gt(apiKeys.expires_at, sql`now()`)),
      isNull(roles.deleted_at),
    ))
    .limit(1);
  if (!row) return null;

  // Throttle last_used_at writes to keep hot keys from hammering the row.
  const last = row.last_used_at ? new Date(row.last_used_at).getTime() : 0;
  if (Date.now() - last > 60_000) {
    await db.update(apiKeys).set({ last_used_at: new Date() }).where(eq(apiKeys.id, row.id));
  }

  return {
    keyId: row.id, name: row.name, role_id: row.role_id,
    role_type: row.role_type, role_name: row.role_name, created_by: row.created_by,
  };
}
