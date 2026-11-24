import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { describeRoute } from 'hono-openapi';
import { zHook } from '../../lib/zhook';
import { createRoleSchema, updateRoleSchema, rolePermissionsUpdateSchema } from '@shared';
import { requirePermission } from '../../middleware/permissions';
import { jsonBody } from '../../lib/openapi';
import * as controller from './role.controller';

const TAGS = ['Roles'];
const role = new Hono();

role.get('/',
  describeRoute({ summary: 'List roles', tags: TAGS }),
  requirePermission('roles', 'read'), controller.list);
// Permission matrix (more specific paths before '/:id').
role.get('/:id/permissions',
  describeRoute({ summary: 'Get a role\'s permission matrix', tags: TAGS }),
  requirePermission('roles', 'read'), controller.getPermissions);
role.patch('/:id/permissions',
  describeRoute({ summary: 'Replace a role\'s permission matrix', tags: TAGS, requestBody: jsonBody(rolePermissionsUpdateSchema) }),
  requirePermission('roles', 'update'), zValidator('json', rolePermissionsUpdateSchema, zHook), controller.setPermissions);
role.get('/:id',
  describeRoute({ summary: 'Get a role', tags: TAGS }),
  requirePermission('roles', 'read'), controller.getOne);
role.post('/',
  describeRoute({ summary: 'Create a role', tags: TAGS, requestBody: jsonBody(createRoleSchema) }),
  requirePermission('roles', 'create'), zValidator('json', createRoleSchema, zHook), controller.create);
role.patch('/:id',
  describeRoute({ summary: 'Update a role', tags: TAGS, requestBody: jsonBody(updateRoleSchema) }),
  requirePermission('roles', 'update'), zValidator('json', updateRoleSchema, zHook), controller.update);
role.delete('/:id',
  describeRoute({ summary: 'Delete a role', tags: TAGS }),
  requirePermission('roles', 'delete'), controller.remove);

export default role;
