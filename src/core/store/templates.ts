import type { Template, WorklogEntry } from "../../types";
import { getDb, TemplateRow } from "./db";

export function getTemplates(): Template[] {
  const rows = getDb()
    .prepare("SELECT * FROM templates ORDER BY usage_count DESC")
    .all() as TemplateRow[];
  return rows.map(mapTemplateRow);
}

export function saveTemplate(name: string, entries: WorklogEntry[]): void {
  getDb()
    .prepare(
      `
    INSERT INTO templates (name, entries)
    VALUES (?, ?)
    ON CONFLICT(name) DO UPDATE SET entries = excluded.entries
  `,
    )
    .run(name, JSON.stringify(entries));
}

export function deleteTemplate(name: string): boolean {
  const result = getDb()
    .prepare("DELETE FROM templates WHERE name = ?")
    .run(name);
  return result.changes > 0;
}

function mapTemplateRow(row: TemplateRow): Template {
  let entries: WorklogEntry[] = [];
  try {
    entries = JSON.parse(row.entries);
  } catch {
    process.stderr.write(`Warning: corrupted template data for "${row.name}", using empty entries\n`);
  }
  return {
    id: row.id,
    name: row.name,
    entries,
    usageCount: row.usage_count,
    lastUsedAt: row.last_used_at ?? undefined,
    createdAt: row.created_at,
  };
}
