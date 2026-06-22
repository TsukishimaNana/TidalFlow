import { useEffect, useState } from 'react';
import { DEFAULT_SETTINGS } from '@shared';
import type { AppSettings } from '@shared';

type UseSettingsResult = {
  settings: AppSettings;
  saveSettings: (settings: AppSettings) => Promise<AppSettings>;
  loading: boolean;
  error: string | null;
};

const SETTINGS_STORAGE_KEY = 'tidalflow:settings';

function getStoredSettings(): AppSettings {
  const storedSettings = window.localStorage.getItem(SETTINGS_STORAGE_KEY);

  if (!storedSettings) {
    return DEFAULT_SETTINGS;
  }

  try {
    return mergeSettings(JSON.parse(storedSettings) as Partial<AppSettings>);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

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

export function useSettings(): UseSettingsResult {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSettings(): Promise<void> {
      setLoading(true);
      setError(null);

      try {
        const loadedSettings = window.tidalflow.settings
          ? await window.tidalflow.settings.get()
          : getStoredSettings();

        if (isMounted) {
          setSettings(mergeSettings(loadedSettings));
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : '设置加载失败');
          setSettings(getStoredSettings());
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  async function saveSettings(nextSettings: AppSettings): Promise<AppSettings> {
    setError(null);

    try {
      const savedSettings = window.tidalflow.settings
        ? await window.tidalflow.settings.save(nextSettings)
        : nextSettings;
      const mergedSettings = mergeSettings(savedSettings);

      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(mergedSettings));
      setSettings(mergedSettings);
      return mergedSettings;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '设置保存失败');
      throw saveError;
    }
  }

  return { settings, saveSettings, loading, error };
}
