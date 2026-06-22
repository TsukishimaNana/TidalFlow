import { join } from 'node:path';
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { IPC_CHANNELS } from '@shared';
import { createPanelWindow, getPanelWindow, hidePanelWindow, destroyPanelWindow, togglePanelWindow } from './panel';
import { registerSettingsIpcHandlers } from './settings';
import { createTray, destroyTray } from './tray';
import { initAutoUpdater, quitAndInstall } from './updater';
import { logger } from './logger';

app.setName('TidalFlow');

const isDev = Boolean(process.env.ELECTRON_RENDERER_URL);

// Flag to track if app is quitting (for close-to-tray behavior)
let isQuitting = false;

let mainWindow: BrowserWindow | null = null;

function createMainWindow(): BrowserWindow {
  logger.info("Creating main window");
  const win = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 920,
    minHeight: 640,
    title: 'TidalFlow',
    backgroundColor: '#f7f7f5',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.once('ready-to-show', () => {
    logger.info('Main window ready to show');
    win.show();
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  // Minimize to tray instead of closing
  win.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      win.hide();
      hidePanelWindow();
    }
  });

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return win;
}

void app.whenReady().then(async () => {
  registerSettingsIpcHandlers();

  mainWindow = createMainWindow();
  const panelWin = createPanelWindow();
  await createTray(mainWindow, panelWin);
  initAutoUpdater(mainWindow);

  // IPC handlers
  ipcMain.handle(IPC_CHANNELS.WINDOW_TOGGLE_PANEL, () => {
    togglePanelWindow();
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_SET_ALWAYS_ON_TOP, (_event, flag: boolean) => {
    const panel = getPanelWindow();
    if (panel && !panel.isDestroyed()) {
      panel.setAlwaysOnTop(flag);
    }
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_INSTALL, () => {
    quitAndInstall();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    }
  });

  app.on('before-quit', () => {
    logger.info('App quitting');
    isQuitting = true;
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Cleanup on quit
app.on('will-quit', () => {
  destroyPanelWindow();
  destroyTray();
});
