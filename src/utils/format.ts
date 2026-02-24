import type { WorklogEntry, BatchResult } from '../types';
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

export function formatDate(isoDate: string): string {
  const months = t('display.months').split(',');
  const [yearStr, monthStr, dayStr] = isoDate.split('-');
  const day = parseInt(dayStr, 10);
  const month = months[parseInt(monthStr, 10) - 1];
  const year = parseInt(yearStr, 10);
  return `${day} ${month} ${year}`;
}

export function pluralize(n: number, one: string, few: string, many: string): string {
  if (n % 10 === 1 && n % 100 !== 11) return one;
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return few;
  return many;
}

function displaySuccess(count: number): void {
  console.log(`\n\u2713 ${t('display.loggedPrefix')} ${count} ${pluralize(count, t('display.logged.one'), t('display.logged.few'), t('display.logged.many'))}\n`);
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
