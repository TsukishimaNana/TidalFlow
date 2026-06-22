import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, beforeEach, describe, it } from 'node:test';
import WebSocket from 'ws';
import { closeDatabase, initDatabase } from '../db/index';
import {
  broadcastToClients,
  closeWsServer,
  getConnectedClientCount,
  setupWsServer,
} from '../ws/wsServer';

const TEST_API_KEY = 'test-api-key';

type TestServer = {
  httpServer: http.Server;
  url: string;
};

function listen(server: http.Server): Promise<void> {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });
}

async function createTestServer(): Promise<TestServer> {
  const httpServer = http.createServer();
  setupWsServer(httpServer);
  await listen(httpServer);

  const address = httpServer.address() as AddressInfo;
  return {
    httpServer,
    url: `ws://127.0.0.1:${address.port}/ws`,
  };
}

function closeHttpServer(server: http.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function waitForOpen(client: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    client.once('open', () => resolve());
    client.once('error', reject);
  });
}

function waitForMessage(client: WebSocket): Promise<unknown> {
  return new Promise((resolve, reject) => {
    client.once('message', (data) => {
      resolve(JSON.parse(data.toString()) as unknown);
    });
    client.once('error', reject);
  });
}

function waitForClose(client: WebSocket): Promise<void> {
  return new Promise((resolve) => {
    client.once('close', () => resolve());
  });
}

async function authenticateClient(url: string, apiKey = TEST_API_KEY): Promise<WebSocket> {
  const client = new WebSocket(url);
  await waitForOpen(client);

  const syncMessage = waitForMessage(client);
  client.send(JSON.stringify({ type: 'auth', payload: { apiKey } }));
  await syncMessage;

  return client;
}

async function cleanupServer(httpServer: http.Server): Promise<void> {
  closeWsServer();
  await closeHttpServer(httpServer);
}

beforeEach(() => {
  process.env.API_KEY = TEST_API_KEY;
  initDatabase();
  closeWsServer();
});

after(() => {
  closeWsServer();
  closeDatabase();
});

describe('wsServer', () => {
  it('creates a WebSocket server on /ws', async () => {
    const { httpServer, url } = await createTestServer();
    const client = new WebSocket(url);

    await waitForOpen(client);

    assert.equal(client.readyState, WebSocket.OPEN);

    client.close();
    await cleanupServer(httpServer);
  });

  it('authenticates valid API keys and sends task sync', async () => {
    const { httpServer, url } = await createTestServer();
    const client = new WebSocket(url);
    await waitForOpen(client);

    const syncMessage = waitForMessage(client);
    client.send(JSON.stringify({ type: 'auth', payload: { apiKey: TEST_API_KEY } }));

    assert.deepEqual(await syncMessage, {
      type: 'tasks:sync',
      payload: [],
    });
    assert.equal(getConnectedClientCount(), 1);

    client.close();
    await cleanupServer(httpServer);
  });

  it('rejects invalid API keys', async () => {
    const { httpServer, url } = await createTestServer();
    const client = new WebSocket(url);
    await waitForOpen(client);

    const errorMessage = waitForMessage(client);
    const closed = waitForClose(client);
    client.send(JSON.stringify({ type: 'auth', payload: { apiKey: 'wrong-key' } }));

    assert.deepEqual(await errorMessage, {
      type: 'error',
      payload: { message: 'Unauthorized' },
    });
    await closed;
    assert.equal(getConnectedClientCount(), 0);

    await cleanupServer(httpServer);
  });

  it('responds to client ping messages with pong', async () => {
    const { httpServer, url } = await createTestServer();
    const client = await authenticateClient(url);

    const pongMessage = waitForMessage(client);
    client.send(JSON.stringify({ type: 'ping' }));

    assert.deepEqual(await pongMessage, { type: 'pong' });

    client.close();
    await cleanupServer(httpServer);
  });

  it('broadcasts events to authenticated clients', async () => {
    const { httpServer, url } = await createTestServer();
    const client = await authenticateClient(url);

    const broadcastMessage = waitForMessage(client);
    broadcastToClients({
      type: 'server:shutdown',
      payload: { message: 'test shutdown' },
    });

    assert.deepEqual(await broadcastMessage, {
      type: 'server:shutdown',
      payload: { message: 'test shutdown' },
    });

    client.close();
    await cleanupServer(httpServer);
  });

  it('closes unauthenticated clients after auth timeout', async () => {
    const { httpServer, url } = await createTestServer();
    const client = new WebSocket(url);
    await waitForOpen(client);

    const errorMessage = waitForMessage(client);
    const closed = waitForClose(client);

    assert.deepEqual(await errorMessage, {
      type: 'error',
      payload: { message: 'Auth timeout' },
    });
    await closed;
    assert.equal(getConnectedClientCount(), 0);

    await cleanupServer(httpServer);
  });

  it('tracks connected authenticated clients', async () => {
    const { httpServer, url } = await createTestServer();
    const firstClient = await authenticateClient(url);
    const secondClient = await authenticateClient(url);

    assert.equal(getConnectedClientCount(), 2);

    const closed = waitForClose(firstClient);
    firstClient.close();
    await closed;

    assert.equal(getConnectedClientCount(), 1);

    secondClient.close();
    await cleanupServer(httpServer);
  });
});
