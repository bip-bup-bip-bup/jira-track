// Core domain types
export interface WorklogEntry {
  task: string | null;
  activity: string;
  hours: number;
  date: string; // YYYY-MM-DD
}

export interface Alias {
  id?: number;
  keyword: string;
  task: string;
  description?: string;
  usageCount?: number;
  lastUsedAt?: string;
  createdAt?: string;
}

export interface Template {
  id?: number;
  name: string;
  entries: WorklogEntry[];
  usageCount?: number;
  lastUsedAt?: string;
  createdAt?: string;
}

export interface Config {
  id: number;
  jiraUrl: string;
  jiraUsername: string;
  jiraPassword: string;
  projectKey: string;
  aiProvider: 'anthropic' | 'openai';
  aiApiKey: string;
  aiModel?: string;
  createdAt?: string;
  updatedAt?: string;
}

// AI provider types
export interface ParseContext {
  projectKey: string;
  aliases: Alias[];
  recentTasks: string[];
}

export interface AIProvider {
  parse(input: string, context: ParseContext): Promise<WorklogEntry[]>;
}

// Jira types
export interface JiraConfig {
  url: string;
  username: string;
  password: string;
}

export interface JiraIssue {
  key: string;
  summary: string;
  assignee?: string;
  status: string;
}

export interface ValidationResult {
  valid: JiraIssue[];
  invalid: string[];
  notAssigned: Array<{ key: string; assignee: string }>;
}

export interface BatchResult {
  success: WorklogEntry[];
  failed: Array<{ entry: WorklogEntry; error: string }>;
}

// History tracking
export interface HistoryEntry extends WorklogEntry {
  id?: number;
  loggedAt?: string;
  source: 'ai' | 'template' | 'manual';
}
