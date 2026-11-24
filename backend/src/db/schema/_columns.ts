import { sql } from 'drizzle-orm';
import { uuid } from 'drizzle-orm/pg-core';

/** UUID primary key. The app generates time-ordered UUID v7 (index-friendly, sorts by
    creation); the DB default gen_random_uuid() (v4) only covers raw-SQL inserts,
    since Postgres 16 has no native v7. */
export const uuidPk = () =>
  uuid('id').primaryKey().default(sql`gen_random_uuid()`).$defaultFn(() => Bun.randomUUIDv7());
