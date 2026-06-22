/// <reference types="vite/client" />

import type { AppSettings } from '@shared';

interface TidalFlowApi {
  platform: string;
  versions: {
    chrome?: string;
    electron?: string;
    node?: string;
  };
  settings?: {
    get: () => Promise<AppSettings>;
    save: (settings: AppSettings) => Promise<AppSettings>;
  };
  navigation?: {
    onShowSettings: (callback: () => void) => () => void;
  };
  UPDATE_AVAILABLE: string;
  UPDATE_DOWNLOADED: string;
  UPDATE_INSTALL: string;
  onUpdateAvailable: (callback: (info: { version: string; releaseNotes?: string }) => void) => () => void;
  onUpdateDownloaded: (callback: (info: { version: string }) => void) => () => void;
  installUpdate: () => Promise<void>;
}

declare global {
  interface Window {
    tidalflow: TidalFlowApi;
  }
}

export {};
