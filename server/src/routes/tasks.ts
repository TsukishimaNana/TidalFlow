import { Router } from 'express';
import type { ApiResponse, CreateTaskInput, Task, UpdateTaskInput } from '@tidalflow/shared';
import * as taskService from '../services/taskService';

type IdParams = {
  id: string;
};

type TaskUpdateBody = Partial<Omit<UpdateTaskInput, 'id'>>;

type TaskListQuery = {
  date?: string;
  status?: Task['status'];
  category?: Task['category'];
};

type DeleteTaskResponse = {
  deleted: boolean;
};

const router = Router();

function getLocalDateString(date: Date): string {
  const timezoneOffsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 10);
}

function filterTasks(tasks: Task[], filters: TaskListQuery): Task[] {
  return tasks.filter((task) => {
    const matchesStatus = filters.status === undefined || task.status === filters.status;
    const matchesCategory = filters.category === undefined || task.category === filters.category;

    return matchesStatus && matchesCategory;
  });
}

router.get<Record<string, string>, ApiResponse<Task[]>, unknown, TaskListQuery>('/', (req, res) => {
  const { date, status, category } = req.query;
  const tasks = date
    ? taskService.getTasksByDateRange(date, date)
    : taskService.getAllTasks();

  res.json({
    success: true,
    data: filterTasks(tasks, { status, category }),
  });
});

router.get<Record<string, string>, ApiResponse<Task[]>>('/today', (_req, res) => {
  const today = getLocalDateString(new Date());

  res.json({
    success: true,
    data: taskService.getTasksByDateRange(today, today),
  });
});

router.get<IdParams, ApiResponse<Task>>('/:id', (req, res) => {
  const task = taskService.getTaskById(req.params.id);

  if (!task) {
    res.status(404).json({
      success: false,
      error: 'Task not found',
    });
    return;
  }

  res.json({
    success: true,
    data: task,
  });
});

router.post<Record<string, string>, ApiResponse<Task>, CreateTaskInput>('/', (req, res) => {
  const task = taskService.createTask(req.body);

  res.status(201).json({
    success: true,
    data: task,
  });
});

router.patch<IdParams, ApiResponse<Task>, TaskUpdateBody>('/:id', (req, res) => {
  const task = taskService.updateTask({
    ...req.body,
    id: req.params.id,
  });

  if (!task) {
    res.status(404).json({
      success: false,
      error: 'Task not found',
    });
    return;
  }

  res.json({
    success: true,
    data: task,
  });
});

router.delete<IdParams, ApiResponse<DeleteTaskResponse>>('/:id', (req, res) => {
  const deleted = taskService.deleteTask(req.params.id);

  if (!deleted) {
    res.status(404).json({
      success: false,
      error: 'Task not found',
    });
    return;
  }

  res.json({
    success: true,
    data: { deleted },
  });
});

router.post<IdParams, ApiResponse<Task>>('/:id/complete', (req, res) => {
  const task = taskService.updateTask({
    id: req.params.id,
    status: 'completed',
  });

  if (!task) {
    res.status(404).json({
      success: false,
      error: 'Task not found',
    });
    return;
  }

  res.json({
    success: true,
    data: task,
  });
});

router.post<IdParams, ApiResponse<Task>>('/:id/postpone', (req, res) => {
  const task = taskService.updateTask({
    id: req.params.id,
    status: 'postponed',
  });

  if (!task) {
    res.status(404).json({
      success: false,
      error: 'Task not found',
    });
    return;
  }

  res.json({
    success: true,
    data: task,
  });
});

export default router;
