import { t } from '../i18n';

export function displayError(message: string): void {
  console.error(`\n  ${message}\n`);
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
