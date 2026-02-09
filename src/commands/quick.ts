import inquirer from 'inquirer';
import { store } from '../core/store';
import { createAIProvider } from '../core/ai';
import { createJiraClient } from '../core/jira';
import { handleError, displayPreview, displayBatchResult, displayError, displayWarning } from '../utils/display';
import { WorklogEntry } from '../types';
import { t } from '../i18n';

export async function quickCommand(input: string): Promise<void> {
  try {
    const config = store.getConfig();
    if (!config) {
      displayError(t('quick.noConfig'));
      console.error(`${t('quick.runSetup')}\n`);
      process.exit(1);
    }

    // Warn if input looks too short (missing quotes)
    if (input.split(' ').length < 3) {
      displayWarning(t('quick.inputTooShort'));
      console.warn(t('quick.quoteHint'));
      console.warn(`  ${t('quick.quoteCorrect')}`);
      console.warn(`  ${t('quick.quoteWrong')}\n`);
    }

    // Initialize clients
    const aiProvider = createAIProvider(config);
    const jiraClient = createJiraClient(config);

    // Get context for AI
    const aliases = store.getAliases();
    const recentTasks = await jiraClient.getRecentTasks();

    // Parse with AI
    console.log(`\n${t('quick.parsing')}\n`);
    let entries: WorklogEntry[];
    try {
      entries = await aiProvider.parse(input, {
        projectKey: config.projectKey,
        aliases,
        recentTasks
      });
    } catch (error: any) {
      displayError(t('quick.parseFailed'));
      console.error(error.message);
      console.error(`\n${t('quick.tryExample')}`);
      console.error(`  "${t('quick.exampleFull', { project: config.projectKey })}"`);
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

    // Fill missing tasks interactively -- ask once per unique activity
    const resolvedTasks: Record<string, string> = {};

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (entry.task) continue;

      // Already asked for this activity -- reuse answer
      if (resolvedTasks[entry.activity]) {
        entries[i] = { ...entry, task: resolvedTasks[entry.activity] };
        continue;
      }

      const recentChoices = store.getRecentTasks(5);
      const aliasChoices = aliases.map(a => ({ name: `${a.task} (${a.keyword})`, value: a.task }));

      const { selectedTask } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedTask',
          message: `${t('quick.noTaskFor')} "${entry.activity}". ${t('quick.selectTask')}`,
          choices: [
            ...recentChoices.map(tsk => ({ name: `${tsk} (${t('quick.recent')})`, value: tsk })),
            ...aliasChoices,
            { name: t('quick.enterManually'), value: 'manual' }
          ]
        }
      ]);

      let resolvedTask: string;
      if (selectedTask === 'manual') {
        const { manualTask } = await inquirer.prompt([
          {
            type: 'input',
            name: 'manualTask',
            message: t('quick.enterTask'),
            validate: (input: string) => {
              if (!input.match(/^[A-Z]+-\d+$/)) {
                return t('quick.taskFormat');
              }
              return true;
            }
          }
        ]);
        resolvedTask = manualTask;
      } else {
        resolvedTask = selectedTask;
      }

      entries[i] = { ...entry, task: resolvedTask };
      resolvedTasks[entry.activity] = resolvedTask;

      // Offer to save as alias
      const { saveAlias } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'saveAlias',
          message: `${t('quick.saveAsAlias')} ${resolvedTask}?`,
          default: false
        }
      ]);

      if (saveAlias) {
        store.saveAlias(entry.activity, resolvedTask);
        console.log(`\u2713 ${t('quick.aliasSaved')} "${entry.activity}" -> ${resolvedTask}\n`);
      }
    }

    // Validate tasks
    console.log(`${t('quick.validatingTasks')}\n`);
    const taskKeys = entries.map(e => e.task!);
    const validation = await jiraClient.validateTasks(taskKeys);

    if (validation.invalid.length > 0) {
      displayError(`${t('quick.tasksNotFound')} ${validation.invalid.join(', ')}`);
      process.exit(1);
    }

    if (validation.notAssigned.length > 0) {
      displayWarning(`${t('quick.tasksNotAssigned')} ${validation.notAssigned.map(tsk => tsk.key).join(', ')}`);
    }

    // Show preview
    displayPreview(entries);

    // Confirm before logging
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: t('quick.confirmLog'),
        default: true
      }
    ]);

    if (!confirm) {
      console.log(`\n${t('quick.cancelled')}\n`);
      return;
    }

    const result = await jiraClient.logBatch(entries);

    // Display results
    displayBatchResult(result);

    // Save to history
    if (result.success.length > 0) {
      store.saveHistory(result.success.map(e => ({ ...e, source: 'ai' as const })));
    }
  } catch (error) {
    handleError(error);
  }
}
