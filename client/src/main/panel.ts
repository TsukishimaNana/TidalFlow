import { join } from 'node:path';
import { BrowserWindow, screen } from 'electron';

const isDev = Boolean(process.env.ELECTRON_RENDERER_URL);

let panelWindow: BrowserWindow | null = null;

export function createPanelWindow(): BrowserWindow {
  if (panelWindow && !panelWindow.isDestroyed()) {
    panelWindow.focus();
    return panelWindow;
  }

  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

  panelWindow = new BrowserWindow({
    width: 380,
    height: 560,
    x: screenWidth - 380 - 16,
    y: 16,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    roundedCorners: true,
    title: 'TidalFlow Panel',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  panelWindow.on('blur', () => {
    // Optionally hide on blur — kept as no-op for now
  });

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    void panelWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}?view=panel`);
  } else {
    void panelWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      query: { view: 'panel' }
    });
  }

  return panelWindow;
}

export function getPanelWindow(): BrowserWindow | null {
  return panelWindow;
}

export function togglePanelWindow(): void {
  if (!panelWindow || panelWindow.isDestroyed()) {
    createPanelWindow();
    return;
  }

  if (panelWindow.isVisible()) {
    panelWindow.hide();
  } else {
    panelWindow.show();
    panelWindow.focus();
  }
}

export function hidePanelWindow(): void {
  if (panelWindow && !panelWindow.isDestroyed()) {
    panelWindow.hide();
  }
}

export function destroyPanelWindow(): void {
  if (panelWindow && !panelWindow.isDestroyed()) {
    panelWindow.destroy();
    panelWindow = null;
  }
}
