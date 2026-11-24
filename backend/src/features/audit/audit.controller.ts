import type { Context } from 'hono';
import { ok, paginated } from '../../lib/response';
import { badRequest } from '../../lib/errors';
import { parseListQuery } from '../../lib/list-query';
import { queryId } from '../../lib/ids';
import * as auditService from './audit.service';

const SORTABLE = ['created_at', 'record_type', 'action', 'record_id', 'id'];

export async function list(c: Context) {
  const q = parseListQuery(c, { sortable: SORTABLE, defaultSort: 'created_at', defaultLimit: 25 });
  const { data, meta } = await auditService.listAudit(q, {
    recordType: c.req.query('record_type') || undefined,
    recordId:   queryId(c, 'record_id'),
    action:     c.req.query('action') || undefined,
    actorId:    queryId(c, 'actor_id'),
    from:       c.req.query('from') || undefined,
    to:         c.req.query('to') || undefined,
  });
  return paginated(c, data, meta);
}

export async function purge(c: Context) {
  const days = parseInt(c.req.query('olderThanDays') ?? '', 10);
  if (Number.isNaN(days) || days < 0) throw badRequest('olderThanDays must be a non-negative number');
  const result = await auditService.purgeAudit({
    olderThanDays: days,
    recordType:    c.req.query('record_type') || undefined,
  });
  return ok(c, result);
}
