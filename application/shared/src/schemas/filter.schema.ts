import { z } from 'zod';

/* Advanced list filtering — validated on the backend, built on the frontend.
   Mirrors the FilterOperator / FilterParam / FilterGroup / FilterConfig types
   in types/common.types.ts. Two levels: groups combined by `groupLogic`,
   conditions within a group combined by the group's `logic`. */

export const filterOperatorSchema = z.enum([
  'eq', 'neq',
  'contains', 'starts_with', 'ends_with',
  'gt', 'gte', 'lt', 'lte',
  'is_empty', 'not_empty',
]);

export const filterParamSchema = z.object({
  field: z.string().trim().min(1).max(64),
  op:    filterOperatorSchema,
  value: z.union([z.string(), z.number()]).optional(),
});

export const filterGroupSchema = z.object({
  id:         z.string().min(1).max(64),
  logic:      z.enum(['and', 'or']),
  conditions: z.array(filterParamSchema).max(25),
});

export const filterConfigSchema = z.object({
  groupLogic: z.enum(['and', 'or']),
  groups:     z.array(filterGroupSchema).max(10),
});
