/// <reference types="vite/client" />

import type { ApiResponse, AppSettings, CreateTaskInput, Task, UpdateTaskInput, WsServerEvent } from 'shared';

type QueryParams = Record<string, string>;
type WsEventCallback = (event: WsServerEvent) => void;

interface TidalFlowApi {
  platform: string;
  versions: {
    chrome?: string;
    electron?: string;
    node?: string;
  };
  getTasks(params?: QueryParams): Promise<ApiResponse<Task[]>>;
  getTodayTasks(): Promise<ApiResponse<Task[]>>;
  getTask(id: string): Promise<ApiResponse<Task>>;
  createTask(data: CreateTaskInput): Promise<ApiResponse<Task>>;
  updateTask(id: string, data: Partial<UpdateTaskInput>): Promise<ApiResponse<Task>>;
  deleteTask(id: string): Promise<ApiResponse<void>>;
  completeTask(id: string): Promise<ApiResponse<Task>>;
  postponeTask(id: string): Promise<ApiResponse<Task>>;
  getSettings(): Promise<ApiResponse<AppSettings>>;
  updateSettings(data: Partial<AppSettings>): Promise<ApiResponse<AppSettings>>;
  connectWs(url?: string, apiKey?: string): Promise<void>;
  disconnectWs(): Promise<void>;
  onWsEvent(callback: WsEventCallback): () => void;
  getCachedTasks(): Promise<Task[]>;
  saveCachedTasks(tasks: Task[]): Promise<void>;
}

declare global {
  interface Window {
    tidalflow: TidalFlowApi;
  }
}

export {};
