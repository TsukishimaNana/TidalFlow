import type { Task } from './types';

// ============================================
// WebSocket Event Types
// ============================================

// Server → Client events
export type WsServerEvent =
  | { type: 'reminder:trigger'; payload: { reminderType: string; message: string; logId: string } }
  | { type: 'task:created'; payload: Task }
  | { type: 'task:updated'; payload: Task }
  | { type: 'task:deleted'; payload: { id: string } }
  | { type: 'tasks:sync'; payload: Task[] } // 全量同步（重连后）
  | { type: 'server:shutdown'; payload: { message: string } };

// Client → Server events
export type WsClientEvent =
  | { type: 'auth'; payload: { apiKey: string } }
  | { type: 'ping' };

// ============================================
// Type Guards
// ============================================

export function isReminderTriggerEvent(event: WsServerEvent): event is Extract<WsServerEvent, { type: 'reminder:trigger' }> {
  return event.type === 'reminder:trigger';
}

export function isTaskCreatedEvent(event: WsServerEvent): event is Extract<WsServerEvent, { type: 'task:created' }> {
  return event.type === 'task:created';
}

export function isTaskUpdatedEvent(event: WsServerEvent): event is Extract<WsServerEvent, { type: 'task:updated' }> {
  return event.type === 'task:updated';
}

export function isTaskDeletedEvent(event: WsServerEvent): event is Extract<WsServerEvent, { type: 'task:deleted' }> {
  return event.type === 'task:deleted';
}

export function isTasksSyncEvent(event: WsServerEvent): event is Extract<WsServerEvent, { type: 'tasks:sync' }> {
  return event.type === 'tasks:sync';
}

export function isServerShutdownEvent(event: WsServerEvent): event is Extract<WsServerEvent, { type: 'server:shutdown' }> {
  return event.type === 'server:shutdown';
}

export function isAuthClientEvent(event: WsClientEvent): event is Extract<WsClientEvent, { type: 'auth' }> {
  return event.type === 'auth';
}

export function isPingClientEvent(event: WsClientEvent): event is Extract<WsClientEvent, { type: 'ping' }> {
  return event.type === 'ping';
}

// ============================================
// WebSocket Event Factory
// ============================================

export function createReminderTriggerEvent(reminderType: string, message: string, logId: string): WsServerEvent {
  return {
    type: 'reminder:trigger',
    payload: { reminderType, message, logId }
  };
}

export function createTaskCreatedEvent(task: Task): WsServerEvent {
  return {
    type: 'task:created',
    payload: task
  };
}

export function createTaskUpdatedEvent(task: Task): WsServerEvent {
  return {
    type: 'task:updated',
    payload: task
  };
}

export function createTaskDeletedEvent(taskId: string): WsServerEvent {
  return {
    type: 'task:deleted',
    payload: { id: taskId }
  };
}

export function createTasksSyncEvent(tasks: Task[]): WsServerEvent {
  return {
    type: 'tasks:sync',
    payload: tasks
  };
}

export function createAuthClientEvent(apiKey: string): WsClientEvent {
  return {
    type: 'auth',
    payload: { apiKey }
  };
}

export function createPingClientEvent(): WsClientEvent {
  return {
    type: 'ping'
  };
}