import { pgTable, uuid, varchar, boolean, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { uuidPk } from './_columns';
import { roles } from './roles';

/* One row per role × module. `scope` (own|role|all) only applies to ownable
   modules; non-ownable modules ignore it. */
export const rolePermissions = pgTable('role_permissions', {
  id:         uuidPk(),
  role_id:    uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  module:     varchar('module', { length: 50 }).notNull(),
  can_read:   boolean('can_read').notNull().default(false),
  can_create: boolean('can_create').notNull().default(false),
  can_update: boolean('can_update').notNull().default(false),
  can_delete: boolean('can_delete').notNull().default(false),
  scope:      varchar('scope', { length: 10 }).notNull().default('own'),  // 'own' | 'role' | 'all'
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex('role_permissions_role_module_unique').on(t.role_id, t.module),
]);

export type RolePermission    = typeof rolePermissions.$inferSelect;
export type NewRolePermission = typeof rolePermissions.$inferInsert;
