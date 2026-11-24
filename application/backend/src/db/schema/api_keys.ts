import { pgTable, varchar, uuid, boolean, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { uuidPk } from './_columns';
import { roles } from './roles';

/* Programmatic access credentials. A key is a service principal bound to a role —
   its permissions/scopes come entirely from that role (see lib/permissions). Only
   a SHA-256 hash of the key is stored; the plaintext is shown once at creation.
   `prefix` keeps the leading chars for display/identification in the UI. */
export const apiKeys = pgTable('api_keys', {
  id:           uuidPk(),
  name:         varchar('name', { length: 80 }).notNull(),
  prefix:       varchar('prefix', { length: 20 }).notNull(),
  key_hash:     varchar('key_hash', { length: 64 }).notNull(),
  role_id:      uuid('role_id').notNull().references(() => roles.id),
  active:       boolean('active').notNull().default(true),
  expires_at:   timestamp('expires_at'),
  last_used_at: timestamp('last_used_at'),
  created_by:   uuid('created_by'),
  created_at:   timestamp('created_at').notNull().defaultNow(),
  revoked_at:   timestamp('revoked_at'),
}, (t) => [
  uniqueIndex('api_keys_key_hash_unique').on(t.key_hash),
  index('api_keys_role_idx').on(t.role_id),
]);

export type ApiKeyRow    = typeof apiKeys.$inferSelect;
export type NewApiKeyRow  = typeof apiKeys.$inferInsert;
