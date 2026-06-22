import { getDatabase } from './index';
import type { ReminderLog } from '@tidalflow/shared';

export interface ReminderLogRow {
  id: string;
  reminder_type: string;
  triggered_at: string;
  responded_at: string | null;
  response_type: string | null;
}

/**
 * Convert database row to ReminderLog type
 */
function rowToReminderLog(row: ReminderLogRow): ReminderLog {
  return {
    id: row.id,
    reminderType: row.reminder_type as ReminderLog['reminderType'],
    triggeredAt: row.triggered_at,
    respondedAt: row.responded_at,
    responseType: row.response_type as ReminderLog['responseType'],
  };
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `r_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get current ISO timestamp
 */
function now(): string {
  return new Date().toISOString();
}

/**
 * Create a new reminder log
 */
export function createReminderLog(
  reminderType: ReminderLog['reminderType']
): ReminderLog {
  const db = getDatabase();
  const id = generateId();
  const timestamp = now();

  const stmt = db.prepare(`
    INSERT INTO reminder_logs (id, reminder_type, triggered_at)
    VALUES (?, ?, ?)
  `);

  stmt.run(id, reminderType, timestamp);

  return getReminderLogById(id)!;
}

/**
 * Get reminder log by ID
 */
export function getReminderLogById(id: string): ReminderLog | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM reminder_logs WHERE id = ?');
  const row = stmt.get(id) as ReminderLogRow | undefined;

  return row ? rowToReminderLog(row) : null;
}

/**
 * Get all reminder logs
 */
export function getAllReminderLogs(): ReminderLog[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM reminder_logs ORDER BY triggered_at DESC');
  const rows = stmt.all() as ReminderLogRow[];

  return rows.map(rowToReminderLog);
}

/**
 * Get reminder logs by type
 */
export function getReminderLogsByType(
  reminderType: ReminderLog['reminderType']
): ReminderLog[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM reminder_logs
    WHERE reminder_type = ?
    ORDER BY triggered_at DESC
  `);
  const rows = stmt.all(reminderType) as ReminderLogRow[];

  return rows.map(rowToReminderLog);
}

/**
 * Get reminder logs by date range
 */
export function getReminderLogsByDateRange(
  startDate: string,
  endDate: string
): ReminderLog[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM reminder_logs
    WHERE triggered_at >= ? AND triggered_at <= ?
    ORDER BY triggered_at DESC
  `);
  const rows = stmt.all(startDate, endDate) as ReminderLogRow[];

  return rows.map(rowToReminderLog);
}

/**
 * Update reminder log response
 */
export function updateReminderResponse(
  id: string,
  responseType: ReminderLog['responseType']
): ReminderLog | null {
  const db = getDatabase();
  const timestamp = now();

  const stmt = db.prepare(`
    UPDATE reminder_logs
    SET responded_at = ?, response_type = ?
    WHERE id = ?
  `);

  const result = stmt.run(timestamp, responseType, id);

  if (result.changes > 0) {
    return getReminderLogById(id);
  }

  return null;
}

/**
 * Delete reminder log
 */
export function deleteReminderLog(id: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM reminder_logs WHERE id = ?');
  const result = stmt.run(id);

  return result.changes > 0;
}

/**
 * Get pending reminders (triggered but not responded)
 */
export function getPendingReminders(): ReminderLog[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM reminder_logs
    WHERE responded_at IS NULL
    ORDER BY triggered_at DESC
  `);
  const rows = stmt.all() as ReminderLogRow[];

  return rows.map(rowToReminderLog);
}