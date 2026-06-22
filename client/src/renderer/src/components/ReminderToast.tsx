import { useEffect, useRef, useState } from 'react'
import type { ActiveReminder } from '../hooks/useReminder'

interface ReminderToastProps {
  reminders: ActiveReminder[];
  onDismiss: (id: string) => void;
}

interface RenderedReminder extends ActiveReminder {
  isExiting: boolean;
}

const EXIT_ANIMATION_MS = 220;

const REMINDER_ICONS: Record<string, string> = {
  water_stretch: '💧',
  medication: '💊',
  task_due: '⏰'
};

export default function ReminderToast({ reminders, onDismiss }: ReminderToastProps): JSX.Element | null {
  const [renderedReminders, setRenderedReminders] = useState<RenderedReminder[]>([]);
  const exitTimersRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const activeReminderIds = new Set(reminders.map((reminder) => reminder.id));

    setRenderedReminders((currentReminders) => {
      const currentById = new Map(currentReminders.map((reminder) => [reminder.id, reminder]));
      const activeReminders: RenderedReminder[] = reminders.map((reminder) => ({
        ...reminder,
        isExiting: false
      }));
      const exitingReminders = currentReminders
        .filter((reminder) => !activeReminderIds.has(reminder.id))
        .map((reminder) => ({
          ...reminder,
          isExiting: true
        }));

      for (const reminder of activeReminders) {
        const existingReminder = currentById.get(reminder.id);

        if (existingReminder?.isExiting) {
          const timerId = exitTimersRef.current.get(reminder.id);

          if (timerId) {
            window.clearTimeout(timerId);
            exitTimersRef.current.delete(reminder.id);
          }
        }
      }

      return [...activeReminders, ...exitingReminders];
    });
  }, [reminders]);

  useEffect(() => {
    for (const reminder of renderedReminders) {
      if (!reminder.isExiting || exitTimersRef.current.has(reminder.id)) {
        continue;
      }

      const timerId = window.setTimeout(() => {
        setRenderedReminders((currentReminders) =>
          currentReminders.filter((currentReminder) => currentReminder.id !== reminder.id)
        );
        exitTimersRef.current.delete(reminder.id);
      }, EXIT_ANIMATION_MS);

      exitTimersRef.current.set(reminder.id, timerId);
    }
  }, [renderedReminders]);

  useEffect(() => {
    return () => {
      for (const timerId of exitTimersRef.current.values()) {
        window.clearTimeout(timerId);
      }

      exitTimersRef.current.clear();
    };
  }, []);

  if (renderedReminders.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[70] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-3">
      {renderedReminders.map((reminder) => (
        <div
          key={reminder.id}
          className={`pointer-events-auto flex items-start gap-3 rounded-lg border border-amber-200 bg-white/95 p-3 text-stone-900 shadow-lg shadow-stone-900/10 backdrop-blur transition-all duration-200 ease-out ${
            reminder.isExiting
              ? 'translate-x-4 opacity-0'
              : 'translate-x-0 opacity-100 animate-[reminderToastIn_180ms_ease-out]'
          }`}
          role="status"
          aria-live="polite"
        >
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-lg">
            {REMINDER_ICONS[reminder.reminderType] ?? '⏰'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold capitalize text-amber-800">
              {reminder.reminderType.replace(/_/g, ' ')}
            </p>
            <p className="mt-1 break-words text-sm leading-5 text-stone-700">{reminder.message}</p>
          </div>
          <button
            type="button"
            onClick={() => onDismiss(reminder.id)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
            aria-label="Dismiss reminder"
          >
            X
          </button>
        </div>
      ))}
    </div>
  );
}
