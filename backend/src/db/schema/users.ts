import { pgTable, varchar, timestamp, uuid, pgEnum, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { uuidPk } from './_columns';
import { sql } from 'drizzle-orm';
import { roles } from './roles';

export const userStatusEnum = pgEnum('user_status', ['active', 'inactive']);

export const users = pgTable('users', {
  id:            uuidPk(),
  username:      varchar('username', { length: 50 }).notNull(),
  password_hash: varchar('password_hash', { length: 255 }).notNull(),
  full_name:     varchar('full_name', { length: 100 }).notNull(),
  email:         varchar('email', { length: 150 }).notNull(),
  status:        userStatusEnum('status').notNull().default('active'),
  role_id:       uuid('role_id').references(() => roles.id),
  created_by:    uuid('created_by'),
  updated_by:    uuid('updated_by'),
  created_at:    timestamp('created_at').notNull().defaultNow(),
  updated_at:    timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
  deleted_at:    timestamp('deleted_at'),
}, (t) => [
  // Uniqueness only over live (non-deleted) rows, so a soft-deleted user's
  // username/email can be reused.
  uniqueIndex('users_username_active_unique').on(t.username).where(sql`${t.deleted_at} is null`),
  uniqueIndex('users_email_active_unique').on(t.email).where(sql`${t.deleted_at} is null`),
  index('users_role_id_idx').on(t.role_id),
]);

export type UserRow    = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
