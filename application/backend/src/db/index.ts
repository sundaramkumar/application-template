import { drizzle } from 'drizzle-orm/bun-sql';
import { SQL } from 'bun';
import { env } from '../config/env';
import * as schema from './schema';

// Bun's native Postgres client (Bun.sql) — connection pooling is built in.
const client = new SQL({
  url: env.DATABASE_URL,
  max: env.DB_POOL_MAX,
});

export const db = drizzle({ client, schema });

export type DB = typeof db;

// Transaction executor — `db` or the `tx` handle passed to a transaction.
export type Executor = DB | Parameters<Parameters<DB['transaction']>[0]>[0];

/** Run a set of queries atomically. */
export function withTransaction<T>(fn: (tx: Executor) => Promise<T>): Promise<T> {
  return db.transaction(fn);
}
