import { pgTable, varchar, uuid, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { uuidPk } from './_columns';

/* Generic, append-only audit trail shared by every module.
   `changes` holds the field-level diff: { field: { old, new } }.
   actor_id references users.id (resolved to a name at read time). */
export const auditLogs = pgTable('audit_logs', {
  id:          uuidPk(),
  record_type: varchar('record_type', { length: 50 }).notNull(),   // module: 'user' | 'role' | …
  record_id:   uuid('record_id').notNull(),
  action:      varchar('action', { length: 20 }).notNull(),        // 'create' | 'update' | 'delete'
  actor_id:    uuid('actor_id'),
  changes:     jsonb('changes').notNull().default({}),
  created_at:  timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('audit_logs_record_idx').on(t.record_type, t.record_id),
  index('audit_logs_created_idx').on(t.created_at),
  index('audit_logs_actor_idx').on(t.actor_id),
]);

export type AuditLogRow = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
