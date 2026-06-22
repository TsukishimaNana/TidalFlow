import { contextBridge } from 'electron';

const api = {
  platform: process.platform,
  versions: {
    chrome: process.versions.chrome,
    electron: process.versions.electron,
    node: process.versions.node
  }
} as const;

contextBridge.exposeInMainWorld('tidalflow', api);
