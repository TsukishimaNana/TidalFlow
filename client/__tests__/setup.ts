import '@testing-library/jest-dom'

// Mock electron modules
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(),
    getName: vi.fn(),
    getVersion: vi.fn(),
    isReady: vi.fn(() => true),
    on: vi.fn(),
  },
  ipcRenderer: {
    on: vi.fn(),
    send: vi.fn(),
    invoke: vi.fn(),
  },
  shell: {
    openExternal: vi.fn(),
  },
}))

// Mock electron-store
vi.mock('electron-store', () => ({
  default: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}))

// Mock shared package
vi.mock('@tidalflow/shared', () => ({
  DEFAULT_SERVER_URL: 'http://localhost:3000',
  CATEGORY_MAP: {
    programming: { label: '编程🖥️', emoji: '🖥️' },
    drawing: { label: '绘画🎨', emoji: '🎨' },
    life: { label: '生活🏠', emoji: '🏠' },
    health: { label: '健康💪', emoji: '💪' },
    other: { label: '其他📌', emoji: '📌' },
  },
  DEFAULT_SETTINGS: {
    workHours: { start: '10:00', end: '17:00', lunchStart: '12:00', lunchEnd: '13:40' },
    reminders: { waterStretchIntervalMinutes: 45, medicationTime: '09:10', enabled: true },
    feishu: { webhookUrl: '', dailyReminderEnabled: true },
  },
  IPC_CHANNELS: {
    WINDOW_TOGGLE_PANEL: 'window:toggle-panel',
    WS_EVENT: 'ws:event',
    CACHE_GET_TASKS: 'cache:get-tasks',
    CACHE_SAVE_TASKS: 'cache:save-tasks',
  },
  createAuthClientEvent: (apiKey: string) => ({ type: 'auth', payload: { apiKey } }),
  createPingClientEvent: () => ({ type: 'ping' }),
}))

// Mock window.tidalflow (preload bridge) — default: everything succeeds
const tidalflowMock = {
  getTodayTasks: vi.fn(() => Promise.resolve({ success: true, data: [] })),
  createTask: vi.fn((data: unknown) =>
    Promise.resolve({ success: true, data: { id: 't-new', title: (data as any)?.title ?? '', status: 'pending', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } }),
  ),
  updateTask: vi.fn((_id: string, _data: unknown) =>
    Promise.resolve({ success: true, data: { id: _id, title: 'updated', status: 'in_progress' } }),
  ),
  deleteTask: vi.fn(() => Promise.resolve({ success: true })),
  completeTask: vi.fn((id: string) =>
    Promise.resolve({ success: true, data: { id, title: 'done', status: 'completed', completedAt: new Date().toISOString() } }),
  ),
  postponeTask: vi.fn((id: string) =>
    Promise.resolve({ success: true, data: { id, title: 'postponed', status: 'postponed' } }),
  ),
  connectWs: vi.fn(() => Promise.resolve()),
  disconnectWs: vi.fn(() => Promise.resolve()),
  onWsEvent: vi.fn(() => () => {}), // returns unsubscribe
  saveCachedTasks: vi.fn(() => Promise.resolve()),
  getCachedTasks: vi.fn(() => Promise.resolve([])),
}

Object.defineProperty(window, 'tidalflow', { value: tidalflowMock, writable: true })
