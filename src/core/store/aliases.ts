import type { Alias } from "../../types";
import { getDb, AliasRow } from "./db";

export function getAliases(): Alias[] {
  const rows = getDb()
    .prepare("SELECT * FROM aliases ORDER BY usage_count DESC")
    .all() as AliasRow[];
  return rows.map(mapAliasRow);
}

export function saveAlias(keyword: string, task: string, description?: string): void {
  getDb()
    .prepare(
      `
    INSERT INTO aliases (keyword, task, description)
    VALUES (?, ?, ?)
    ON CONFLICT(keyword) DO UPDATE SET
      task = excluded.task,
      description = excluded.description
  `,
    )
    .run(keyword, task, description || null);
}

export function deleteAlias(keyword: string): boolean {
  const result = getDb()
    .prepare("DELETE FROM aliases WHERE keyword = ?")
    .run(keyword);
  return result.changes > 0;
}

function mapAliasRow(row: AliasRow): Alias {
  return {
    id: row.id,
    keyword: row.keyword,
    task: row.task,
    description: row.description ?? undefined,
    usageCount: row.usage_count,
    lastUsedAt: row.last_used_at ?? undefined,
    createdAt: row.created_at,
  };
}
