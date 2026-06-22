import { join } from 'node:path';
import AutoLaunch from 'auto-launch';
import { type App, type BrowserWindow, Menu, Tray } from 'electron';

let tray: Tray | null = null;
let autoLauncher: AutoLaunch | null = null;
let forceQuit = false;

function showWindow(window: BrowserWindow): void {
  if (window.isMinimized()) {
    window.restore();
  }

  window.show();
  window.focus();
}

function getIconPath(app: App): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'build', 'icon.png');
  }

  return join(app.getAppPath(), 'build', 'icon.png');
}

function setAutoLaunch(enabled: boolean): void {
  if (!autoLauncher) {
    return;
  }

  if (enabled) {
    void autoLauncher.enable().catch(() => undefined);
  } else {
    void autoLauncher.disable().catch(() => undefined);
  }
}

function ensureAutoLaunchEnabled(): void {
  if (!autoLauncher) {
    return;
  }

  void autoLauncher
    .isEnabled()
    .then((enabled) => {
      if (!enabled) {
        return autoLauncher?.enable();
      }

      return undefined;
    })
    .catch(() => undefined);
}

export function shouldForceQuit(): boolean {
  return forceQuit;
}

export function setupTray(mainWindow: BrowserWindow, app: App): void {
  app.setName('TidalFlow');

  if (!autoLauncher) {
    autoLauncher = new AutoLaunch({
      name: app.getName(),
      isHidden: true
    });
    ensureAutoLaunchEnabled();
  }

  if (!tray) {
    tray = new Tray(getIconPath(app));
    tray.setToolTip('TidalFlow');
  }

  tray.removeAllListeners('double-click');
  tray.on('double-click', () => {
    showWindow(mainWindow);
  });

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Window',
      click: () => {
        showWindow(mainWindow);
      }
    },
    { type: 'separator' },
    {
      label: 'Auto Launch',
      type: 'checkbox',
      checked: true,
      click: (menuItem) => {
        setAutoLaunch(menuItem.checked);
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        forceQuit = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
}
