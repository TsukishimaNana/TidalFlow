import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '@shared';
import type { AppSettings } from '@shared';

type NavigateTarget = 'settings';
type UpdateAvailableInfo = { version: string; releaseNotes?: string };
type UpdateDownloadedInfo = { version: string };

const api = {
  platform: process.platform,
  versions: {
    chrome: process.versions.chrome,
    electron: process.versions.electron,
    node: process.versions.node
  },
  settings: {
    get: (): Promise<AppSettings> => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
    save: (settings: AppSettings): Promise<AppSettings> => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SAVE, settings)
  },
  navigation: {
    onShowSettings: (callback: () => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, target: NavigateTarget) => {
        if (target === 'settings') {
          callback();
        }
      };

      ipcRenderer.on(IPC_CHANNELS.WINDOW_SHOW_SETTINGS, listener);
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.WINDOW_SHOW_SETTINGS, listener);
      };
    }
  },
  UPDATE_AVAILABLE: IPC_CHANNELS.UPDATE_AVAILABLE,
  UPDATE_DOWNLOADED: IPC_CHANNELS.UPDATE_DOWNLOADED,
  UPDATE_INSTALL: IPC_CHANNELS.UPDATE_INSTALL,
  onUpdateAvailable: (callback: (info: UpdateAvailableInfo) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, info: UpdateAvailableInfo) => {
      callback(info);
    };

    ipcRenderer.on(IPC_CHANNELS.UPDATE_AVAILABLE, listener);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.UPDATE_AVAILABLE, listener);
    };
  },
  onUpdateDownloaded: (callback: (info: UpdateDownloadedInfo) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, info: UpdateDownloadedInfo) => {
      callback(info);
    };

    ipcRenderer.on(IPC_CHANNELS.UPDATE_DOWNLOADED, listener);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.UPDATE_DOWNLOADED, listener);
    };
  },
  installUpdate: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_INSTALL)
} as const;

contextBridge.exposeInMainWorld('tidalflow', api);
