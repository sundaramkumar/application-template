import { Hono } from 'hono';
import authRoutes from './features/auth/auth.routes';
import roleRoutes from './features/roles/role.routes';
import userRoutes from './features/users/user.routes';
import auditRoutes from './features/audit/audit.routes';
import apiKeyRoutes from './features/apikeys/apikey.routes';

const api = new Hono();

api.get('/health', (c) => c.json({ status: 'ok', ts: new Date().toISOString() }));

api.route('/auth',    authRoutes);
api.route('/roles',   roleRoutes);
api.route('/users',   userRoutes);
api.route('/audit',   auditRoutes);
api.route('/apikeys', apiKeyRoutes);

export default api;
