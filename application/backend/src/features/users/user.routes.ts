import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { describeRoute } from 'hono-openapi';
import { zHook } from '../../lib/zhook';
import { createUserSchema, updateUserSchema } from '@shared';
import { requirePermission } from '../../middleware/permissions';
import { jsonBody } from '../../lib/openapi';
import * as controller from './user.controller';

const TAGS = ['Users'];
const user = new Hono();

user.get('/',
  describeRoute({ summary: 'List users', description: 'Paginated, filterable, sortable list of users.', tags: TAGS }),
  requirePermission('users', 'read'), controller.list);
user.get('/:id',
  describeRoute({ summary: 'Get a user', tags: TAGS }),
  requirePermission('users', 'read'), controller.getOne);
user.post('/',
  describeRoute({ summary: 'Create a user', tags: TAGS, requestBody: jsonBody(createUserSchema) }),
  requirePermission('users', 'create'), zValidator('json', createUserSchema, zHook), controller.create);
user.patch('/:id',
  describeRoute({ summary: 'Update a user', tags: TAGS, requestBody: jsonBody(updateUserSchema) }),
  requirePermission('users', 'update'), zValidator('json', updateUserSchema, zHook), controller.update);
user.delete('/:id',
  describeRoute({ summary: 'Delete a user', description: 'Soft-deletes the user.', tags: TAGS }),
  requirePermission('users', 'delete'), controller.remove);

export default user;
