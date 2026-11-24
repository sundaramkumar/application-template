import type { ServerWebSocket } from 'bun';
import { jwtVerify } from 'jose';
import { env } from '../config/env';
import * as mgr from './ws.manager';

const secret = new TextEncoder().encode(env.JWT_SECRET);

async function verifyTicket(ticket: string) {
  const { payload } = await jwtVerify(ticket, secret);
  return payload as { sub: string; role: string };
}

export function handleUpgrade(req: Request, server: any): Response | undefined {
  const clientId = crypto.randomUUID();
  const upgraded = server.upgrade(req, { data: { clientId } });
  return upgraded ? undefined : new Response('WebSocket upgrade required', { status: 426 });
}

export const wsHandler = {
  open(ws: ServerWebSocket<{ clientId: string }>) {
    mgr.register(ws.data.clientId, ws);
    setTimeout(() => {
      if (!mgr.isAuthenticated(ws.data.clientId)) {
        ws.close(4001, 'Auth timeout');
      }
    }, 10_000);
  },

  async message(ws: ServerWebSocket<{ clientId: string }>, raw: string) {
    let msg: any;
    try { msg = JSON.parse(raw); } catch { return; }

    const { clientId } = ws.data;

    if (msg.type === 'auth') {
      try {
        const payload = await verifyTicket(msg.ticket);
        mgr.authenticate(clientId, payload.sub, payload.role);
        ws.send(JSON.stringify({ type: 'authenticated' }));
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid ticket' }));
        ws.close(4002, 'Auth failed');
      }
      return;
    }

    if (!mgr.isAuthenticated(clientId)) {
      ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' }));
      return;
    }

    if (msg.type === 'subscribe'   && msg.channel) mgr.subscribe(clientId, msg.channel);
    if (msg.type === 'unsubscribe' && msg.channel) mgr.unsubscribe(clientId, msg.channel);
  },

  close(ws: ServerWebSocket<{ clientId: string }>) {
    mgr.unregister(ws.data.clientId);
  },
};
