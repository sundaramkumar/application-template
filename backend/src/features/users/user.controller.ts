import type { Context } from 'hono';
import { ok, created, noContent, paginated } from '../../lib/response';
import { parseListQuery } from '../../lib/list-query';
import { paramId, actorIdOf } from '../../lib/ids';
import * as userService from './user.service';
import type { UserCreateRequest, UserUpdateRequest, UserPermissions } from '@shared';

const SORTABLE = ['id', 'username', 'full_name', 'email', 'status', 'created_at'];

function actorIsAdmin(c: Context): boolean {
  return !!(c.get('perms') as UserPermissions | undefined)?.isAdmin;
}

export async function list(c: Context) {
  const q = parseListQuery(c, { sortable: SORTABLE, defaultSort: 'id', defaultLimit: 25 });
  const { data, meta } = await userService.listUsers(q);
  return paginated(c, data, meta);
}

export async function getOne(c: Context) {
  const id = paramId(c, 'user');
  return ok(c, await userService.getUserById(id));
}

export async function create(c: Context) {
  const body = c.req.valid('json' as never) as UserCreateRequest;
  return created(c, await userService.createUser(body, actorIdOf(c), actorIsAdmin(c)));
}

export async function update(c: Context) {
  const id = paramId(c, 'user');
  const body = c.req.valid('json' as never) as UserUpdateRequest;
  return ok(c, await userService.updateUser(id, body, actorIdOf(c), actorIsAdmin(c)));
}

export async function remove(c: Context) {
  const id = paramId(c, 'user');
  await userService.deleteUser(id, actorIdOf(c));
  return noContent(c);
}
