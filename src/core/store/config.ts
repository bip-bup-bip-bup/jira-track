import type { Config } from "../../types";
import { getDb, ConfigRow } from "./db";

export function getConfig(): Config | null {
  const row = getDb()
    .prepare("SELECT * FROM config WHERE id = 1")
    .get() as ConfigRow | undefined;
  if (!row) return null;
  return mapConfigRow(row);
}

export function saveConfig(config: Omit<Config, "id" | "createdAt" | "updatedAt">): void {
  getDb()
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

function mapConfigRow(row: ConfigRow): Config {
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
