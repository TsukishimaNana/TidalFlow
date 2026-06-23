import { app, BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';
import { IPC_CHANNELS } from '@tidalflow/shared';

interface UpdateAvailablePayload {
  version: string;
  releaseNotes?: string;
}

interface UpdateDownloadedPayload {
  version: string;
}

function normalizeReleaseNotes(releaseNotes: unknown): string | undefined {
  if (typeof releaseNotes === 'string') {
    return releaseNotes;
  }

  return undefined;
}

export function initAutoUpdater(mainWindow: BrowserWindow): void {
  if (!app.isPackaged) {
    console.log('Auto updater disabled in development');
    return;
  }

  autoUpdater.on('update-available', (info) => {
    const payload: UpdateAvailablePayload = {
      version: info.version,
      releaseNotes: normalizeReleaseNotes(info.releaseNotes)
    };

    mainWindow.webContents.send(IPC_CHANNELS.UPDATE_AVAILABLE, payload);
  });

  autoUpdater.on('update-downloaded', (info) => {
    const payload: UpdateDownloadedPayload = {
      version: info.version
    };

    mainWindow.webContents.send(IPC_CHANNELS.UPDATE_DOWNLOADED, payload);
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log(`No update available. Current latest version: ${info.version}`);
  });

  autoUpdater.on('error', (error) => {
    console.error('Auto updater error:', error);
  });

  void autoUpdater.checkForUpdatesAndNotify();
}

export function quitAndInstall(): void {
  if (!app.isPackaged) {
    console.log('Auto updater install ignored in development');
    return;
  }

  autoUpdater.quitAndInstall();
}
