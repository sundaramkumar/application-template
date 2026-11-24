import { pgTable, varchar, timestamp, uuid, boolean, uniqueIndex } from 'drizzle-orm/pg-core';
import { uuidPk } from './_columns';
import { sql } from 'drizzle-orm';

// Role master. Soft-deleted (deleted_at); uniqueness enforced only over live rows.
export const roles = pgTable('roles', {
  id:         uuidPk(),
  name:       varchar('name', { length: 50 }).notNull(),
  type:       varchar('type', { length: 20 }).notNull().default('user'),  // 'admin' | 'user'
  is_system:  boolean('is_system').notNull().default(false),              // built-in, protected
  created_by: uuid('created_by'),
  updated_by: uuid('updated_by'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
  deleted_at: timestamp('deleted_at'),
}, (t) => [
  uniqueIndex('roles_name_active_unique').on(t.name).where(sql`${t.deleted_at} is null`),
]);

export type Role    = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;
