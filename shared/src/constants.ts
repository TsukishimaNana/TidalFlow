// ============================================
// Category Mapping
// ============================================
export const CATEGORY_MAP = {
  programming: { label: '编程🖥️', emoji: '🖥️' },
  drawing: { label: '绘画🎨', emoji: '🎨' },
  life: { label: '生活🏠', emoji: '🏠' },
  health: { label: '健康💪', emoji: '💪' },
  other: { label: '其他📌', emoji: '📌' }
} as const;

export const CATEGORY_LABELS = Object.values(CATEGORY_MAP).map(c => c.label);

// ============================================
// Default Settings
// ============================================
export const DEFAULT_SETTINGS: AppSettings = {
  workHours: {
    start: '10:00',
    end: '17:00',
    lunchStart: '12:00',
    lunchEnd: '13:40'
  },
  reminders: {
    waterStretchIntervalMinutes: 45,
    medicationTime: '09:10',
    enabled: true
  },
  feishu: {
    webhookUrl: '',
    dailyReminderEnabled: true
  }
};

// ============================================
// IPC Channel Names
// ============================================
export const IPC_CHANNELS = {
  // Window operations
  WINDOW_TOGGLE_PANEL: 'window:toggle-panel',
  WINDOW_SET_ALWAYS_ON_TOP: 'window:set-always-on-top',

  // API proxy
  API_GET: 'api:get',
  API_POST: 'api:post',
  API_PATCH: 'api:patch',
  API_DELETE: 'api:delete',

  // WebSocket events
  WS_EVENT: 'ws:event',

  // Cache
  CACHE_GET_TASKS: 'cache:get-tasks',
  CACHE_SAVE_TASKS: 'cache:save-tasks'
} as const;

// ============================================
// API Base URL (client default)
// ============================================
export const DEFAULT_SERVER_URL = 'http://localhost:3000';

// ============================================
// Default reminder interval (seconds)
// ============================================
export const DEFAULT_REMINDER_INTERVAL_SECONDS = 45 * 60; // 45 minutes

// ============================================
// Re-export types for convenience
// ============================================
import type { AppSettings } from './types';