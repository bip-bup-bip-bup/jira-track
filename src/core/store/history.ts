import type { HistoryEntry } from "../../types";
import { getDb, TaskRow } from "./db";

export function saveHistory(entries: HistoryEntry[]): void {
  const db = getDb();
  const insert = db.prepare(`
    INSERT INTO history (task, activity, hours, date, source)
    VALUES (?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction((entries: HistoryEntry[]) => {
    for (const entry of entries) {
      insert.run(
        entry.task,
        entry.activity,
        entry.hours,
        entry.date,
        entry.source,
      );
    }
  });

  transaction(entries);
}

export function getRecentTasks(limit: number = 10): string[] {
  const rows = getDb()
    .prepare(
      `
    SELECT DISTINCT task FROM history
    ORDER BY logged_at DESC
    LIMIT ?
  `,
    )
    .all(limit) as TaskRow[];
  return rows.map((row) => row.task);
}
