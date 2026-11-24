import type { Context } from 'hono';
import { ok, created, noContent, paginated } from '../../lib/response';
import { parseListQuery } from '../../lib/list-query';
import { paramId, actorIdOf } from '../../lib/ids';
import * as roleService from './role.service';
import type { RoleCreateRequest, RoleUpdateRequest, RolePermissionRow } from '@shared';

const SORTABLE = ['id', 'name', 'created_at'];

export async function list(c: Context) {
  const q = parseListQuery(c, { sortable: SORTABLE, defaultSort: 'name', defaultLimit: 25 });
  const { data, meta } = await roleService.listRoles(q);
  return paginated(c, data, meta);
}

export async function getOne(c: Context) {
  const id = paramId(c, 'role');
  return ok(c, await roleService.getRoleById(id));
}

export async function create(c: Context) {
  const body = c.req.valid('json' as never) as RoleCreateRequest;
  return created(c, await roleService.createRole(body, actorIdOf(c)));
}

export async function update(c: Context) {
  const id = paramId(c, 'role');
  const body = c.req.valid('json' as never) as RoleUpdateRequest;
  return ok(c, await roleService.updateRole(id, body, actorIdOf(c)));
}

export async function remove(c: Context) {
  const id = paramId(c, 'role');
  await roleService.deleteRole(id, actorIdOf(c));
  return noContent(c);
}

export async function getPermissions(c: Context) {
  const id = paramId(c, 'role');
  return ok(c, await roleService.getRolePermissions(id));
}

export async function setPermissions(c: Context) {
  const id = paramId(c, 'role');
  const body = c.req.valid('json' as never) as { permissions: RolePermissionRow[] };
  return ok(c, await roleService.setRolePermissions(id, body.permissions, actorIdOf(c)));
}
