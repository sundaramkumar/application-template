import { eq, and, lt, gte, lte, asc, desc, sql, type SQL } from 'drizzle-orm';
import { db, type Executor } from '../../db';
import { auditLogs } from '../../db/schema/audit';
import { users } from '../../db/schema/users';
import { buildMeta, type ListQuery } from '../../lib/list-query';
import type { AuditAction, AuditLog, AuditChange, PaginatedMeta } from '@shared';

/* Fields never worth auditing (noise, sensitive, or DB ids whose human-readable
   counterpart is audited instead — e.g. role_id → role_name). */
const SKIP = new Set([
  'id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at',
  'role_id', 'password', 'password_hash', 'created_by_name', 'updated_by_name',
]);

type Snapshot = Record<string, unknown> | null | undefined;

function diff(action: AuditAction, before: Snapshot, after: Snapshot): Record<string, AuditChange> {
  const changes: Record<string, AuditChange> = {};
  if (action === 'create' && after) {
    for (const [k, v] of Object.entries(after)) {
      if (SKIP.has(k) || v === undefined || v === null) continue;
      changes[k] = { old: null, new: v };
    }
  } else if (action === 'update' && before && after) {
    for (const k of Object.keys(after)) {
      if (SKIP.has(k)) continue;
      const o = before[k] ?? null, n = after[k] ?? null;
      if (JSON.stringify(o) !== JSON.stringify(n)) changes[k] = { old: o, new: n };
    }
  }
  // delete → no field diff (the action itself is the record)
  return changes;
}

/** Record one audit entry inside the caller's transaction. Skips no-op updates.
    `before`/`after` accept any domain object (e.g. User, Role). */
export async function recordAudit(exec: Executor, opts: {
  recordType: string;
  recordId:   string;
  action:     AuditAction;
  actorId:    string | null;
  before?:    object | null;
  after?:     object | null;
}): Promise<void> {
  const changes = diff(opts.action, opts.before as Snapshot, opts.after as Snapshot);
  if (opts.action === 'update' && Object.keys(changes).length === 0) return;
  await exec.insert(auditLogs).values({
    record_type: opts.recordType,
    record_id:   opts.recordId,
    action:      opts.action,
    actor_id:    opts.actorId,
    changes,
  });
}

/* ── Reading ─────────────────────────────────────────────────────── */
const SORT_COLUMNS = {
  created_at:  auditLogs.created_at,
  record_type: auditLogs.record_type,
  record_id:   auditLogs.record_id,
  action:      auditLogs.action,
  id:          auditLogs.id,
} as const;

export interface AuditFilters {
  recordType?: string;
  recordId?:   string;
  action?:     string;
  actorId?:    string;
  from?:       string;   // ISO date — created_at >=
  to?:         string;   // ISO date — created_at <=
}

function mapRow(r: { id: string; record_type: string; record_id: string; action: string; actor_id: string | null; actor_name: string | null; changes: unknown; created_at: Date | string | null }): AuditLog {
  return {
    id: r.id, record_type: r.record_type, record_id: r.record_id,
    action: r.action as AuditAction, actor_id: r.actor_id, actor_name: r.actor_name,
    changes: (r.changes ?? {}) as AuditLog['changes'],
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : (r.created_at ?? null),
  };
}

export async function listAudit(q: ListQuery, f: AuditFilters): Promise<{ data: AuditLog[]; meta: PaginatedMeta }> {
  const filters: SQL[] = [];
  if (f.recordType) filters.push(eq(auditLogs.record_type, f.recordType));
  if (f.recordId !== undefined)  filters.push(eq(auditLogs.record_id, f.recordId));
  if (f.action)     filters.push(eq(auditLogs.action, f.action));
  if (f.actorId !== undefined)   filters.push(eq(auditLogs.actor_id, f.actorId));
  if (f.from)       filters.push(gte(auditLogs.created_at, new Date(f.from)));
  if (f.to)         filters.push(lte(auditLogs.created_at, new Date(f.to)));
  const where = filters.length ? and(...filters) : undefined;

  const orderBy = q.sorts
    .filter(s => SORT_COLUMNS[s.field as keyof typeof SORT_COLUMNS])
    .map(s => {
      const col = SORT_COLUMNS[s.field as keyof typeof SORT_COLUMNS];
      return s.dir === 'asc' ? asc(col) : desc(col);
    });
  if (orderBy.length === 0) orderBy.push(desc(auditLogs.created_at));

  const [rows, [{ total }]] = await Promise.all([
    db.select({
      id: auditLogs.id, record_type: auditLogs.record_type, record_id: auditLogs.record_id,
      action: auditLogs.action, actor_id: auditLogs.actor_id, actor_name: users.full_name,
      changes: auditLogs.changes, created_at: auditLogs.created_at,
    }).from(auditLogs)
      .leftJoin(users, eq(auditLogs.actor_id, users.id))
      .where(where).orderBy(...orderBy).limit(q.limit).offset(q.offset),
    db.select({ total: sql<number>`count(*)::int` }).from(auditLogs).where(where),
  ]);

  return { data: rows.map(mapRow), meta: buildMeta(total, q.page, q.limit) };
}

/** Manual purge: delete logs older than N days, optionally limited to one module. */
export async function purgeAudit(opts: { olderThanDays: number; recordType?: string }): Promise<{ deleted: number }> {
  const cutoff = sql`now() - (${opts.olderThanDays} || ' days')::interval`;
  const where = opts.recordType
    ? and(lt(auditLogs.created_at, cutoff), eq(auditLogs.record_type, opts.recordType))
    : lt(auditLogs.created_at, cutoff);
  const rows = await db.delete(auditLogs).where(where).returning({ id: auditLogs.id });
  return { deleted: rows.length };
}
