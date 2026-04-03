import inquirer from 'inquirer';
import { store } from '../core/store';
import { createAIProvider } from '../core/ai';
import { createJiraClient } from '../core/jira';
import { handleError, displayPreview, displayBatchResult, displayError, displayWarning } from '../utils/display';
import { JiraIssue, RecentTaskSuggestion, WorklogEntry } from '../types';
import { t } from '../i18n';

function looksSuspicious(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) {
    return false;
  }
  return !trimmed.includes(' ') && !/[,:]/.test(trimmed);
}

function describeSuggestion(suggestion: RecentTaskSuggestion): string {
  const details: string[] = [];
  if (suggestion.summary) {
    details.push(suggestion.summary);
  }
  if (suggestion.activity) {
    details.push(suggestion.activity);
  }
  if (suggestion.status) {
    details.push(suggestion.status);
  }
  const tail = details.length > 0 ? ` - ${details.join(' - ')}` : '';
  return `${suggestion.key}${tail} (${t(`quick.source.${suggestion.source}`)})`;
}

function mergeSuggestions(
  history: RecentTaskSuggestion[],
  recentIssues: JiraIssue[],
  aliases: ReturnType<typeof store.getAliases>,
): RecentTaskSuggestion[] {
  const merged = new Map<string, RecentTaskSuggestion>();

  for (const item of history) {
    merged.set(item.key, item);
  }

  for (const issue of recentIssues) {
    const existing = merged.get(issue.key);
    merged.set(issue.key, {
      key: issue.key,
      summary: existing?.summary || issue.summary,
      status: existing?.status || issue.status,
      source: existing?.source ?? 'jira',
      activity: existing?.activity,
      lastUsedAt: existing?.lastUsedAt,
      usageCount: existing?.usageCount,
    });
  }

  for (const alias of aliases) {
    if (merged.has(alias.task)) {
      const existing = merged.get(alias.task)!;
      merged.set(alias.task, {
        ...existing,
        activity: existing.activity || alias.keyword,
      });
      continue;
    }

    merged.set(alias.task, {
      key: alias.task,
      summary: alias.description || '',
      status: '',
      source: 'alias',
      activity: alias.keyword,
      lastUsedAt: alias.lastUsedAt,
      usageCount: alias.usageCount,
    });
  }

  return [...merged.values()];
}

export async function quickCommand(input: string): Promise<void> {
  try {
    const config = store.getConfig();
    if (!config) {
      displayError(t('quick.noConfig'));
      console.error(`${t('quick.runSetup')}\n`);
      process.exit(1);
    }
    const resolvedConfig = config;

    if (looksSuspicious(input)) {
      displayWarning(t('quick.inputSuspicious'));
      console.warn(t('quick.quoteHint'));
      console.warn(`  ${t('quick.quoteCorrect')}`);
      console.warn(`  ${t('quick.quoteWrong')}\n`);
    }

    const aiProvider = createAIProvider(resolvedConfig);
    const jiraClient = createJiraClient(resolvedConfig);
    const aliases = store.getAliases();
    const recentIssues = await jiraClient.getRecentIssues(8);

    console.log(`\n${t('quick.parsing')}\n`);
    let entries: WorklogEntry[] = [];
    try {
      entries = await aiProvider.parse(input, {
        projectKey: resolvedConfig.projectKey,
        aliases,
        recentTasks: recentIssues.map((issue) => issue.key),
      });
    } catch (error: any) {
      displayError(t('quick.parseFailed'));
      const message = error?.message || t('quick.invalidAiResponse');
      console.error(`${message}\n`);
      console.error(`${t('quick.tryExample')}`);
      console.error(`  "${t('quick.exampleFull', { project: resolvedConfig.projectKey })}"`);
      if (aliases.length > 0) {
        console.error(`\n${t('quick.useAliases')}`);
        for (const alias of aliases.slice(0, 3)) {
          console.error(`  "${t('quick.exampleAlias', { alias: alias.keyword })}"`);
        }
      }
      console.error('');
      process.exit(1);
    }

    if (entries.length === 0) {
      displayError(t('quick.noEntries'));
      console.error(`${t('quick.checkInput')}`);
      console.error(`  ${t('quick.checkTask')}`);
      console.error(`  ${t('quick.checkHours')}`);
      console.error(`  ${t('quick.checkDate')}\n`);
      process.exit(1);
    }

    const resolvedTasks: Record<string, string> = {};
    const historySuggestions = store.getRecentTaskSuggestions(8);
    const suggestions = mergeSuggestions(historySuggestions, recentIssues, aliases);

    for (let index = 0; index < entries.length; index++) {
      const entry = entries[index];
      if (entry.task) {
        continue;
      }

      if (resolvedTasks[entry.activity]) {
        entries[index] = { ...entry, task: resolvedTasks[entry.activity] };
        continue;
      }

      const choices = suggestions.slice(0, 10).map((suggestion) => ({
        name: describeSuggestion(suggestion),
        value: suggestion,
      }));

      const { selectedTask } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedTask',
          message: `${t('quick.noTaskFor')} "${entry.activity}". ${t('quick.selectTask')}`,
          choices: [
            ...choices,
            { name: t('quick.enterManually'), value: 'manual' },
          ],
        },
      ]);

      let resolvedTask: string;
      let selectedSuggestion: RecentTaskSuggestion | undefined;
      if (selectedTask === 'manual') {
        const { manualTask } = await inquirer.prompt([
          {
            type: 'input',
            name: 'manualTask',
            message: t('quick.enterTask'),
            validate: (value: string) => (value.match(/^[A-Z]+-\d+$/) ? true : t('quick.taskFormat')),
            filter: (value: string) => value.toUpperCase(),
          },
        ]);
        resolvedTask = manualTask;
      } else {
        selectedSuggestion = selectedTask as RecentTaskSuggestion;
        resolvedTask = selectedSuggestion.key;
      }

      entries[index] = { ...entry, task: resolvedTask };
      resolvedTasks[entry.activity] = resolvedTask;

      const matchedAlias = aliases.find((alias) => alias.task === resolvedTask && alias.keyword === selectedSuggestion?.activity);
      if (matchedAlias) {
        store.markAliasUsed(matchedAlias.keyword);
      }

      const { saveAlias } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'saveAlias',
          message: `${t('quick.saveAsAlias')} ${resolvedTask}?`,
          default: false,
        },
      ]);

      if (saveAlias) {
        store.saveAlias(entry.activity, resolvedTask);
        store.markAliasUsed(entry.activity);
        console.log(`✓ ${t('quick.aliasSaved')} "${entry.activity}" -> ${resolvedTask}\n`);
      }
    }

    console.log(`${t('quick.validatingTasks')}\n`);
    const taskKeys = entries.map((entry) => entry.task!);
    const validation = await jiraClient.validateTasks(taskKeys);

    if (validation.invalid.length > 0) {
      displayError(`${t('quick.tasksNotFound')} ${validation.invalid.join(', ')}`);
      process.exit(1);
    }

    if (validation.notAssigned.length > 0) {
      displayWarning(`${t('quick.tasksNotAssigned')} ${validation.notAssigned.map((task) => task.key).join(', ')}`);
    }

    displayPreview(entries);

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: t('quick.confirmLog'),
        default: true,
      },
    ]);

    if (!confirm) {
      console.log(`\n${t('quick.cancelled')}\n`);
      return;
    }

    const result = await jiraClient.logBatch(entries);
    displayBatchResult(result);

    if (result.success.length > 0) {
      store.saveHistory(result.success.map((entry) => ({ ...entry, source: 'ai' as const })));
    }
  } catch (error) {
    handleError(error);
  }
}
