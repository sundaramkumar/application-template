import type { Context } from 'hono';
import type { PaginatedMeta } from '@shared';

export const ok = <T>(c: Context, data: T) =>
  c.json({ success: true, data }, 200);

export const created = <T>(c: Context, data: T) =>
  c.json({ success: true, data }, 201);

export const noContent = (_c: Context) =>
  new Response(null, { status: 204 });

export const paginated = <T>(c: Context, data: T[], meta: PaginatedMeta) =>
  c.json({ success: true, data, meta }, 200);

export const fail = (c: Context, status: number, code: string, message: string, details?: unknown) =>
  c.json({ success: false, error: { code, message, ...(details ? { details } : {}) } }, status as any);
