import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { requirePermission } from '../../middleware/permissions';
import * as controller from './audit.controller';

const TAGS = ['Audit'];
const audit = new Hono();

audit.get('/',
  describeRoute({ summary: 'List audit entries', description: 'Filter by module, action, actor, and date range.', tags: TAGS }),
  requirePermission('audit', 'read'), controller.list);
audit.delete('/purge',
  describeRoute({ summary: 'Purge old audit entries', description: 'Delete logs older than N days, optionally for one module.', tags: TAGS }),
  requirePermission('audit', 'delete'), controller.purge);

export default audit;
