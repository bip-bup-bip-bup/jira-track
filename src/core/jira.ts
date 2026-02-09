import { Version2Client } from 'jira.js';
import { JiraConfig, JiraIssue, ValidationResult, WorklogEntry, BatchResult } from '../types';
import { displayProgress, displayProgressResult } from '../utils/display';
import https from 'https';

export class JiraClient {
  private client: Version2Client;
  private projectKey: string;

  constructor(config: JiraConfig, projectKey: string) {
    // Ignore self-signed SSL certificates for on-premise Jira
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false
    });

    this.client = new Version2Client({
      host: config.url,
      authentication: {
        basic: {
          username: config.username,
          password: config.password
        }
      },
      baseRequestConfig: {
        httpsAgent
      }
    });
    this.projectKey = projectKey;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.myself.getCurrentUser();
      return true;
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('Invalid credentials');
      }
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new Error('Cannot connect. Check VPN connection.');
      }
      if (error.code === 'DEPTH_ZERO_SELF_SIGNED_CERT' || error.code === 'SELF_SIGNED_CERT_IN_CHAIN') {
        throw new Error('SSL certificate error (should be handled automatically)');
      }
      throw error;
    }
  }

  async getIssue(taskKey: string): Promise<JiraIssue | null> {
    try {
      const issue = await this.client.issues.getIssue({
        issueIdOrKey: taskKey,
        fields: ['summary', 'assignee', 'status']
      });

      return {
        key: issue.key!,
        summary: issue.fields?.summary || '',
        assignee: (issue.fields?.assignee as any)?.displayName,
        status: (issue.fields?.status as any)?.name || ''
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async validateTasks(taskKeys: string[]): Promise<ValidationResult> {
    const unique = [...new Set(taskKeys)];
    const results: ValidationResult = {
      valid: [],
      invalid: [],
      notAssigned: []
    };

    const currentUser = await this.client.myself.getCurrentUser();

    for (const key of unique) {
      const issue = await this.getIssue(key);

      if (!issue) {
        results.invalid.push(key);
        continue;
      }

      if (issue.assignee !== currentUser.displayName) {
        results.notAssigned.push({
          key,
          assignee: issue.assignee || 'Unassigned'
        });
      }

      results.valid.push(issue);
    }

    return results;
  }

  async logWorklog(entry: WorklogEntry): Promise<void> {
    // Format time as string (e.g., "1h 30m")
    const hours = Math.floor(entry.hours);
    const minutes = Math.round((entry.hours - hours) * 60);
    let timeSpent = '';
    if (hours > 0) timeSpent += `${hours}h`;
    if (minutes > 0) timeSpent += ` ${minutes}m`;
    timeSpent = timeSpent.trim() || '1m';

    // Jira Server expects date in specific format
    const started = new Date(entry.date);
    started.setHours(10, 0, 0, 0);
    const startedStr = started.toISOString().replace(/\.\d{3}Z$/, '.000+0000');

    await this.client.issueWorklogs.addWorklog({
      issueIdOrKey: entry.task!,
      comment: entry.activity,
      timeSpent,
      started: startedStr
    });
  }

  async logBatch(entries: WorklogEntry[]): Promise<BatchResult> {
    process.stderr.write(`\nЛогирование ${entries.length} записей...\n\n`);

    const results: BatchResult = {
      success: [],
      failed: []
    };

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      displayProgress(i + 1, entries.length, entry.task ?? '???');

      try {
        await this.logWorklog(entry);
        results.success.push(entry);
        displayProgressResult(true);
      } catch (error: any) {
        results.failed.push({
          entry,
          error: error.message || 'Unknown error'
        });
        displayProgressResult(false);
      }
    }

    return results;
  }

  async getRecentTasks(limit: number = 10): Promise<string[]> {
    try {
      const response = await this.client.issueSearch.searchForIssuesUsingJql({
        jql: `project = ${this.projectKey} AND assignee = currentUser() ORDER BY updated DESC`,
        maxResults: limit,
        fields: ['key']
      });

      return response.issues?.map(i => i.key!) || [];
    } catch (error) {
      return [];
    }
  }
}

export function createJiraClient(config: { jiraUrl: string; jiraUsername: string; jiraPassword: string; projectKey: string }): JiraClient {
  return new JiraClient(
    {
      url: config.jiraUrl,
      username: config.jiraUsername,
      password: config.jiraPassword
    },
    config.projectKey
  );
}
