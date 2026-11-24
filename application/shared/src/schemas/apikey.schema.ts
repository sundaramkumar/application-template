import { z } from 'zod';

export const createApiKeySchema = z.object({
  name:       z.string().trim().min(1, 'Name is required').max(80),
  role_id:    z.uuid(),
  // Optional expiry — an ISO date/datetime string; null/omitted = never expires.
  expires_at: z.string().trim().min(1).optional().nullable(),
});

export type ApiKeyCreateRequest = z.infer<typeof createApiKeySchema>;
