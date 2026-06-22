import { getDatabase } from './index';
import type { Task, CreateTaskInput, UpdateTaskInput } from '@tidalflow/shared';

export interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  priority: number;
  scheduled_date: string | null;
  due_date: string | null;
  estimated_minutes: number | null;
  parent_task_id: string | null;
  phase_order: number | null;
  source: string;
  is_recurring: number;
  recurring_rule: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

/**
 * Convert database row to Task type
 */
function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    category: row.category as Task['category'],
    status: row.status as Task['status'],
    priority: row.priority,
    scheduledDate: row.scheduled_date,
    dueDate: row.due_date,
    estimatedMinutes: row.estimated_minutes,
    parentTaskId: row.parent_task_id,
    phaseOrder: row.phase_order,
    source: row.source as Task['source'],
    isRecurring: Boolean(row.is_recurring),
    recurringRule: row.recurring_rule,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get current ISO timestamp
 */
function now(): string {
  return new Date().toISOString();
}

/**
 * Create a new task
 */
export function createTask(input: CreateTaskInput): Task {
  const db = getDatabase();
  const id = generateId();
  const timestamp = now();

  const stmt = db.prepare(`
    INSERT INTO tasks (
      id, title, description, category, status, priority,
      scheduled_date, due_date, estimated_minutes,
      source, is_recurring, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    input.title,
    input.description || '',
    input.category || 'other',
    'pending',
    input.priority ?? 0,
    input.scheduledDate || null,
    input.dueDate || null,
    input.estimatedMinutes || null,
    'manual',
    0,
    timestamp,
    timestamp
  );

  return getTaskById(id)!;
}

/**
 * Get task by ID
 */
export function getTaskById(id: string): Task | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
  const row = stmt.get(id) as TaskRow | undefined;

  return row ? rowToTask(row) : null;
}

/**
 * Get all tasks
 */
export function getAllTasks(): Task[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC');
  const rows = stmt.all() as TaskRow[];

  return rows.map(rowToTask);
}

/**
 * Get tasks by status
 */
export function getTasksByStatus(status: Task['status']): Task[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM tasks WHERE status = ? ORDER BY created_at DESC');
  const rows = stmt.all(status) as TaskRow[];

  return rows.map(rowToTask);
}

/**
 * Update a task
 */
export function updateTask(input: UpdateTaskInput): Task | null {
  const db = getDatabase();
  const existing = getTaskById(input.id);

  if (!existing) {
    return null;
  }

  // Build update fields dynamically
  const updates: string[] = [];
  const values: any[] = [];

  if (input.title !== undefined) {
    updates.push('title = ?');
    values.push(input.title);
  }
  if (input.description !== undefined) {
    updates.push('description = ?');
    values.push(input.description);
  }
  if (input.category !== undefined) {
    updates.push('category = ?');
    values.push(input.category);
  }
  if (input.status !== undefined) {
    updates.push('status = ?');
    values.push(input.status);

    // Set completed_at when status becomes completed
    if (input.status === 'completed' && !existing.completedAt) {
      updates.push('completed_at = ?');
      values.push(now());
    }
  }
  if (input.priority !== undefined) {
    updates.push('priority = ?');
    values.push(input.priority);
  }
  if (input.scheduledDate !== undefined) {
    updates.push('scheduled_date = ?');
    values.push(input.scheduledDate);
  }
  if (input.dueDate !== undefined) {
    updates.push('due_date = ?');
    values.push(input.dueDate);
  }
  if (input.estimatedMinutes !== undefined) {
    updates.push('estimated_minutes = ?');
    values.push(input.estimatedMinutes);
  }

  // Always update updated_at
  updates.push('updated_at = ?');
  values.push(now());

  values.push(input.id);

  if (updates.length > 0) {
    const sql = `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`;
    db.prepare(sql).run(...values);
  }

  return getTaskById(input.id);
}

/**
 * Delete a task
 */
export function deleteTask(id: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM tasks WHERE id = ?');
  const result = stmt.run(id);

  return result.changes > 0;
}

/**
 * Get tasks by date range (scheduled_date)
 */
export function getTasksByDateRange(startDate: string, endDate: string): Task[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM tasks
    WHERE scheduled_date >= ? AND scheduled_date <= ?
    ORDER BY scheduled_date ASC
  `);
  const rows = stmt.all(startDate, endDate) as TaskRow[];

  return rows.map(rowToTask);
}