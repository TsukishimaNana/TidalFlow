import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../../../shared/src/constants';
import type { AppSettings, CreateTaskInput, Task, UpdateTaskInput } from '../../../shared/src/types';
import type { WsServerEvent } from '../../../shared/src/wsEvents';

type QueryParams = Record<string, string>;
type WsEventCallback = (event: WsServerEvent) => void;

const api = {
  platform: process.platform,
  versions: {
    chrome: process.versions.chrome,
    electron: process.versions.electron,
    node: process.versions.node
  },
  getTasks: (params?: QueryParams) => ipcRenderer.invoke(IPC_CHANNELS.API_GET, '/tasks', params),
  getTodayTasks: () => ipcRenderer.invoke(IPC_CHANNELS.API_GET, '/tasks/today'),
  getTask: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.API_GET, `/tasks/${id}`),
  createTask: (data: CreateTaskInput) => ipcRenderer.invoke(IPC_CHANNELS.API_POST, '/tasks', data),
  updateTask: (id: string, data: Partial<UpdateTaskInput>) => ipcRenderer.invoke(IPC_CHANNELS.API_PATCH, `/tasks/${id}`, data),
  deleteTask: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.API_DELETE, `/tasks/${id}`),
  completeTask: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.API_POST, `/tasks/${id}/complete`),
  postponeTask: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.API_POST, `/tasks/${id}/postpone`),
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.API_GET, '/settings'),
  updateSettings: (data: Partial<AppSettings>) => ipcRenderer.invoke(IPC_CHANNELS.API_POST, '/settings', data),
  connectWs: (url?: string, apiKey?: string) => ipcRenderer.invoke('ws:connect', url, apiKey),
  disconnectWs: () => ipcRenderer.invoke('ws:disconnect'),
  onWsEvent: (callback: WsEventCallback) => {
    const listener = (_event: Electron.IpcRendererEvent, data: WsServerEvent): void => {
      callback(data);
    };

    ipcRenderer.on(IPC_CHANNELS.WS_EVENT, listener);

    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.WS_EVENT, listener);
    };
  },
  getCachedTasks: () => ipcRenderer.invoke(IPC_CHANNELS.CACHE_GET_TASKS),
  saveCachedTasks: (tasks: Task[]) => ipcRenderer.invoke(IPC_CHANNELS.CACHE_SAVE_TASKS, tasks)
} as const;

contextBridge.exposeInMainWorld('tidalflow', api);
