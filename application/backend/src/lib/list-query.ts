import type { Context } from 'hono';
import { filterConfigSchema, type PaginatedMeta, type FilterConfig } from '@shared';

export interface SortRule {
  field: string;           // validated against a whitelist
  dir:   'asc' | 'desc';
}

export interface ListQuery {
  page:   number;
  limit:  number;
  offset: number;
  sort:   string;          // first sort field (legacy convenience)
  order:  'asc' | 'desc';  // first sort dir   (legacy convenience)
  sorts:  SortRule[];      // multi-column sort, in order
  search?: string;
  filter?: FilterConfig;   // advanced AND/OR filter (validated)
}

/** Parse the `sort` param: a comma list of `field:dir` (multi-sort), or a single
    `field` with the legacy `order` param. Invalid/unknown fields are dropped. */
function parseSorts(c: Context, opts: ParseOpts): SortRule[] {
  const raw = c.req.query('sort');
  const fallbackDir: 'asc' | 'desc' = c.req.query('order') === 'asc' ? 'asc' : 'desc';
  const out: SortRule[] = [];
  if (raw) {
    for (const part of raw.split(',')) {
      const [field, dirRaw] = part.split(':').map((s) => s.trim());
      if (!field || !opts.sortable.includes(field)) continue;
      const dir = dirRaw === 'asc' ? 'asc' : dirRaw === 'desc' ? 'desc' : fallbackDir;
      if (!out.some((s) => s.field === field)) out.push({ field, dir });
    }
  }
  if (out.length === 0) out.push({ field: opts.defaultSort, dir: fallbackDir });
  return out;
}

/** Parse + validate the JSON-encoded `filters` query param. Invalid → ignored. */
function parseFilter(c: Context): FilterConfig | undefined {
  const raw = c.req.query('filters');
  if (!raw) return undefined;
  try {
    const parsed = filterConfigSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

interface ParseOpts {
  sortable:    string[];   // whitelist of sortable columns (prevents injection)
  defaultSort: string;
  defaultLimit?: number;
  maxLimit?:     number;
}

/** Parse standard list query params (?page&limit&sort&order&search) from a request. */
export function parseListQuery(c: Context, opts: ParseOpts): ListQuery {
  const page  = Math.max(1, parseInt(c.req.query('page') ?? '1', 10) || 1);
  const reqLimit = parseInt(c.req.query('limit') ?? String(opts.defaultLimit ?? 25), 10) || (opts.defaultLimit ?? 25);
  const limit = Math.min(Math.max(1, reqLimit), opts.maxLimit ?? 100);

  const sorts   = parseSorts(c, opts);
  const search  = c.req.query('search')?.trim() || undefined;
  const filter  = parseFilter(c);

  return { page, limit, offset: (page - 1) * limit, sort: sorts[0].field, order: sorts[0].dir, sorts, search, filter };
}

export function buildMeta(total: number, page: number, limit: number): PaginatedMeta {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}
