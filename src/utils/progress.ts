export function displayProgress(current: number, total: number, item: string): void {
  process.stdout.write(`  [${current}/${total}] ${item}... `);
}

export function displayProgressResult(success: boolean): void {
  console.log(success ? '\u2713' : '\u2717');
}

export function displayWarning(message: string): void {
  console.log(`\n  ${message}\n`);
}
