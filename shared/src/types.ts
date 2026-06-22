// ============================================
// Task Types
// ============================================
export interface Task {
  id: string;
  title: string;
  description: string;
  category: 'programming' | 'drawing' | 'life' | 'health' | 'other';
  status: 'pending' | 'in_progress' | 'completed' | 'postponed';
  priority: number; // 0=普通, 1=重要, 2=紧急
  scheduledDate: string | null; // YYYY-MM-DD
  dueDate: string | null; // YYYY-MM-DD
  estimatedMinutes: number | null;
  parentTaskId: string | null; // Phase 3+
  phaseOrder: number | null; // Phase 3+
  source: 'manual' | 'feishu' | 'ai_decomposed';
  isRecurring: boolean;
  recurringRule: string | null; // Phase 3+
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  completedAt: string | null; // ISO 8601
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  category?: Task['category'];
  priority?: number;
  scheduledDate?: string;
  dueDate?: string;
  estimatedMinutes?: number;
}

export interface UpdateTaskInput {
  id: string;
  title?: string;
  description?: string;
  category?: Task['category'];
  status?: Task['status'];
  priority?: number;
  scheduledDate?: string | null;
  dueDate?: string | null;
  estimatedMinutes?: number | null;
}

// ============================================
// Reminder Types
// ============================================
export interface ReminderLog {
  id: string;
  reminderType: 'water_stretch' | 'medication' | 'task_due';
  triggeredAt: string; // ISO 8601
  respondedAt: string | null; // ISO 8601
  responseType: 'done' | 'postponed' | 'ignored' | null;
}

// ============================================
// API Response Types
// ============================================
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================
// Settings Types
// ============================================
export interface AppSettings {
  workHours: {
    start: string; // "10:00"
    end: string; // "17:00"
    lunchStart: string; // "12:00"
    lunchEnd: string; // "13:40"
  };
  reminders: {
    waterStretchIntervalMinutes: number;
    medicationTime: string; // "09:10"
    enabled: boolean;
  };
  feishu: {
    webhookUrl: string;
    dailyReminderEnabled: boolean;
  };
}