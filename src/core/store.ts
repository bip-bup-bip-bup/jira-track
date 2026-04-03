import Database from "better-sqlite3";
import { homedir } from "os";
import { join } from "path";
import { mkdirSync, existsSync, chmodSync } from "fs";
import { Config, Alias, Template, HistoryEntry, WorklogEntry, RecentTaskSuggestion } from "../types";

const DB_DIR = join(homedir(), ".jtw");
const DB_PATH = join(DB_DIR, "data.db");

// Raw SQLite row types
interface ConfigRow {
  id: number;
  jira_url: string;
  jira_username: string;
  jira_password: string;
  project_key: string;
  ai_provider: 'anthropic' | 'openai';
  ai_api_key: string;
  ai_model: string | null;
  language: string | null;
  created_at: string;
  updated_at: string;
}

interface AliasRow {
  id: number;
  keyword: string;
  task: string;
  description: string | null;
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
}

interface TemplateRow {
  id: number;
  name: string;
  entries: string;
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
}

interface TaskRow {
  task: string;
}

interface RecentTaskRow {
  task: string;
  activity: string;
  logged_at: string;
  uses: number;
}

interface HistorySummaryRow {
  task: string;
  total_hours: number;
  uses: number;
}

interface HistoryEntryRow {
  task: string;
  activity: string;
  hours: number;
  date: string;
  logged_at: string;
  source: 'ai' | 'template' | 'manual' | null;
}

class Store {
  private db: Database.Database;

  constructor() {
    if (!existsSync(DB_DIR)) {
      mkdirSync(DB_DIR, { recursive: true, mode: 0o700 });
    }
    this.db = new Database(DB_PATH);
    chmodSync(DB_PATH, 0o600);
    this.init();
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        jira_url TEXT NOT NULL,
        jira_username TEXT NOT NULL,
        jira_password TEXT NOT NULL,
        project_key TEXT NOT NULL,
        ai_provider TEXT NOT NULL CHECK (ai_provider IN ('anthropic', 'openai')),
        ai_api_key TEXT NOT NULL,
        ai_model TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS aliases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        keyword TEXT UNIQUE NOT NULL,
        task TEXT NOT NULL,
        description TEXT,
        usage_count INTEGER DEFAULT 0,
        last_used_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_aliases_keyword ON aliases(keyword);

      CREATE TABLE IF NOT EXISTS templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        entries TEXT NOT NULL,
        usage_count INTEGER DEFAULT 0,
        last_used_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task TEXT NOT NULL,
        activity TEXT NOT NULL,
        hours REAL NOT NULL,
        date TEXT NOT NULL,
        logged_at TEXT DEFAULT CURRENT_TIMESTAMP,
        source TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_history_date ON history(date);
      CREATE INDEX IF NOT EXISTS idx_history_task ON history(task);
    `);

    // Migration: add language column if missing
    const columns = this.db
      .prepare("PRAGMA table_info(config)")
      .all() as Array<{ name: string }>;
    const hasLanguage = columns.some((col) => col.name === "language");
    if (!hasLanguage) {
      this.db.exec("ALTER TABLE config ADD COLUMN language TEXT DEFAULT 'ru'");
    }
  }

  // Config methods
  getConfig(): Config | null {
    const row = this.db
      .prepare("SELECT * FROM config WHERE id = 1")
      .get() as ConfigRow | undefined;
    if (!row) return null;
    return {
      id: row.id,
      jiraUrl: row.jira_url,
      jiraUsername: row.jira_username,
      jiraPassword: row.jira_password,
      projectKey: row.project_key,
      aiProvider: row.ai_provider,
      aiApiKey: row.ai_api_key,
      aiModel: row.ai_model ?? undefined,
      language: (row.language as Config['language']) ?? 'ru',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  saveConfig(config: Omit<Config, "id" | "createdAt" | "updatedAt">): void {
    this.db
      .prepare(
        `
      INSERT OR REPLACE INTO config (
        id, jira_url, jira_username, jira_password, project_key,
        ai_provider, ai_api_key, ai_model, language, updated_at
      )
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `,
      )
      .run(
        config.jiraUrl,
        config.jiraUsername,
        config.jiraPassword,
        config.projectKey,
        config.aiProvider,
        config.aiApiKey,
        config.aiModel || null,
        config.language || 'ru',
      );
  }

  // Alias methods
  getAliases(): Alias[] {
    const rows = this.db
      .prepare("SELECT * FROM aliases ORDER BY usage_count DESC, COALESCE(last_used_at, created_at) DESC")
      .all() as AliasRow[];
    return rows.map(mapAliasRow);
  }

  saveAlias(keyword: string, task: string, description?: string): void {
    this.db
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

  markAliasUsed(keyword: string): void {
    this.db
      .prepare(
        `
      UPDATE aliases
      SET usage_count = usage_count + 1,
          last_used_at = CURRENT_TIMESTAMP
      WHERE keyword = ?
    `,
      )
      .run(keyword);
  }

  deleteAlias(keyword: string): boolean {
    const result = this.db
      .prepare("DELETE FROM aliases WHERE keyword = ?")
      .run(keyword);
    return result.changes > 0;
  }

  // Template methods
  getTemplates(): Template[] {
    const rows = this.db
      .prepare("SELECT * FROM templates ORDER BY usage_count DESC, COALESCE(last_used_at, created_at) DESC")
      .all() as TemplateRow[];
    return rows.map(mapTemplateRow);
  }

  saveTemplate(name: string, entries: WorklogEntry[]): void {
    this.db
      .prepare(
        `
      INSERT INTO templates (name, entries)
      VALUES (?, ?)
      ON CONFLICT(name) DO UPDATE SET entries = excluded.entries
    `,
      )
      .run(name, JSON.stringify(entries));
  }

  markTemplateUsed(name: string): void {
    this.db
      .prepare(
        `
      UPDATE templates
      SET usage_count = usage_count + 1,
          last_used_at = CURRENT_TIMESTAMP
      WHERE name = ?
    `,
      )
      .run(name);
  }

  deleteTemplate(name: string): boolean {
    const result = this.db
      .prepare("DELETE FROM templates WHERE name = ?")
      .run(name);
    return result.changes > 0;
  }

  // History methods
  saveHistory(entries: HistoryEntry[]): void {
    const insert = this.db.prepare(`
      INSERT INTO history (task, activity, hours, date, source)
      VALUES (?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction((entries: HistoryEntry[]) => {
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

  getRecentTasks(limit: number = 10): string[] {
    const rows = this.db
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

  getRecentTaskSuggestions(limit: number = 10): RecentTaskSuggestion[] {
    const rows = this.db
      .prepare(
        `
      SELECT
        task,
        activity,
        MAX(logged_at) AS logged_at,
        COUNT(*) AS uses
      FROM history
      GROUP BY task, activity
      ORDER BY MAX(logged_at) DESC, COUNT(*) DESC
      LIMIT ?
    `,
      )
      .all(limit) as RecentTaskRow[];

    return rows.map((row) => ({
      key: row.task,
      summary: "",
      status: "",
      source: "history",
      activity: row.activity,
      lastUsedAt: row.logged_at,
      usageCount: row.uses,
    }));
  }

  getRecentHistory(limit: number = 10): HistoryEntry[] {
    const rows = this.db
      .prepare(
        `
      SELECT task, activity, hours, date, logged_at, source
      FROM history
      ORDER BY logged_at DESC
      LIMIT ?
    `,
      )
      .all(limit) as HistoryEntryRow[];

    return rows.map((row) => ({
      task: row.task,
      activity: row.activity,
      hours: row.hours,
      date: row.date,
      loggedAt: row.logged_at,
      source: row.source ?? 'manual',
    }));
  }

  getTopTasks(limit: number = 5): Array<{ task: string; totalHours: number; uses: number }> {
    const rows = this.db
      .prepare(
        `
      SELECT task, SUM(hours) AS total_hours, COUNT(*) AS uses
      FROM history
      GROUP BY task
      ORDER BY SUM(hours) DESC, COUNT(*) DESC
      LIMIT ?
    `,
      )
      .all(limit) as HistorySummaryRow[];

    return rows.map((row) => ({
      task: row.task,
      totalHours: row.total_hours,
      uses: row.uses,
    }));
  }

  getTotalLoggedHours(): number {
    const row = this.db
      .prepare("SELECT COALESCE(SUM(hours), 0) AS total FROM history")
      .get() as { total: number };
    return row.total;
  }

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

function mapTemplateRow(row: TemplateRow): Template {
  let entries: WorklogEntry[] = [];
  try {
    entries = JSON.parse(row.entries);
  } catch {
    console.error(`Warning: corrupted template data for "${row.name}", using empty entries`);
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

export const store = new Store();
