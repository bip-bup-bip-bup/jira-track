import Database from "better-sqlite3";
import { homedir } from "os";
import { join } from "path";
import { mkdirSync, existsSync, chmodSync } from "fs";
import { DB_DIR_NAME, DB_FILE_NAME } from "../../constants";

const DB_DIR = join(homedir(), DB_DIR_NAME);
const DB_PATH = join(DB_DIR, DB_FILE_NAME);

// Raw SQLite row types
export interface ConfigRow {
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

export interface AliasRow {
  id: number;
  keyword: string;
  task: string;
  description: string | null;
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
}

export interface TemplateRow {
  id: number;
  name: string;
  entries: string;
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
}

export interface TaskRow {
  task: string;
}

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    if (!existsSync(DB_DIR)) {
      mkdirSync(DB_DIR, { recursive: true, mode: 0o700 });
    }
    db = new Database(DB_PATH);
    chmodSync(DB_PATH, 0o600);
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database): void {
  db.exec(`
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
  const columns = db
    .prepare("PRAGMA table_info(config)")
    .all() as Array<{ name: string }>;
  const hasLanguage = columns.some((col) => col.name === "language");
  if (!hasLanguage) {
    db.exec("ALTER TABLE config ADD COLUMN language TEXT DEFAULT 'ru'");
  }
}
