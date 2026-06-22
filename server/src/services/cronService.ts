// @ts-expect-error node-cron v3 does not publish bundled TypeScript declarations.
import cron from 'node-cron';
import { DEFAULT_SETTINGS } from '@tidalflow/shared';
import { getTasksByDateRange } from '../db/taskRepository';
import { triggerTaskDueReminder, triggerWaterStretchReminder } from './reminderService';

type ScheduledTask = {
  stop(): void;
};

const cronTasks: ScheduledTask[] = [];
let remindedTaskIds = new Set<string>();
let remindedTaskDate = '';

function getLocalDateString(date: Date): string {
  const timezoneOffsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 10);
}

function getLocalTimeString(date: Date): string {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

function isTimeInRange(time: string, start: string, end: string): boolean {
  return time >= start && time < end;
}

function isWithinReminderWindow(date: Date): boolean {
  const time = getLocalTimeString(date);
  const { workHours } = DEFAULT_SETTINGS;

  return (
    isTimeInRange(time, workHours.start, workHours.end) &&
    !isTimeInRange(time, workHours.lunchStart, workHours.lunchEnd)
  );
}

function resetDailyTaskReminderSet(today: string): void {
  if (remindedTaskDate !== today) {
    remindedTaskDate = today;
    remindedTaskIds = new Set<string>();
  }
}

export function startCronJobs(): void {
  stopCronJobs();

  cronTasks.push(
    cron.schedule('*/45 * * * 1-5', () => {
      if (isWithinReminderWindow(new Date())) {
        triggerWaterStretchReminder();
      }
    })
  );

  cronTasks.push(
    cron.schedule('*/5 * * * *', () => {
      const today = getLocalDateString(new Date());
      resetDailyTaskReminderSet(today);

      const tasks = getTasksByDateRange(today, today).filter((task) =>
        task.status === 'pending' || task.status === 'in_progress'
      );

      for (const task of tasks) {
        if (!remindedTaskIds.has(task.id)) {
          triggerTaskDueReminder(task.title);
          remindedTaskIds.add(task.id);
        }
      }
    })
  );
}

export function stopCronJobs(): void {
  for (const task of cronTasks) {
    task.stop();
  }

  cronTasks.length = 0;
}
