import type { Context } from 'hono';
import { ok, created, paginated } from '../../lib/response';
import { parseListQuery } from '../../lib/list-query';
import { paramId, actorIdOf } from '../../lib/ids';
import * as apiKeyService from './apikey.service';
import type { ApiKeyCreateRequest } from '@shared';

const SORTABLE = ['id', 'name', 'created_at', 'last_used_at', 'expires_at'];

export async function list(c: Context) {
  const q = parseListQuery(c, { sortable: SORTABLE, defaultSort: 'created_at', defaultLimit: 25 });
  const { data, meta } = await apiKeyService.listApiKeys(q);
  return paginated(c, data, meta);
}

export async function create(c: Context) {
  const body = c.req.valid('json' as never) as ApiKeyCreateRequest;
  return created(c, await apiKeyService.createApiKey(body, actorIdOf(c)));
}

export async function revoke(c: Context) {
  const id = paramId(c, 'API key');
  return ok(c, await apiKeyService.revokeApiKey(id, actorIdOf(c)));
}
