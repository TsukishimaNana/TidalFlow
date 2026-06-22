import { app, BrowserWindow } from 'electron';
import { setupTray, shouldForceQuit } from './tray';
import { loadRenderer, openExternalLinksInBrowser, preloadPath } from './windows';
import { registerApiProxyHandlers } from './ipc/apiProxy';
import { registerCacheHandlers } from './ipc/cacheBridge';
import { connectWsBridge, disconnectWsBridge, registerWsBridge } from './ipc/wsBridge';
import { cacheService } from './services/cacheService';

function createMainWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 920,
    minHeight: 640,
    title: 'TidalFlow',
    backgroundColor: '#f7f7f5',
    show: false,
    webPreferences: {
      preload: preloadPath,
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('close', (event) => {
    if (shouldForceQuit()) {
      return;
    }

    event.preventDefault();
    mainWindow.hide();
  });

  openExternalLinksInBrowser(mainWindow);
  loadRenderer(mainWindow);

  return mainWindow;
}

void app.whenReady().then(() => {
  // Initialize services
  cacheService.initCache();
  registerApiProxyHandlers();
  registerCacheHandlers();
  registerWsBridge();

  let mainWindow = createMainWindow();
  setupTray(mainWindow, app);
  connectWsBridge();

  app.on('activate', () => {
    if (mainWindow.isDestroyed()) {
      mainWindow = createMainWindow();
      setupTray(mainWindow, app);
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
});

app.on('before-quit', () => {
  disconnectWsBridge();
  cacheService.close();
});

app.on('window-all-closed', () => {
  if (shouldForceQuit()) {
    app.quit();
  }
});
