import { app, BrowserWindow, Menu, nativeImage, Tray } from 'electron';
import AutoLaunch from 'auto-launch' with { type: 'commonjs' };
import { IPC_CHANNELS } from '@tidalflow/shared';
import { togglePanelWindow } from './panel';

const AUTO_LAUNCH_NAME = 'TidalFlow';

const autoLauncher = new AutoLaunch({
  name: AUTO_LAUNCH_NAME,
  isHidden: true
});

let tray: Tray | null = null;
let mainWindow: BrowserWindow | null = null;
let autoLaunchEnabled = false;

function createTrayIcon(): Electron.NativeImage {
  // Generate a simple teal circle icon programmatically (16×16)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
    <circle cx="8" cy="8" r="7" fill="#0d9488"/>
    <text x="8" y="12" text-anchor="middle" fill="white" font-size="10" font-family="Arial" font-weight="bold">T</text>
  </svg>`;

  const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  const icon = nativeImage.createFromDataURL(dataUrl);
  return icon.resize({ width: 16, height: 16 });
}

function buildContextMenu(): Menu {
  return Menu.buildFromTemplate([
    {
      label: '显示面板',
      click: () => {
        togglePanelWindow();
      }
    },
    {
      label: '设置',
      click: () => {
        showSettingsWindow();
      }
    },
    { type: 'separator' },
    {
      label: '开机自启',
      type: 'checkbox',
      checked: autoLaunchEnabled,
      click: (_menuItem) => {
        autoLaunchEnabled = !autoLaunchEnabled;
        if (autoLaunchEnabled) {
          void autoLauncher.enable();
        } else {
          void autoLauncher.disable();
        }
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.quit();
      }
    }
  ]);
}

function showSettingsWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();

  const sendShowSettings = (): void => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.WINDOW_SHOW_SETTINGS, 'settings');
    }
  };

  if (mainWindow.webContents.isLoading()) {
    mainWindow.webContents.once('did-finish-load', sendShowSettings);
    return;
  }

  sendShowSettings();
}

export async function createTray(
  appWindow: BrowserWindow,
  _panelWindow: BrowserWindow
): Promise<void> {
  mainWindow = appWindow;
  const icon = createTrayIcon();
  tray = new Tray(icon);
  tray.setToolTip('TidalFlow');

  // Check auto-launch state
  try {
    autoLaunchEnabled = await autoLauncher.isEnabled();
  } catch {
    autoLaunchEnabled = false;
  }

  tray.setContextMenu(buildContextMenu());

  tray.on('click', () => {
    togglePanelWindow();
  });
}

export function getTray(): Tray | null {
  return tray;
}

export function destroyTray(): void {
  if (tray && !tray.isDestroyed()) {
    tray.destroy();
    tray = null;
  }
}
