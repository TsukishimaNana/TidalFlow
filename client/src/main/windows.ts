import { join } from 'node:path';
import { BrowserWindow, shell } from 'electron';

const isDev = Boolean(process.env.ELECTRON_RENDERER_URL);

export const preloadPath = join(__dirname, '../preload/index.js');

export function loadRenderer(window: BrowserWindow, route = ''): void {
  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(`${process.env.ELECTRON_RENDERER_URL}${route}`);
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'), {
      hash: route.startsWith('#') ? route.slice(1) : route
    });
  }
}

export function openExternalLinksInBrowser(window: BrowserWindow): void {
  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });
}

export function createUtilityWindow(): BrowserWindow {
  const utilityWindow = new BrowserWindow({
    width: 380,
    height: 560,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    roundedCorners: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    show: false,
    title: 'TidalFlow Utility',
    webPreferences: {
      preload: preloadPath,
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  utilityWindow.once('ready-to-show', () => {
    utilityWindow.show();
  });

  openExternalLinksInBrowser(utilityWindow);
  loadRenderer(utilityWindow, '#utility');

  return utilityWindow;
}
