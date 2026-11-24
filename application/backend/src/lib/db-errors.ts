// Bun.sql surfaces Postgres errors as a PostgresError; drizzle rethrows a
// generic Error with the original attached as `.cause`. The SQLSTATE lives on
// `.errno` (e.g. 23505 for unique_violation), with `.constraint`/`.detail` hints.

function pgCause(err: unknown): Record<string, unknown> {
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>;
    if (e.cause && typeof e.cause === 'object') return e.cause as Record<string, unknown>;
    return e;
  }
  return {};
}

export function isUniqueViolation(err: unknown): boolean {
  const e = pgCause(err);
  if (e.errno === 23505 || String(e.errno) === '23505' || e.code === '23505') return true;
  const msg = String(e.message ?? (err as Error)?.message ?? '');
  return /duplicate key value|unique constraint/i.test(msg);
}

// Pick which field caused a unique conflict from the constraint/detail text.
export function uniqueField(err: unknown, candidates: string[], fallback: string): string {
  const e = pgCause(err);
  const hay = String(e.constraint ?? e.detail ?? e.message ?? (err as Error)?.message ?? '').toLowerCase();
  return candidates.find(c => hay.includes(c)) ?? fallback;
}
