import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { openAPIRouteHandler } from 'hono-openapi';
import { Scalar } from '@scalar/hono-api-reference';
import { env } from './config/env';
import { requestLogger } from './middleware/request-logger';
import { errorHandler } from './middleware/error-handler';
import { authMiddleware } from './middleware/auth';
import { apiKeyMiddleware } from './middleware/api-key';
import { withPermissions } from './middleware/permissions';
import { openApiDocumentation } from './lib/openapi';
import apiRoutes from './routes';

const PUBLIC_PATHS = new Set([
  '/api/health',
  '/api/auth/login',
  '/api/auth/logout',
]);

function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.has(path);
}

export function createApp() {
  const app = new Hono();

  app.use('*', cors({
    origin:        env.FRONTEND_URL,
    allowMethods:  ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowHeaders:  ['Content-Type', 'Authorization', 'X-API-Key'],
    exposeHeaders: ['X-Total-Count', 'Content-Disposition'],
    credentials:   true,
  }));
  app.use('*', requestLogger);

  app.use('/api/*', async (c, next) => {
    if (isPublicPath(c.req.path)) return next();
    // Try API-key auth first (programmatic callers), then fall through to cookie
    // session auth, then resolve the principal's permissions onto the context.
    await apiKeyMiddleware(c, async () => {
      await authMiddleware(c, async () => { await withPermissions(c, next); });
    });
  });

  app.route('/api', apiRoutes);

  // API documentation (behind auth, via the /api/* middleware above).
  // OpenAPI spec generated from the describeRoute() annotations + shared Zod schemas,
  // rendered by Scalar.
  app.get('/api/openapi.json', openAPIRouteHandler(app, { documentation: openApiDocumentation }));
  app.get('/api/docs', Scalar({ url: '/api/openapi.json', pageTitle: 'Symatis CRM API' }));

  app.notFound((c) => c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } }, 404));
  app.onError(errorHandler);

  return app;
}
