import { app, BrowserWindow } from 'electron'
import { setupTray, shouldForceQuit } from './tray'
import { loadRenderer, openExternalLinksInBrowser, preloadPath } from './windows'
import { registerApiProxyHandlers } from './ipc/apiProxy'
import { registerCacheHandlers } from './ipc/cacheBridge'
import { connectWsBridge, disconnectWsBridge, registerWsBridge } from './ipc/wsBridge'
import { logger } from './logger'
import { cacheService } from './services/cacheService'

function createMainWindow(): BrowserWindow {
  logger.info('Creating main window');

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
    logger.info('Main window ready to show');
    mainWindow.show();
  });

  mainWindow.on('close', (event) => {
    if (shouldForceQuit()) {
      logger.info('Main window closing');
      return;
    }

    event.preventDefault();
    logger.debug('Main window hidden to tray');
    mainWindow.hide();
  });

  openExternalLinksInBrowser(mainWindow);
  loadRenderer(mainWindow);
  logger.info('Main window created');

  return mainWindow;
}

void app.whenReady().then(() => {
  logger.info('App ready');
  logger.info('Initializing services');

  cacheService.initCache();
  registerApiProxyHandlers();
  registerCacheHandlers();
  registerWsBridge();
  logger.info('Services initialized');

  let mainWindow = createMainWindow();
  setupTray(mainWindow, app);
  logger.info('Tray setup complete');

  connectWsBridge();
  logger.info('WebSocket bridge connection started');

  app.on('activate', () => {
    logger.info('App activated');

    if (mainWindow.isDestroyed()) {
      mainWindow = createMainWindow();
      setupTray(mainWindow, app);
      logger.info('Tray setup complete');
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
});

app.on('before-quit', () => {
  logger.info('App before quit');
  disconnectWsBridge();
  cacheService.close();
  logger.info('Services closed');
});

app.on('window-all-closed', () => {
  logger.debug('All windows closed');

  if (shouldForceQuit()) {
    logger.info('Quitting app after all windows closed');
    app.quit();
  }
});
