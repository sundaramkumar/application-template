import { and, or, eq, ne, ilike, gt, gte, lt, lte, isNull, isNotNull, sql, type SQL } from 'drizzle-orm';
import type { AnyColumn } from 'drizzle-orm';
import type { FilterConfig, FilterParam } from '@shared';

/* Translate a *validated* FilterConfig into a Drizzle WHERE condition.
   Security: a condition's `field` must appear in the per-table whitelist
   (`FilterFieldMap`) or it is silently dropped — clients can never filter on
   an arbitrary column. Operators not valid for a field's type are dropped too. */

export type FilterFieldType = 'text' | 'number' | 'date';

export interface FilterFieldDef {
  column: AnyColumn;
  type:   FilterFieldType;
}

export type FilterFieldMap = Record<string, FilterFieldDef>;

/** Escape LIKE/ILIKE metacharacters so user input matches literally. */
function escapeLike(v: string): string {
  return v.replace(/[\\%_]/g, (m) => `\\${m}`);
}

function coerce(def: FilterFieldDef, value: string | number): string | number {
  if (def.type === 'number') return typeof value === 'number' ? value : Number(value);
  return value;
}

function buildCondition(cond: FilterParam, map: FilterFieldMap): SQL | undefined {
  const def = map[cond.field];
  if (!def) return undefined; // not whitelisted → ignore

  const col = def.column;

  // Value-less operators
  if (cond.op === 'is_empty')  return isNull(col);
  if (cond.op === 'not_empty') return isNotNull(col);

  // All remaining operators require a value
  if (cond.value === undefined || cond.value === '') return undefined;

  if (def.type === 'number' && Number.isNaN(Number(cond.value))) return undefined;

  // Date fields are stored as timestamps; compare at day granularity so
  // on/after/before behave intuitively (a bare date never equals a timestamp
  // that carries a time component). value is a validated 'YYYY-MM-DD' string;
  // it is parameterized, the column reference is not user input.
  if (def.type === 'date') {
    const d = String(cond.value);
    switch (cond.op) {
      case 'eq':  return sql`${col}::date = ${d}`;
      case 'neq': return sql`${col}::date <> ${d}`;
      case 'gt':  return sql`${col}::date > ${d}`;
      case 'gte': return sql`${col}::date >= ${d}`;
      case 'lt':  return sql`${col}::date < ${d}`;
      case 'lte': return sql`${col}::date <= ${d}`;
      default:    return undefined; // contains/starts/ends aren't valid for dates
    }
  }

  switch (cond.op) {
    case 'eq':          return eq(col, coerce(def, cond.value));
    case 'neq':         return ne(col, coerce(def, cond.value));
    case 'gt':          return gt(col, coerce(def, cond.value));
    case 'gte':         return gte(col, coerce(def, cond.value));
    case 'lt':          return lt(col, coerce(def, cond.value));
    case 'lte':         return lte(col, coerce(def, cond.value));
    // String-only operators
    case 'contains':    return def.type === 'text' ? ilike(col, `%${escapeLike(String(cond.value))}%`) : undefined;
    case 'starts_with': return def.type === 'text' ? ilike(col, `${escapeLike(String(cond.value))}%`)  : undefined;
    case 'ends_with':   return def.type === 'text' ? ilike(col, `%${escapeLike(String(cond.value))}`)  : undefined;
    default:            return undefined;
  }
}

/** Returns a single SQL condition for the whole config, or undefined if it
    yields nothing applicable. Two-level: groups combined by `groupLogic`,
    conditions within a group combined by the group's `logic`. */
export function buildFilterWhere(config: FilterConfig | undefined, map: FilterFieldMap): SQL | undefined {
  if (!config || !config.groups?.length) return undefined;

  const groupConds: SQL[] = [];
  for (const group of config.groups) {
    const conds = group.conditions
      .map((c) => buildCondition(c, map))
      .filter((c): c is SQL => c !== undefined);
    if (!conds.length) continue;
    const combined = group.logic === 'or' ? or(...conds) : and(...conds);
    if (combined) groupConds.push(combined);
  }

  if (!groupConds.length) return undefined;
  return config.groupLogic === 'or' ? or(...groupConds) : and(...groupConds);
}
