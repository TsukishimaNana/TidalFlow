import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { ApiResponse, CreateTaskInput, Task, UpdateTaskInput, WsServerEvent } from 'shared'
import { logger } from '../utils/logger'

interface AppContextValue {
  tasks: Task[];
  isLoading: boolean;
  isConnected: boolean;
  error: string | null;
  refreshTasks: () => Promise<void>;
  createTask: (data: CreateTaskInput) => Promise<Task>;
  updateTask: (id: string, data: Partial<UpdateTaskInput>) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  completeTask: (id: string) => Promise<Task>;
  postponeTask: (id: string) => Promise<Task>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  setTasksOptimistically: (updater: (tasks: Task[]) => Task[]) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function getResponseError<T>(response: ApiResponse<T>, fallback: string): string {
  return response.error ?? fallback;
}

function upsertTask(tasks: Task[], task: Task): Task[] {
  const existingIndex = tasks.findIndex((item) => item.id === task.id);

  if (existingIndex === -1) {
    return [task, ...tasks];
  }

  return tasks.map((item) => (item.id === task.id ? task : item));
}

function getUnknownErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim().length > 0) {
    return error;
  }

  return fallback;
}

function getThrowableError(error: unknown, fallback: string): Error {
  return error instanceof Error ? error : new Error(fallback);
}

async function persistTasks(tasks: Task[]): Promise<void> {
  try {
    await window.tidalflow.saveCachedTasks(tasks);
  } catch {
    // Cache writes are best effort and should not block task interactions.
  }
}

async function readCachedTasks(): Promise<Task[]> {
  try {
    return await window.tidalflow.getCachedTasks();
  } catch {
    return [];
  }
}

export function AppProvider({ children }: { children: ReactNode }): JSX.Element {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tasksRef = useRef<Task[]>([]);
  const isConnectedRef = useRef(false);

  const setConnectionState = useCallback((connected: boolean, reason: string, shouldLog = false): void => {
    if (isConnectedRef.current !== connected && shouldLog) {
      if (connected) {
        logger.info(`WebSocket connected (${reason})`);
      } else {
        logger.warn(`WebSocket disconnected (${reason})`);
      }
    }

    isConnectedRef.current = connected;
    setIsConnected(connected);
  }, []);

  const applyTasks = useCallback((updater: Task[] | ((currentTasks: Task[]) => Task[])) => {
    setTasks((currentTasks) => {
      const nextTasks = typeof updater === 'function' ? updater(currentTasks) : updater;
      tasksRef.current = nextTasks;
      void persistTasks(nextTasks);
      return nextTasks;
    });
  }, []);

  const setTasksOptimistically = useCallback(
    (updater: (currentTasks: Task[]) => Task[]) => {
      applyTasks(updater);
    },
    [applyTasks]
  );

  const loadCachedTasks = useCallback(async (): Promise<Task[]> => {
    const cachedTasks = await readCachedTasks();
    tasksRef.current = cachedTasks;
    setTasks(cachedTasks);
    return cachedTasks;
  }, []);

  const refreshTasks = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await window.tidalflow.getTodayTasks();

      if (!response.success || !response.data) {
        throw new Error(getResponseError(response, 'Failed to load today\'s tasks'));
      }

      applyTasks(response.data);
      setConnectionState(true, 'tasks refreshed');
    } catch (refreshError) {
      setConnectionState(false, 'task refresh failed');
      const cachedTasks = await loadCachedTasks();
      setError(
        cachedTasks.length > 0
          ? 'Offline. Showing cached tasks.'
          : refreshError instanceof Error
            ? refreshError.message
            : 'Failed to load today\'s tasks'
      );
    } finally {
      setIsLoading(false);
    }
  }, [applyTasks, loadCachedTasks, setConnectionState]);

  const connect = useCallback(async (): Promise<void> => {
    try {
      await window.tidalflow.connectWs();
      setConnectionState(true, 'connect requested', true);
    } catch (connectError) {
      const message = getUnknownErrorMessage(connectError, 'Failed to connect to realtime updates');

      setConnectionState(false, 'connect failed', true);
      setError(message);
      logger.error('WebSocket connection failed', connectError);
    }
  }, [setConnectionState]);

  const disconnect = useCallback(async (): Promise<void> => {
    try {
      await window.tidalflow.disconnectWs();
    } finally {
      setConnectionState(false, 'disconnect requested', true);
    }
  }, [setConnectionState]);

  const createTask = useCallback(
    async (data: CreateTaskInput): Promise<Task> => {
      setError(null);

      try {
        const response = await window.tidalflow.createTask(data);

        if (!response.success || !response.data) {
          throw new Error(getResponseError(response, 'Failed to create task'));
        }

        applyTasks((currentTasks) => upsertTask(currentTasks, response.data as Task));
        return response.data;
      } catch (createError) {
        const message = getUnknownErrorMessage(createError, 'Failed to create task');

        setError(message);
        logger.error('Create task failed', createError);
        throw getThrowableError(createError, message);
      }
    },
    [applyTasks]
  );

  const updateTask = useCallback(
    async (id: string, data: Partial<UpdateTaskInput>): Promise<Task> => {
      setError(null);

      try {
        const response = await window.tidalflow.updateTask(id, data);

        if (!response.success || !response.data) {
          throw new Error(getResponseError(response, 'Failed to update task'));
        }

        applyTasks((currentTasks) => upsertTask(currentTasks, response.data as Task));
        return response.data;
      } catch (updateError) {
        const message = getUnknownErrorMessage(updateError, 'Failed to update task');

        setError(message);
        logger.error('Update task failed', updateError, { taskId: id });
        throw getThrowableError(updateError, message);
      }
    },
    [applyTasks]
  );

  const deleteTask = useCallback(
    async (id: string): Promise<void> => {
      setError(null);
      const previousTasks = tasksRef.current;
      applyTasks((currentTasks) => currentTasks.filter((task) => task.id !== id));

      try {
        const response = await window.tidalflow.deleteTask(id);

        if (!response.success) {
          throw new Error(getResponseError(response, 'Failed to delete task'));
        }
      } catch (deleteError) {
        const message = getUnknownErrorMessage(deleteError, 'Failed to delete task');

        applyTasks(previousTasks);
        setError(message);
        logger.error('Delete task failed', deleteError, { taskId: id });
        throw getThrowableError(deleteError, message);
      }
    },
    [applyTasks]
  );

  const completeTask = useCallback(
    async (id: string): Promise<Task> => {
      setError(null);

      try {
        const response = await window.tidalflow.completeTask(id);

        if (!response.success || !response.data) {
          throw new Error(getResponseError(response, 'Failed to complete task'));
        }

        applyTasks((currentTasks) => upsertTask(currentTasks, response.data as Task));
        return response.data;
      } catch (completeError) {
        const message = getUnknownErrorMessage(completeError, 'Failed to complete task');

        setError(message);
        logger.error('Complete task failed', completeError, { taskId: id });
        throw getThrowableError(completeError, message);
      }
    },
    [applyTasks]
  );

  const postponeTask = useCallback(
    async (id: string): Promise<Task> => {
      setError(null);

      try {
        const response = await window.tidalflow.postponeTask(id);

        if (!response.success || !response.data) {
          throw new Error(getResponseError(response, 'Failed to postpone task'));
        }

        applyTasks((currentTasks) => upsertTask(currentTasks, response.data as Task));
        return response.data;
      } catch (postponeError) {
        const message = getUnknownErrorMessage(postponeError, 'Failed to postpone task');

        setError(message);
        logger.error('Postpone task failed', postponeError, { taskId: id });
        throw getThrowableError(postponeError, message);
      }
    },
    [applyTasks]
  );

  useEffect(() => {
    void refreshTasks();
    void connect();
  }, [connect, refreshTasks]);

  useEffect(() => {
    const unsubscribe = window.tidalflow.onWsEvent((event: WsServerEvent) => {
      if (event.type === 'task:created') {
        setConnectionState(true, 'task created event', true);
        applyTasks((currentTasks) => upsertTask(currentTasks, event.payload));
        return;
      }

      if (event.type === 'task:updated') {
        setConnectionState(true, 'task updated event', true);
        applyTasks((currentTasks) => upsertTask(currentTasks, event.payload));
        return;
      }

      if (event.type === 'task:deleted') {
        setConnectionState(true, 'task deleted event', true);
        applyTasks((currentTasks) => currentTasks.filter((task) => task.id !== event.payload.id));
        return;
      }

      if (event.type === 'tasks:sync') {
        setConnectionState(true, 'tasks sync event', true);
        applyTasks(event.payload);
        return;
      }

      if (event.type === 'server:shutdown') {
        setConnectionState(false, 'server shutdown event', true);
        void loadCachedTasks();
      }
    });

    return unsubscribe;
  }, [applyTasks, loadCachedTasks, setConnectionState]);

  const value = useMemo<AppContextValue>(
    () => ({
      tasks,
      isLoading,
      isConnected,
      error,
      refreshTasks,
      createTask,
      updateTask,
      deleteTask,
      completeTask,
      postponeTask,
      connect,
      disconnect,
      setTasksOptimistically
    }),
    [
      completeTask,
      connect,
      createTask,
      deleteTask,
      disconnect,
      error,
      isConnected,
      isLoading,
      postponeTask,
      refreshTasks,
      setTasksOptimistically,
      tasks,
      updateTask
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }

  return context;
}
