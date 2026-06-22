import { useCallback, useEffect, useRef, useState } from 'react'
import type { WsServerEvent } from '@tidalflow/shared'

export interface ActiveReminder {
  id: string;
  reminderType: string;
  message: string;
  logId: string;
  timestamp: number;
}

interface UseReminderResult {
  reminders: ActiveReminder[];
  dismissReminder: (id: string) => void;
}

const AUTO_DISMISS_MS = 10_000;

function createReminderId(logId: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${logId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useReminder(): UseReminderResult {
  const [reminders, setReminders] = useState<ActiveReminder[]>([]);
  const timersRef = useRef<Map<string, number>>(new Map());

  const dismissReminder = useCallback((id: string): void => {
    const timerId = timersRef.current.get(id);

    if (timerId) {
      window.clearTimeout(timerId);
      timersRef.current.delete(id);
    }

    setReminders((currentReminders) => currentReminders.filter((reminder) => reminder.id !== id));
  }, []);

  useEffect(() => {
    const unsubscribe = window.tidalflow.onWsEvent((event: WsServerEvent) => {
      if (event.type !== 'reminder:trigger') {
        return;
      }

      const reminder: ActiveReminder = {
        id: createReminderId(event.payload.logId),
        reminderType: event.payload.reminderType,
        message: event.payload.message,
        logId: event.payload.logId,
        timestamp: Date.now()
      };

      setReminders((currentReminders) => [reminder, ...currentReminders]);

      const timerId = window.setTimeout(() => {
        dismissReminder(reminder.id);
      }, AUTO_DISMISS_MS);

      timersRef.current.set(reminder.id, timerId);
    });

    return () => {
      unsubscribe();

      for (const timerId of timersRef.current.values()) {
        window.clearTimeout(timerId);
      }

      timersRef.current.clear();
    };
  }, [dismissReminder]);

  return { reminders, dismissReminder };
}
