import { BrowserWindow, ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../../../shared/src/constants';
import type { WsServerEvent } from '../../../../shared/src/wsEvents';
import { getApiKey, getWsUrl } from '../services/apiClient';
import { WsClient } from '../services/wsClient';

export const wsClient = new WsClient();

let bridgeRegistered = false;

function broadcastWsEvent(event: WsServerEvent): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.webContents.isDestroyed()) {
      window.webContents.send(IPC_CHANNELS.WS_EVENT, event);
    }
  }
}

export function registerWsBridge(): void {
  if (bridgeRegistered) {
    return;
  }

  wsClient.onEvent(broadcastWsEvent);

  ipcMain.handle('ws:connect', (_event, url?: string, apiKey?: string) => {
    wsClient.connect(url ?? getWsUrl(), apiKey ?? getApiKey());
    return { success: true };
  });

  ipcMain.handle('ws:disconnect', () => {
    wsClient.disconnect();
    return { success: true };
  });

  bridgeRegistered = true;
}

export function connectWsBridge(url = getWsUrl(), apiKey = getApiKey()): void {
  wsClient.connect(url, apiKey);
}

export function disconnectWsBridge(): void {
  wsClient.disconnect();
}
