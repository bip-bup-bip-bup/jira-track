import { WorklogEntry, BatchResult } from '../types';

export function displayPreview(entries: WorklogEntry[]): void {
  console.log('\nПредпросмотр:\n');

  const maxTaskLen = Math.max(...entries.map(e => (e.task ?? '???').length));
  const maxActivityLen = Math.max(...entries.map(e => e.activity.length), 20);

  for (const entry of entries) {
    const dateStr = formatDate(entry.date);
    const taskStr = (entry.task ?? '???').padEnd(maxTaskLen);
    const activityStr = entry.activity.padEnd(maxActivityLen);
    const hoursStr = `${entry.hours}ч`;

    console.log(`  ${dateStr}  ${taskStr}  ${activityStr}  ${hoursStr}`);
  }

  const total = entries.reduce((sum, e) => sum + e.hours, 0);
  console.log(`\n  Всего: ${total}ч\n`);
}

export function formatDate(isoDate: string): string {
  const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  const [yearStr, monthStr, dayStr] = isoDate.split('-');
  const day = parseInt(dayStr, 10);
  const month = months[parseInt(monthStr, 10) - 1];
  const year = parseInt(yearStr, 10);
  return `${day} ${month} ${year}`;
}

export function displaySuccess(count: number): void {
  console.log(`\n✓ Залогировано ${count} ${pluralize(count, 'запись', 'записи', 'записей')}\n`);
}

export function displayWarning(message: string): void {
  console.log(`\n⚠️  ${message}\n`);
}

export function displayError(message: string): void {
  console.error(`\n❌ ${message}\n`);
}

function pluralize(n: number, one: string, few: string, many: string): string {
  if (n % 10 === 1 && n % 100 !== 11) return one;
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return few;
  return many;
}

export function handleError(error: unknown): never {
  // Ctrl+C during inquirer prompt
  if (error && typeof error === 'object' && 'name' in error && (error as Error).name === 'ExitPromptError') {
    console.log('\n\nОтменено\n');
    process.exit(0);
  }

  console.error('\n');

  if (error instanceof Error) {
    // VPN/Network errors
    if (error.message.includes('VPN') || error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      displayError('Не могу подключиться к Jira');
      console.error('Проверьте:');
      console.error('  1. VPN подключен');
      console.error('  2. URL правильный: jt setup');
      console.error('');
      process.exit(1);
    }

    // Auth errors
    if (error.message.includes('401') || error.message.includes('credentials') || error.message.includes('Invalid credentials')) {
      displayError('Неверный логин или пароль');
      console.error('Исправить: jt setup\n');
      process.exit(1);
    }

    // AI errors
    if (error.message.includes('API key') || error.message.includes('api_key')) {
      displayError('Неверный AI API ключ');
      console.error('Получить ключ:');
      console.error('  Anthropic: https://console.anthropic.com/');
      console.error('  OpenAI: https://platform.openai.com/api-keys');
      console.error('');
      console.error('Настроить: jt setup\n');
      process.exit(1);
    }

    // Rate limit
    if (error.message.includes('rate limit') || error.message.includes('429')) {
      displayError('Превышен лимит запросов к AI');
      console.error('Попробуйте через минуту или используйте template:');
      console.error('  jt t\n');
      process.exit(1);
    }

    // Invalid task
    if (error.message.includes('404') || error.message.includes('does not exist')) {
      displayError('Задача не найдена в Jira');
      console.error('Проверьте номер задачи и попробуйте снова\n');
      process.exit(1);
    }

    // Config not found
    if (error.message.includes('config') || error.message.includes('SQLITE_CANTOPEN')) {
      displayError('Конфигурация не найдена');
      console.error('Запустите настройку: jt setup\n');
      process.exit(1);
    }

    // Generic error
    displayError(`Ошибка: ${error.message}`);
  } else {
    displayError('Неизвестная ошибка');
  }

  console.error('Если проблема повторяется:');
  console.error('  - Проверьте VPN');
  console.error('  - Откройте Jira в браузере');
  console.error('  - Проверьте настройки: jt setup\n');

  process.exit(1);
}

export function displayProgress(current: number, total: number, item: string): void {
  process.stdout.write(`  [${current}/${total}] ${item}... `);
}

export function displayProgressResult(success: boolean): void {
  console.log(success ? '✓' : '✗');
}

export function displayBatchResult(result: BatchResult): void {
  if (result.success.length > 0) {
    displaySuccess(result.success.length);
  }

  if (result.failed.length > 0) {
    console.error(`✗ Не удалось залогировать ${result.failed.length}:\n`);
    for (const { entry, error } of result.failed) {
      console.error(`  ${entry.task}: ${error}`);
    }
    console.error('');
  }
}
