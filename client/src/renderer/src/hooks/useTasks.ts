import { useCallback } from 'react';
import type { CreateTaskInput, Task, UpdateTaskInput } from '@tidalflow/shared';
import { useAppContext } from '../context/AppContext';

function nowIso(): string {
  return new Date().toISOString();
}

export function useTasks(): {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  refreshTasks: () => Promise<void>;
  createTask: (data: CreateTaskInput) => Promise<Task>;
  updateTask: (id: string, data: Partial<UpdateTaskInput>) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  completeTask: (id: string) => Promise<Task>;
  postponeTask: (id: string) => Promise<Task>;
} {
  const {
    tasks,
    isLoading,
    error,
    refreshTasks,
    createTask,
    updateTask,
    deleteTask,
    completeTask: completeTaskRequest,
    postponeTask: postponeTaskRequest,
    setTasksOptimistically
  } = useAppContext();

  const completeTask = useCallback(
    async (id: string): Promise<Task> => {
      const previousTasks = tasks;

      setTasksOptimistically((currentTasks) =>
        currentTasks.map((task) =>
          task.id === id ? { ...task, status: 'completed', completedAt: nowIso(), updatedAt: nowIso() } : task
        )
      );

      try {
        return await completeTaskRequest(id);
      } catch (completeError) {
        setTasksOptimistically(() => previousTasks);
        throw completeError;
      }
    },
    [completeTaskRequest, setTasksOptimistically, tasks]
  );

  const postponeTask = useCallback(
    async (id: string): Promise<Task> => {
      const previousTasks = tasks;

      setTasksOptimistically((currentTasks) =>
        currentTasks.map((task) => (task.id === id ? { ...task, status: 'postponed', updatedAt: nowIso() } : task))
      );

      try {
        return await postponeTaskRequest(id);
      } catch (postponeError) {
        setTasksOptimistically(() => previousTasks);
        throw postponeError;
      }
    },
    [postponeTaskRequest, setTasksOptimistically, tasks]
  );

  return {
    tasks,
    isLoading,
    error,
    refreshTasks,
    createTask,
    updateTask,
    deleteTask,
    completeTask,
    postponeTask
  };
}
