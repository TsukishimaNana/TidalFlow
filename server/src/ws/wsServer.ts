import type http from 'node:http';
import { WebSocketServer } from 'ws';
import type WebSocket from 'ws';
import type { RawData } from 'ws';
import {
  isAuthClientEvent,
  isPingClientEvent,
  type WsClientEvent,
  type WsServerEvent,
} from '@tidalflow/shared';
import { getDatabase } from '../db/index';
import { getAllTasks } from '../db/taskRepository';

const AUTH_TIMEOUT_MS = 5_000;
const HEARTBEAT_INTERVAL_MS = 30_000;
const HEARTBEAT_TIMEOUT_MS = 10_000;

const authenticatedClients = new Set<WebSocket>();
const pendingHeartbeatClients = new Set<WebSocket>();

let wsServer: WebSocketServer | null = null;
let heartbeatInterval: NodeJS.Timeout | null = null;

type InternalServerEvent =
  | WsServerEvent
  | { type: 'pong' }
  | { type: 'error'; payload: { message: string } };

function sendEvent(client: WebSocket, event: InternalServerEvent): void {
  if (client.readyState === client.OPEN) {
    client.send(JSON.stringify(event));
  }
}

function parseClientEvent(data: RawData): WsClientEvent | null {
  try {
    const parsed = JSON.parse(data.toString()) as unknown;

    if (!parsed || typeof parsed !== 'object' || !('type' in parsed)) {
      return null;
    }

    const event = parsed as WsClientEvent;

    if (isAuthClientEvent(event) || isPingClientEvent(event)) {
      return event;
    }
  } catch (error) {
    console.error('Failed to parse WebSocket message', error);
  }

  return null;
}

function removeClient(client: WebSocket): void {
  authenticatedClients.delete(client);
  pendingHeartbeatClients.delete(client);
}

function startHeartbeat(): void {
  if (heartbeatInterval) {
    return;
  }

  heartbeatInterval = setInterval(() => {
    for (const client of authenticatedClients) {
      if (client.readyState !== client.OPEN) {
        removeClient(client);
        continue;
      }

      pendingHeartbeatClients.add(client);
      client.ping();

      setTimeout(() => {
        if (pendingHeartbeatClients.has(client)) {
          removeClient(client);
          client.close();
        }
      }, HEARTBEAT_TIMEOUT_MS);
    }
  }, HEARTBEAT_INTERVAL_MS);
}

export function setupWsServer(httpServer: http.Server): WebSocketServer {
  if (wsServer) {
    wsServer.close();
    wsServer = null;
  }

  getDatabase();

  wsServer = new WebSocketServer({ server: httpServer, path: '/ws' });
  startHeartbeat();

  wsServer.on('connection', (client: WebSocket) => {
    let isAuthenticated = false;

    const authTimeout = setTimeout(() => {
      if (!isAuthenticated) {
        sendEvent(client, { type: 'error', payload: { message: 'Auth timeout' } });
        client.close();
      }
    }, AUTH_TIMEOUT_MS);

    client.on('pong', () => {
      pendingHeartbeatClients.delete(client);
    });

    client.on('message', (data: RawData) => {
      const event = parseClientEvent(data);

      if (!event) {
        sendEvent(client, { type: 'error', payload: { message: 'Invalid message' } });
        return;
      }

      if (!isAuthenticated) {
        if (!isAuthClientEvent(event) || event.payload.apiKey !== process.env.API_KEY || !process.env.API_KEY) {
          clearTimeout(authTimeout);
          sendEvent(client, { type: 'error', payload: { message: 'Unauthorized' } });
          client.close();
          return;
        }

        isAuthenticated = true;
        clearTimeout(authTimeout);
        authenticatedClients.add(client);
        sendEvent(client, { type: 'tasks:sync', payload: getAllTasks() });
        return;
      }

      if (isPingClientEvent(event)) {
        sendEvent(client, { type: 'pong' });
      }
    });

    client.on('close', () => {
      clearTimeout(authTimeout);
      removeClient(client);
    });

    client.on('error', (error: Error) => {
      console.error('WebSocket client error', error);
      clearTimeout(authTimeout);
      removeClient(client);
    });
  });

  wsServer.on('close', () => {
    authenticatedClients.clear();
    pendingHeartbeatClients.clear();
  });

  return wsServer;
}

export function broadcastToClients(event: WsServerEvent): void {
  const serializedEvent = JSON.stringify(event);

  for (const client of authenticatedClients) {
    if (client.readyState === client.OPEN) {
      client.send(serializedEvent);
    } else {
      removeClient(client);
    }
  }
}

export function getConnectedClientCount(): number {
  return authenticatedClients.size;
}

export function closeWsServer(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }

  for (const client of authenticatedClients) {
    client.close();
  }

  authenticatedClients.clear();
  pendingHeartbeatClients.clear();

  if (wsServer) {
    wsServer.close();
    wsServer = null;
  }
}
