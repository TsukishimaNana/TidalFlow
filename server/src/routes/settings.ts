import { Router } from 'express';
import { DEFAULT_SETTINGS } from '@tidalflow/shared';
import type { ApiResponse, AppSettings } from '@tidalflow/shared';

type SettingsUpdate = {
  workHours?: Partial<AppSettings['workHours']>;
  reminders?: Partial<AppSettings['reminders']>;
  feishu?: Partial<AppSettings['feishu']>;
};

const router = Router();

let settings: AppSettings = {
  workHours: { ...DEFAULT_SETTINGS.workHours },
  reminders: { ...DEFAULT_SETTINGS.reminders },
  feishu: { ...DEFAULT_SETTINGS.feishu },
};

function mergeSettings(current: AppSettings, update: SettingsUpdate): AppSettings {
  return {
    workHours: {
      ...current.workHours,
      ...update.workHours,
    },
    reminders: {
      ...current.reminders,
      ...update.reminders,
    },
    feishu: {
      ...current.feishu,
      ...update.feishu,
    },
  };
}

router.get<Record<string, string>, ApiResponse<AppSettings>>('/', (_req, res) => {
  res.json({
    success: true,
    data: settings,
  });
});

router.put<Record<string, string>, ApiResponse<AppSettings>, SettingsUpdate>('/', (req, res) => {
  settings = mergeSettings(settings, req.body);

  res.json({
    success: true,
    data: settings,
  });
});

export default router;
