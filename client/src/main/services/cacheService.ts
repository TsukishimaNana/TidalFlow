import { app } from 'electron';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import type { Task } from '@tidalflow/shared';

type SqliteDatabase = Database.Database;

interface TaskRow {
  id: string;
  title: string;
  description: string;
  category: Task['category'];
  status: Task['status'];
  priority: number;
  scheduledDate: string | null;
  dueDate: string | null;
  estimatedMinutes: number | null;
  parentTaskId: string | null;
  phaseOrder: number | null;
  source: Task['source'];
  isRecurring: 0 | 1;
  recurringRule: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

let db: SqliteDatabase | null = null;

function getDb(): SqliteDatabase {
  if (!db) {
    throw new Error('Cache database is not initialized');
  }

  return db;
}

function rowToTask(row: TaskRow): Task {
  return {
    ...row,
    isRecurring: row.isRecurring === 1
  };
}

export const cacheService = {
  initCache(): void {
    if (db) {
      return;
    }

    db = new Database(join(app.getPath('userData'), 'tidalflow-cache.db'));
    db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        status TEXT NOT NULL,
        priority INTEGER NOT NULL,
        scheduledDate TEXT,
        dueDate TEXT,
        estimatedMinutes INTEGER,
        parentTaskId TEXT,
        phaseOrder INTEGER,
        source TEXT NOT NULL,
        isRecurring INTEGER NOT NULL,
        recurringRule TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        completedAt TEXT
      )
    `);
  },

  saveTasks(tasks: Task[]): void {
    const database = getDb();
    const insert = database.prepare(`
      REPLACE INTO tasks (
        id,
        title,
        description,
        category,
        status,
        priority,
        scheduledDate,
        dueDate,
        estimatedMinutes,
        parentTaskId,
        phaseOrder,
        source,
        isRecurring,
        recurringRule,
        createdAt,
        updatedAt,
        completedAt
      )
      VALUES (
        @id,
        @title,
        @description,
        @category,
        @status,
        @priority,
        @scheduledDate,
        @dueDate,
        @estimatedMinutes,
        @parentTaskId,
        @phaseOrder,
        @source,
        @isRecurring,
        @recurringRule,
        @createdAt,
        @updatedAt,
        @completedAt
      )
    `);

    const transaction = database.transaction((items: Task[]) => {
      database.prepare('DELETE FROM tasks').run();
      for (const task of items) {
        insert.run({
          ...task,
          isRecurring: task.isRecurring ? 1 : 0
        });
      }
    });

    transaction(tasks);
  },

  getTasks(): Task[] {
    return getDb()
      .prepare('SELECT * FROM tasks ORDER BY scheduledDate ASC, createdAt ASC')
      .all()
      .map((row) => rowToTask(row as TaskRow));
  },

  close(): void {
    if (db) {
      db.close();
      db = null;
    }
  }
};
