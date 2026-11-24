import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { describeRoute } from 'hono-openapi';
import { zHook } from '../../lib/zhook';
import { loginSchema } from '@shared';
import { jsonBody } from '../../lib/openapi';
import * as controller from './auth.controller';

const TAGS = ['Auth'];
const auth = new Hono();

auth.post('/login',
  describeRoute({ summary: 'Log in', description: 'Sets the app_token session cookie.', tags: TAGS, security: [], requestBody: jsonBody(loginSchema) }),
  zValidator('json', loginSchema, zHook), controller.login);
auth.get('/me',
  describeRoute({ summary: 'Current principal', tags: TAGS }),
  controller.me);
auth.get('/permissions',
  describeRoute({ summary: 'Current principal\'s resolved permissions', tags: TAGS }),
  controller.permissions);
auth.post('/logout',
  describeRoute({ summary: 'Log out', description: 'Clears the session cookie.', tags: TAGS, security: [] }),
  controller.logout);

export default auth;
