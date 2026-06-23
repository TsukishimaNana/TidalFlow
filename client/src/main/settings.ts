import { ipcMain } from 'electron';
import Store from 'electron-store';
import { DEFAULT_SETTINGS, IPC_CHANNELS } from '@tidalflow/shared';
import type { AppSettings } from '@tidalflow/shared';

type SettingsStore = {
  settings: AppSettings;
};

const store = new Store<SettingsStore>({
  name: 'settings',
  defaults: {
    settings: DEFAULT_SETTINGS
  }
});

function mergeSettings(settings: Partial<AppSettings> | undefined): AppSettings {
  return {
    server: {
      ...DEFAULT_SETTINGS.server,
      ...settings?.server
    },
    workHours: {
      ...DEFAULT_SETTINGS.workHours,
      ...settings?.workHours
    },
    reminders: {
      ...DEFAULT_SETTINGS.reminders,
      ...settings?.reminders
    },
    feishu: {
      ...DEFAULT_SETTINGS.feishu,
      ...settings?.feishu
    }
  };
}

export function getSettings(): AppSettings {
  return mergeSettings(store.get('settings'));
}

export function saveSettings(settings: AppSettings): AppSettings {
  const savedSettings = mergeSettings(settings);
  store.set('settings', savedSettings);
  return savedSettings;
}

export function registerSettingsIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, () => getSettings());
  ipcMain.handle(IPC_CHANNELS.SETTINGS_SAVE, (_event, settings: AppSettings) => saveSettings(settings));
}
