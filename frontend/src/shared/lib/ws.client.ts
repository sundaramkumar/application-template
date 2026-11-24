type MessageHandler = (msg: any) => void;

const BASE_URL = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000';
const WS_URL   = BASE_URL.replace(/^http/, 'ws');

async function fetchWsTicket(): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/ws-ticket`, { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.ticket ?? null;
  } catch {
    return null;
  }
}

class WsClient {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<MessageHandler>>();
  private reconnectDelay = 1000;
  private intentionalClose = false;
  private pendingSubscriptions = new Set<string>();

  async connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    this.intentionalClose = false;

    const ticket = await fetchWsTicket();
    if (!ticket) {
      // No valid session — don't attempt connection
      return;
    }

    try {
      this.ws = new WebSocket(`${WS_URL}/ws`);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectDelay = 1000;
      this.send({ type: 'auth', ticket });
      for (const ch of this.pendingSubscriptions) {
        this.send({ type: 'subscribe', channel: ch });
      }
    };

    this.ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        this.handlers.get(msg.type)?.forEach(fn => fn(msg));
      } catch {}
    };

    this.ws.onclose = () => {
      if (!this.intentionalClose) this.scheduleReconnect();
    };

    this.ws.onerror = () => {};
  }

  disconnect() {
    this.intentionalClose = true;
    this.ws?.close();
    this.ws = null;
  }

  subscribe(channel: string) {
    this.pendingSubscriptions.add(channel);
    this.send({ type: 'subscribe', channel });
  }

  unsubscribe(channel: string) {
    this.pendingSubscriptions.delete(channel);
    this.send({ type: 'unsubscribe', channel });
  }

  on(type: string, fn: MessageHandler) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(fn);
  }

  off(type: string, fn: MessageHandler) {
    this.handlers.get(type)?.delete(fn);
  }

  private send(msg: object) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private scheduleReconnect() {
    setTimeout(() => this.connect(), this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30_000);
  }
}

export const wsClient = new WsClient();
