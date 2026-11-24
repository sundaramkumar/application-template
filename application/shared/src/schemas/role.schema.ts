import { z } from 'zod';

export const createRoleSchema = z.object({
  name: z.string().trim().min(1, 'Role name is required').max(50),
  type: z.enum(['admin', 'user']).optional(),
});

export const updateRoleSchema = createRoleSchema.partial();
