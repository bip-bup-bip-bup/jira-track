import inquirer from 'inquirer';
import { store } from '../core/store';
import { Alias } from '../types';
import { handleError, displayError } from '../utils/display';
import { runMenu, MenuItem } from '../utils/menu';
import { t } from '../i18n';

export async function aliasCommand(): Promise<void> {
  try {
    const aliases = store.getAliases();

    const items: MenuItem<Alias>[] = aliases.map((a) => ({
      label: `${a.keyword} -> ${a.task}${a.description ? ` (${a.description})` : ''}`,
      value: a,
    }));

    await runMenu({
      title: 'Aliases',
      items,
      emptyMessage: t('alias.noAliases'),
      createFn: () => createAlias(),
      editFn: (a) => editAlias(a),
      deleteFn: (a) => deleteAlias(a),
    });
  } catch (error) {
    handleError(error);
  }
}

async function createAlias(): Promise<void> {
  const config = store.getConfig();
  if (!config) {
    displayError(t('alias.noConfig'));
    process.exit(1);
  }

  const answers = await collectAliasFields();
  store.saveAlias(answers.keyword, answers.task, answers.description);
  console.log(`\n\u2713 ${t('alias.saved')} "${answers.keyword}" -> ${answers.task}\n`);
}

async function editAlias(alias: Alias): Promise<void> {
  const answers = await collectAliasFields(alias);

  if (answers.keyword !== alias.keyword) {
    store.deleteAlias(alias.keyword);
  }
  store.saveAlias(answers.keyword, answers.task, answers.description);
  console.log(`\n\u2713 ${t('alias.updated')} "${answers.keyword}" -> ${answers.task}\n`);
}

async function deleteAlias(alias: Alias): Promise<void> {
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `${t('alias.deleteConfirm')} "${alias.keyword}"?`,
      default: false,
    },
  ]);

  if (confirm) {
    store.deleteAlias(alias.keyword);
    console.log(`\n\u2713 ${t('alias.deleted')} "${alias.keyword}"\n`);
  }
}

async function collectAliasFields(defaults?: Alias): Promise<{ keyword: string; task: string; description?: string }> {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'keyword',
      message: t('alias.keyword'),
      default: defaults?.keyword,
      validate: (input: string) => input.length > 0 || t('alias.enterKeyword'),
    },
    {
      type: 'input',
      name: 'task',
      message: t('alias.taskKey'),
      default: defaults?.task,
      validate: (input: string) => {
        if (!input.match(/^[A-Z]+-\d+$/)) return t('quick.taskFormat');
        return true;
      },
    },
    {
      type: 'input',
      name: 'description',
      message: t('alias.description'),
      default: defaults?.description || '',
    },
  ]);

  return {
    keyword: answers.keyword,
    task: answers.task.toUpperCase(),
    description: answers.description || undefined,
  };
}
