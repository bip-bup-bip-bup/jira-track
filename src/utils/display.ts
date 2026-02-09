import { WorklogEntry, BatchResult } from '../types';
import { t } from '../i18n';

export function displayPreview(entries: WorklogEntry[]): void {
  console.log(`\n${t('display.preview')}\n`);

  const maxTaskLen = Math.max(...entries.map(e => (e.task ?? '???').length));
  const maxActivityLen = Math.max(...entries.map(e => e.activity.length), 20);

  for (const entry of entries) {
    const dateStr = formatDate(entry.date);
    const taskStr = (entry.task ?? '???').padEnd(maxTaskLen);
    const activityStr = entry.activity.padEnd(maxActivityLen);
    const hoursStr = `${entry.hours}h`;

    console.log(`  ${dateStr}  ${taskStr}  ${activityStr}  ${hoursStr}`);
  }

  const total = entries.reduce((sum, e) => sum + e.hours, 0);
  console.log(`\n  ${t('display.total')} ${total}h\n`);
}

function formatDate(isoDate: string): string {
  const months = t('display.months').split(',');
  const [yearStr, monthStr, dayStr] = isoDate.split('-');
  const day = parseInt(dayStr, 10);
  const month = months[parseInt(monthStr, 10) - 1];
  const year = parseInt(yearStr, 10);
  return `${day} ${month} ${year}`;
}

function displaySuccess(count: number): void {
  console.log(`\n\u2713 ${t('display.loggedPrefix')} ${count} ${pluralize(count, t('display.logged.one'), t('display.logged.few'), t('display.logged.many'))}\n`);
}

export function displayWarning(message: string): void {
  console.log(`\n  ${message}\n`);
}

export function displayError(message: string): void {
  console.error(`\n  ${message}\n`);
}

function pluralize(n: number, one: string, few: string, many: string): string {
  if (n % 10 === 1 && n % 100 !== 11) return one;
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return few;
  return many;
}

export function handleError(error: unknown): never {
  // Ctrl+C during inquirer prompt
  if (error && typeof error === 'object' && 'name' in error && (error as Error).name === 'ExitPromptError') {
    console.log(`\n\n${t('display.cancelled')}\n`);
    process.exit(0);
  }

  console.error('\n');

  if (error instanceof Error) {
    // VPN/Network errors
    if (error.message.includes('VPN') || error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      displayError(t('error.jiraConnect'));
      console.error(`${t('setup.checkHints')}`);
      console.error(`  1. ${t('error.checkVpn')}`);
      console.error(`  2. ${t('error.checkUrl')}`);
      console.error('');
      process.exit(1);
    }

    // Auth errors
    if (error.message.includes('401') || error.message.includes('credentials') || error.message.includes('Invalid credentials')) {
      displayError(t('error.invalidCredentials'));
      console.error(`${t('error.fixCredentials')}\n`);
      process.exit(1);
    }

    // AI errors
    if (error.message.includes('API key') || error.message.includes('api_key')) {
      displayError(t('error.invalidAiKey'));
      console.error(`${t('error.getKey')}`);
      console.error('  Anthropic: https://console.anthropic.com/');
      console.error('  OpenAI: https://platform.openai.com/api-keys');
      console.error('');
      console.error(`${t('error.configureSetup')}\n`);
      process.exit(1);
    }

    // Rate limit
    if (error.message.includes('rate limit') || error.message.includes('429')) {
      displayError(t('error.rateLimit'));
      console.error(`${t('error.rateLimitHint')}`);
      console.error('  jtw t\n');
      process.exit(1);
    }

    // Invalid task
    if (error.message.includes('404') || error.message.includes('does not exist')) {
      displayError(t('error.taskNotFound'));
      console.error(`${t('error.taskNotFoundHint')}\n`);
      process.exit(1);
    }

    // Config not found
    if (error.message.includes('config') || error.message.includes('SQLITE_CANTOPEN')) {
      displayError(t('error.configNotFound'));
      console.error(`${t('error.configNotFoundHint')}\n`);
      process.exit(1);
    }

    // Generic error
    displayError(`${t('error.generic')} ${error.message}`);
  } else {
    displayError(t('error.unknown'));
  }

  console.error(`${t('error.persistentHint')}`);
  console.error(`  - ${t('error.checkVpnHint')}`);
  console.error(`  - ${t('error.openJira')}`);
  console.error(`  - ${t('error.checkSettings')}\n`);

  process.exit(1);
}

export function displayProgress(current: number, total: number, item: string): void {
  process.stdout.write(`  [${current}/${total}] ${item}... `);
}

export function displayProgressResult(success: boolean): void {
  console.log(success ? '\u2713' : '\u2717');
}

export function displayBatchResult(result: BatchResult): void {
  if (result.success.length > 0) {
    displaySuccess(result.success.length);
  }

  if (result.failed.length > 0) {
    console.error(`\u2717 ${t('display.failedToLog')} ${result.failed.length}:\n`);
    for (const { entry, error } of result.failed) {
      console.error(`  ${entry.task}: ${error}`);
    }
    console.error('');
  }
}
