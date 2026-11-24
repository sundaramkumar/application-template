import type { ServerWebSocket } from 'bun';

interface WsClient {
  ws: ServerWebSocket<{ clientId: string }>;
  userId: string | null;
  role: string | null;
  subscriptions: Set<string>;
}

const clients = new Map<string, WsClient>();

export function register(clientId: string, ws: ServerWebSocket<{ clientId: string }>) {
  clients.set(clientId, { ws, userId: null, role: null, subscriptions: new Set() });
}

export function unregister(clientId: string) {
  clients.delete(clientId);
}

export function authenticate(clientId: string, userId: string, role: string) {
  const c = clients.get(clientId);
  if (c) { c.userId = userId; c.role = role; }
}

export function isAuthenticated(clientId: string): boolean {
  return clients.get(clientId)?.userId != null;
}

export function subscribe(clientId: string, channel: string) {
  clients.get(clientId)?.subscriptions.add(channel);
}

export function unsubscribe(clientId: string, channel: string) {
  clients.get(clientId)?.subscriptions.delete(channel);
}

function send(ws: ServerWebSocket<any>, msg: object) {
  try { ws.send(JSON.stringify(msg)); } catch {}
}

/** Send to all authenticated clients subscribed to a channel. */
export function broadcast(channel: string, msg: object) {
  for (const c of clients.values()) {
    if (c.userId && c.subscriptions.has(channel)) send(c.ws, msg);
  }
}

/** Send to all connections of a specific user. */
export function pushToUser(userId: string, msg: object) {
  for (const c of clients.values()) {
    if (c.userId === userId) send(c.ws, msg);
  }
}

/** Send to all users with a given role. */
export function pushToRole(roleName: string, msg: object) {
  for (const c of clients.values()) {
    if (c.userId && c.role === roleName) send(c.ws, msg);
  }
}

export function getAllUserIds(): string[] {
  const ids = new Set<string>();
  for (const c of clients.values()) if (c.userId) ids.add(c.userId);
  return [...ids];
}
