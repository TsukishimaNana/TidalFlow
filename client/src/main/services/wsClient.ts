import WebSocket from 'ws';
import type { RawData } from 'ws';
import type { WsClientEvent, WsServerEvent } from '../../../../shared/src/wsEvents';
import { createAuthClientEvent, createPingClientEvent } from '../../../../shared/src/wsEvents';

type WsEventCallback = (event: WsServerEvent) => void;

const HEARTBEAT_INTERVAL_MS = 30_000;
const INITIAL_RECONNECT_DELAY_MS = 1_000;
const MAX_RECONNECT_DELAY_MS = 30_000;

export class WsClient {
  private socket: WebSocket | null = null;
  private url: string | null = null;
  private apiKey: string | null = null;
  private callbacks = new Set<WsEventCallback>();
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectDelayMs = INITIAL_RECONNECT_DELAY_MS;
  private shouldReconnect = false;

  connect(url: string, apiKey: string): void {
    this.url = url;
    this.apiKey = apiKey;
    this.shouldReconnect = true;
    this.clearReconnectTimer();

    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.openSocket();
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.clearReconnectTimer();
    this.stopHeartbeat();

    if (this.socket) {
      this.socket.close(1000, 'Client disconnect');
      this.socket = null;
    }
  }

  onEvent(callback: WsEventCallback): () => void {
    this.callbacks.add(callback);

    return () => {
      this.callbacks.delete(callback);
    };
  }

  private openSocket(): void {
    if (!this.url || this.apiKey === null) {
      return;
    }

    this.socket = new WebSocket(this.url);

    this.socket.on('open', () => {
      this.reconnectDelayMs = INITIAL_RECONNECT_DELAY_MS;
      this.send(createAuthClientEvent(this.apiKey ?? ''));
      this.startHeartbeat();
    });

    this.socket.on('message', (data) => {
      this.handleMessage(data);
    });

    this.socket.on('close', () => {
      this.socket = null;
      this.stopHeartbeat();
      this.scheduleReconnect();
    });

    this.socket.on('error', () => {
      this.socket?.close();
    });
  }

  private send(event: WsClientEvent): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(event));
    }
  }

  private handleMessage(data: RawData): void {
    const message = typeof data === 'string' ? data : data.toString('utf8');

    try {
      const event = JSON.parse(message) as WsServerEvent;
      for (const callback of this.callbacks) {
        callback(event);
      }
    } catch {
      // Ignore malformed WebSocket frames from the server.
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send(createPingClientEvent());
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (!this.shouldReconnect || this.reconnectTimer) {
      return;
    }

    const delayMs = this.reconnectDelayMs;
    this.reconnectDelayMs = Math.min(this.reconnectDelayMs * 2, MAX_RECONNECT_DELAY_MS);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.openSocket();
    }, delayMs);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
