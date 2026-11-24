import { z } from 'zod';

export const recordScopeSchema = z.enum(['own', 'role', 'all']);

export const modulePermissionInputSchema = z.object({
  module:     z.string().trim().min(1).max(50),
  can_read:   z.boolean(),
  can_create: z.boolean(),
  can_update: z.boolean(),
  can_delete: z.boolean(),
  scope:      recordScopeSchema,
});

/** Bulk upsert payload for a role's permission matrix. */
export const rolePermissionsUpdateSchema = z.object({
  permissions: z.array(modulePermissionInputSchema).max(100),
});
