import Database from "better-sqlite3";
import { homedir } from "os";
import { join } from "path";
import { mkdirSync, existsSync, chmodSync } from "fs";
import { Config, Alias, Template, HistoryEntry, WorklogEntry } from "../types";

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
        ai_provider, ai_api_key, ai_model, updated_at
      )
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
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
      );
  }

  // Alias methods
  getAliases(): Alias[] {
    const rows = this.db
      .prepare("SELECT * FROM aliases ORDER BY usage_count DESC")
      .all() as AliasRow[];
    return rows.map(mapAliasRow);
  }

  findAlias(keyword: string): Alias | null {
    const row = this.db
      .prepare("SELECT * FROM aliases WHERE keyword = ?")
      .get(keyword) as AliasRow | undefined;
    return row ? mapAliasRow(row) : null;
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

  deleteAlias(keyword: string): boolean {
    const result = this.db
      .prepare("DELETE FROM aliases WHERE keyword = ?")
      .run(keyword);
    return result.changes > 0;
  }

  incrementAliasUsage(keyword: string): void {
    this.db
      .prepare(
        `
      UPDATE aliases
      SET usage_count = usage_count + 1, last_used_at = CURRENT_TIMESTAMP
      WHERE keyword = ?
    `,
      )
      .run(keyword);
  }

  // Template methods
  getTemplates(): Template[] {
    const rows = this.db
      .prepare("SELECT * FROM templates ORDER BY usage_count DESC")
      .all() as TemplateRow[];
    return rows.map(mapTemplateRow);
  }

  getTemplate(name: string): Template | null {
    const row = this.db
      .prepare("SELECT * FROM templates WHERE name = ?")
      .get(name) as TemplateRow | undefined;
    return row ? mapTemplateRow(row) : null;
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

  deleteTemplate(name: string): boolean {
    const result = this.db
      .prepare("DELETE FROM templates WHERE name = ?")
      .run(name);
    return result.changes > 0;
  }

  incrementTemplateUsage(name: string): void {
    this.db
      .prepare(
        `
      UPDATE templates
      SET usage_count = usage_count + 1, last_used_at = CURRENT_TIMESTAMP
      WHERE name = ?
    `,
      )
      .run(name);
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

  close(): void {
    this.db.close();
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
