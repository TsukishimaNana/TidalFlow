import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../../../shared/src/constants';
import { apiClient } from '../services/apiClient';

type QueryParams = Record<string, string | number | boolean | null | undefined>;

let handlersRegistered = false;

export function registerApiProxyHandlers(): void {
  if (handlersRegistered) {
    return;
  }

  ipcMain.handle(IPC_CHANNELS.API_GET, (_event, path: string, params?: QueryParams) => apiClient.get(path, params));
  ipcMain.handle(IPC_CHANNELS.API_POST, (_event, path: string, body?: unknown) =>
    path === '/settings' ? apiClient.put(path, body) : apiClient.post(path, body)
  );
  ipcMain.handle(IPC_CHANNELS.API_PATCH, (_event, path: string, body?: unknown) => apiClient.patch(path, body));
  ipcMain.handle(IPC_CHANNELS.API_DELETE, (_event, path: string) => apiClient.delete(path));

  handlersRegistered = true;
}
