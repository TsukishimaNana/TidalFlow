// @ts-expect-error node-cron v3 does not publish bundled TypeScript declarations.
import cron from 'node-cron';
import { CATEGORY_MAP, type Task } from '@tidalflow/shared';
import { getTasksByDateRange } from '../db/taskRepository';

type ScheduledTask = {
  stop(): void;
};

type FeishuTextMessage = {
  msg_type: 'text';
  content: {
    text: string;
  };
};

const feishuCronTasks: ScheduledTask[] = [];

function getLocalDateString(date: Date): string {
  const timezoneOffsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 10);
}

function formatTaskLine(task: Task): string {
  return `• [${CATEGORY_MAP[task.category].label}] ${task.title}`;
}

function formatTaskSection(title: string, tasks: Task[]): string {
  if (tasks.length === 0) {
    return `${title}：\n无`;
  }

  return `${title}：\n${tasks.map(formatTaskLine).join('\n')}`;
}

export async function sendFeishuMessage(content: FeishuTextMessage): Promise<boolean> {
  const webhookUrl = process.env.FEISHU_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn('FEISHU_WEBHOOK_URL is not configured');
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(content),
    });

    if (!response.ok) {
      console.error(`Feishu webhook failed: ${response.status} ${response.statusText}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Feishu webhook request failed', error);
    return false;
  }
}

export function sendMedicationReminder(): Promise<boolean> {
  return sendFeishuMessage({
    msg_type: 'text',
    content: {
      text: '💊 服药提醒：该吃药了！',
    },
  });
}

export function sendDailyTaskSummary(): Promise<boolean> {
  const today = getLocalDateString(new Date());
  const tasks = getTasksByDateRange(today, today);
  const pendingTasks = tasks.filter((task) => task.status === 'pending');
  const inProgressTasks = tasks.filter((task) => task.status === 'in_progress');
  const completedCount = tasks.filter((task) => task.status === 'completed').length;

  const message = [
    '📋 今日任务摘要',
    '',
    formatTaskSection('待完成', pendingTasks),
    '',
    formatTaskSection('进行中', inProgressTasks),
    '',
    `已完成：${completedCount}/${tasks.length}`,
  ].join('\n');

  return sendFeishuMessage({
    msg_type: 'text',
    content: {
      text: message,
    },
  });
}

export function startFeishuJobs(): void {
  stopFeishuJobs();

  feishuCronTasks.push(
    cron.schedule('10 9 * * 1-5', () => {
      void sendMedicationReminder().then(() => sendDailyTaskSummary());
    })
  );
}

export function stopFeishuJobs(): void {
  for (const task of feishuCronTasks) {
    task.stop();
  }

  feishuCronTasks.length = 0;
}
