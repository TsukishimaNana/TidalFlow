import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../../../shared/src/constants';
import type { Task } from '../../../../shared/src/types';
import { cacheService } from '../services/cacheService';

let handlersRegistered = false;

export function registerCacheHandlers(): void {
  if (handlersRegistered) {
    return;
  }

  ipcMain.handle(IPC_CHANNELS.CACHE_GET_TASKS, () => cacheService.getTasks());
  ipcMain.handle(IPC_CHANNELS.CACHE_SAVE_TASKS, (_event, tasks: Task[]) => {
    cacheService.saveTasks(tasks);
    return { success: true };
  });

  handlersRegistered = true;
}
