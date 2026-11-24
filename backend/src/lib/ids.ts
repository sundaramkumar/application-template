import type { Context } from 'hono';
import { z } from 'zod';
import { badRequest } from './errors';
import type { JwtPayload } from '../types/hono.types';

/* All primary keys are UUIDs (v7 for app-created rows). Validate ids at the edge so a
   malformed value is a 400, not a Postgres "invalid input syntax for type uuid" 500. */

const uuidSchema = z.uuid();

export const isUuid = (v: unknown): v is string => uuidSchema.safeParse(v).success;

/** The `:id` route param as a validated UUID. */
export function paramId(c: Context, label: string, name = 'id'): string {
  const id = c.req.param(name) ?? '';
  if (!isUuid(id)) throw badRequest(`Invalid ${label} id`);
  return id;
}

/** Optional UUID query param (e.g. ?record_id=); invalid → 400, absent → undefined. */
export function queryId(c: Context, name: string): string | undefined {
  const v = c.req.query(name);
  if (!v) return undefined;
  if (!isUuid(v)) throw badRequest(`Invalid ${name}`);
  return v;
}

/** Acting user's id from the JWT (or API-key principal); null when none / not a user. */
export function actorIdOf(c: Context): string | null {
  const sub = (c.get('user') as JwtPayload | undefined)?.sub;
  return isUuid(sub) ? sub : null;
}
