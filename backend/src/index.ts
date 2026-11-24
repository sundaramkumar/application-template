import { createApp } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import { handleUpgrade, wsHandler } from './ws/ws.handler';

const app = createApp();

logger.info(`Starting backend on http://localhost:${env.PORT}`);

export default {
  port: env.PORT,
  fetch(req: Request, server: any) {
    const url = new URL(req.url);
    if (url.pathname === '/ws') {
      return handleUpgrade(req, server) ?? new Response('Upgrade required', { status: 426 });
    }
    return app.fetch(req, { server });
  },
  websocket: wsHandler,
};
