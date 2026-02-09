import inquirer from 'inquirer';
import { store } from '../core/store';
import { createAIProvider } from '../core/ai';
import { createJiraClient } from '../core/jira';
import { handleError, displayPreview, displayBatchResult, displayError, displayWarning } from '../utils/display';
import { WorklogEntry } from '../types';

export async function quickCommand(input: string): Promise<void> {
  try {
    const config = store.getConfig();
    if (!config) {
      displayError('Конфигурация не найдена');
      console.error('Запустите: jt setup\n');
      process.exit(1);
    }

    // Warn if input looks too short (missing quotes)
    if (input.split(' ').length < 3) {
      displayWarning('Ваш ввод выглядит слишком коротким.');
      console.warn('Не забывайте использовать кавычки:');
      console.warn('  Правильно: jt q "вчера созвоны 4 часа"');
      console.warn('  Неправильно: jt q вчера созвоны 4 часа\n');
    }

    // Initialize clients
    const aiProvider = createAIProvider(config);
    const jiraClient = createJiraClient(config);

    // Get context for AI
    const aliases = store.getAliases();
    const recentTasks = await jiraClient.getRecentTasks();

    // Parse with AI
    console.log('\nПарсинг через AI...\n');
    let entries: WorklogEntry[];
    try {
      entries = await aiProvider.parse(input, {
        projectKey: config.projectKey,
        aliases,
        recentTasks
      });
    } catch (error: any) {
      displayError('Не удалось распарсить ввод');
      console.error(error.message);
      console.error('\nПопробуйте:');
      console.error(`  "вчера ${config.projectKey}-123 разработка 3 часа"`);
      if (aliases.length > 0) {
        console.error('\nИли используйте aliases:');
        for (const alias of aliases.slice(0, 3)) {
          console.error(`  "сегодня ${alias.keyword} 2 часа"`);
        }
      }
      console.error('');
      process.exit(1);
    }

    if (entries.length === 0) {
      displayError('Не удалось извлечь записи из ввода');
      console.error('Убедитесь что указали:');
      console.error('  - Задачу или alias');
      console.error('  - Время (часы)');
      console.error('  - Дату (или "сегодня", "вчера")\n');
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
          message: `Не найдена задача для "${entry.activity}". Выберите:`,
          choices: [
            ...recentChoices.map(t => ({ name: `${t} (недавняя)`, value: t })),
            ...aliasChoices,
            { name: 'Ввести вручную', value: 'manual' }
          ]
        }
      ]);

      let resolvedTask: string;
      if (selectedTask === 'manual') {
        const { manualTask } = await inquirer.prompt([
          {
            type: 'input',
            name: 'manualTask',
            message: 'Введите задачу:',
            validate: (input: string) => {
              if (!input.match(/^[A-Z]+-\d+$/)) {
                return 'Формат: PROJ-123';
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
          message: `Сохранить "${entry.activity}" как alias для ${resolvedTask}?`,
          default: false
        }
      ]);

      if (saveAlias) {
        store.saveAlias(entry.activity, resolvedTask);
        console.log(`✓ Alias сохранён: "${entry.activity}" → ${resolvedTask}\n`);
      }
    }

    // Validate tasks
    console.log('Проверка задач в Jira...\n');
    const taskKeys = entries.map(e => e.task!);
    const validation = await jiraClient.validateTasks(taskKeys);

    if (validation.invalid.length > 0) {
      displayError(`Задачи не найдены: ${validation.invalid.join(', ')}`);
      process.exit(1);
    }

    if (validation.notAssigned.length > 0) {
      displayWarning(`Задачи не назначены на вас: ${validation.notAssigned.map(t => t.key).join(', ')}`);
    }

    // Show preview
    displayPreview(entries);

    // Confirm before logging
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Залогировать?',
        default: true
      }
    ]);

    if (!confirm) {
      console.log('\nОтменено\n');
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
