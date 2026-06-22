import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { ApiResponse, CreateTaskInput, Task, UpdateTaskInput, WsServerEvent } from 'shared';

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
      setIsConnected(true);
    } catch (refreshError) {
      setIsConnected(false);
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
  }, [applyTasks, loadCachedTasks]);

  const connect = useCallback(async (): Promise<void> => {
    try {
      await window.tidalflow.connectWs();
      setIsConnected(true);
    } catch (connectError) {
      setIsConnected(false);
      setError(connectError instanceof Error ? connectError.message : 'Failed to connect to realtime updates');
    }
  }, []);

  const disconnect = useCallback(async (): Promise<void> => {
    try {
      await window.tidalflow.disconnectWs();
    } finally {
      setIsConnected(false);
    }
  }, []);

  const createTask = useCallback(
    async (data: CreateTaskInput): Promise<Task> => {
      setError(null);
      const response = await window.tidalflow.createTask(data);

      if (!response.success || !response.data) {
        const message = getResponseError(response, 'Failed to create task');
        setError(message);
        throw new Error(message);
      }

      applyTasks((currentTasks) => upsertTask(currentTasks, response.data as Task));
      return response.data;
    },
    [applyTasks]
  );

  const updateTask = useCallback(
    async (id: string, data: Partial<UpdateTaskInput>): Promise<Task> => {
      setError(null);
      const response = await window.tidalflow.updateTask(id, data);

      if (!response.success || !response.data) {
        const message = getResponseError(response, 'Failed to update task');
        setError(message);
        throw new Error(message);
      }

      applyTasks((currentTasks) => upsertTask(currentTasks, response.data as Task));
      return response.data;
    },
    [applyTasks]
  );

  const deleteTask = useCallback(
    async (id: string): Promise<void> => {
      setError(null);
      const previousTasks = tasksRef.current;
      applyTasks((currentTasks) => currentTasks.filter((task) => task.id !== id));

      const response = await window.tidalflow.deleteTask(id);

      if (!response.success) {
        const message = getResponseError(response, 'Failed to delete task');
        applyTasks(previousTasks);
        setError(message);
        throw new Error(message);
      }
    },
    [applyTasks]
  );

  const completeTask = useCallback(
    async (id: string): Promise<Task> => {
      setError(null);
      const response = await window.tidalflow.completeTask(id);

      if (!response.success || !response.data) {
        const message = getResponseError(response, 'Failed to complete task');
        setError(message);
        throw new Error(message);
      }

      applyTasks((currentTasks) => upsertTask(currentTasks, response.data as Task));
      return response.data;
    },
    [applyTasks]
  );

  const postponeTask = useCallback(
    async (id: string): Promise<Task> => {
      setError(null);
      const response = await window.tidalflow.postponeTask(id);

      if (!response.success || !response.data) {
        const message = getResponseError(response, 'Failed to postpone task');
        setError(message);
        throw new Error(message);
      }

      applyTasks((currentTasks) => upsertTask(currentTasks, response.data as Task));
      return response.data;
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
        setIsConnected(true);
        applyTasks((currentTasks) => upsertTask(currentTasks, event.payload));
        return;
      }

      if (event.type === 'task:updated') {
        setIsConnected(true);
        applyTasks((currentTasks) => upsertTask(currentTasks, event.payload));
        return;
      }

      if (event.type === 'task:deleted') {
        setIsConnected(true);
        applyTasks((currentTasks) => currentTasks.filter((task) => task.id !== event.payload.id));
        return;
      }

      if (event.type === 'tasks:sync') {
        setIsConnected(true);
        applyTasks(event.payload);
        return;
      }

      if (event.type === 'server:shutdown') {
        setIsConnected(false);
        void loadCachedTasks();
      }
    });

    return unsubscribe;
  }, [applyTasks, loadCachedTasks]);

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
