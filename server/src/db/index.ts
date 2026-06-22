import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync } from 'fs';

// Database file path (relative to project root)
const DB_PATH = join(process.cwd(), 'tidalflow.db');

let db: Database.Database | null = null;

/**
 * Initialize SQLite database and create tables if not exists
 */
export function initDatabase(): Database.Database {
  if (db) {
    return db;
  }

  // Create database file if it doesn't exist
  const isNew = !existsSync(DB_PATH);
  db = new Database(DB_PATH);

  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  if (isNew) {
    createTables(db);
    console.log('✅ Database initialized: tidalflow.db');
  } else {
    console.log('✅ Database loaded: tidalflow.db');
  }

  return db;
}

/**
 * Create tables
 */
function createTables(db: Database.Database): void {
  // Create tasks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL CHECK(category IN ('programming', 'drawing', 'life', 'health', 'other')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'postponed')),
      priority INTEGER NOT NULL DEFAULT 0 CHECK(priority IN (0, 1, 2)),
      scheduled_date TEXT,
      due_date TEXT,
      estimated_minutes INTEGER,
      parent_task_id TEXT,
      phase_order INTEGER,
      source TEXT NOT NULL DEFAULT 'manual' CHECK(source IN ('manual', 'feishu', 'ai_decomposed')),
      is_recurring INTEGER NOT NULL DEFAULT 0,
      recurring_rule TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT
    )
  `);

  // Create indexes for tasks
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
    CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_date ON tasks(scheduled_date);
    CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
  `);

  // Create reminder_logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS reminder_logs (
      id TEXT PRIMARY KEY,
      reminder_type TEXT NOT NULL CHECK(reminder_type IN ('water_stretch', 'medication', 'task_due')),
      triggered_at TEXT NOT NULL,
      responded_at TEXT,
      response_type TEXT CHECK(response_type IN ('done', 'postponed', 'ignored'))
    )
  `);

  // Create indexes for reminder_logs
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_reminder_logs_type ON reminder_logs(reminder_type);
    CREATE INDEX IF NOT EXISTS idx_reminder_logs_triggered_at ON reminder_logs(triggered_at);
  `);

  console.log('✅ Tables created: tasks, reminder_logs');
}

/**
 * Get database instance
 */
export function getDatabase(): Database.Database {
  if (!db) {
    return initDatabase();
  }
  return db;
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log('✅ Database closed');
  }
}