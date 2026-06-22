import { createReminderTriggerEvent, type ReminderLog } from '@tidalflow/shared';
import { createReminderLog, updateReminderResponse } from '../db/reminderRepository';
import { broadcastToClients } from '../ws/wsServer';

type ReminderResponseType = 'done' | 'postponed' | 'ignored';

const WATER_STRETCH_MESSAGE = '💧 该喝水伸展了！已经连续工作45分钟，站起来活动一下吧~';
const MEDICATION_MESSAGE = '💊 吃药时间到！记得按时服药哦~';

function triggerReminder(
  reminderType: ReminderLog['reminderType'],
  message: string
): ReminderLog {
  const log = createReminderLog(reminderType);
  broadcastToClients(createReminderTriggerEvent(reminderType, message, log.id));
  return log;
}

export function triggerWaterStretchReminder(): ReminderLog {
  return triggerReminder('water_stretch', WATER_STRETCH_MESSAGE);
}

export function triggerMedicationReminder(): ReminderLog {
  return triggerReminder('medication', MEDICATION_MESSAGE);
}

export function triggerTaskDueReminder(taskTitle: string): ReminderLog {
  return triggerReminder('task_due', `⏰ 任务即将到期：${taskTitle}`);
}

export function respondToReminder(
  logId: string,
  responseType: ReminderResponseType
): ReminderLog | null {
  return updateReminderResponse(logId, responseType);
}
