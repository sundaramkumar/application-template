import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { describeRoute } from 'hono-openapi';
import { zHook } from '../../lib/zhook';
import { createApiKeySchema } from '@shared';
import { requirePermission } from '../../middleware/permissions';
import { jsonBody } from '../../lib/openapi';
import * as controller from './apikey.controller';

const TAGS = ['API Keys'];
const apikey = new Hono();

apikey.get('/',
  describeRoute({ summary: 'List API keys', description: 'Never returns the secret — only the display prefix.', tags: TAGS }),
  requirePermission('apikeys', 'read'), controller.list);
apikey.post('/',
  describeRoute({ summary: 'Create an API key', description: 'Returns the plaintext key once. Store it securely — it cannot be retrieved again.', tags: TAGS, requestBody: jsonBody(createApiKeySchema) }),
  requirePermission('apikeys', 'create'), zValidator('json', createApiKeySchema, zHook), controller.create);
apikey.post('/:id/revoke',
  describeRoute({ summary: 'Revoke an API key', tags: TAGS }),
  requirePermission('apikeys', 'delete'), controller.revoke);

export default apikey;
