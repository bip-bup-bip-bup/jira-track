import inquirer from "inquirer";
import { store } from "../core/store";
import { createJiraClient } from "../core/jira";
import { handleError, displayError } from "../utils/display";
import { t, setLang, Lang } from "../i18n";

export async function setupCommand(): Promise<void> {
  try {
    // Language selection first
    const { language } = await inquirer.prompt([
      {
        type: "list",
        name: "language",
        message: t('setup.language'),
        choices: [
          { name: "Русский", value: "ru" },
          { name: "English", value: "en" },
        ],
        default: "ru",
      },
    ]);

    setLang(language as Lang);

    console.log(`\n${t('setup.title')}\n`);

    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "jiraUrl",
        message: t('setup.jiraUrl'),
        default: "https://jira.example.com",
        validate: (input: string) => {
          try {
            const url = new URL(input);
            if (url.protocol !== 'http:' && url.protocol !== 'https:') {
              return t('setup.urlProtocolError');
            }
            if (!url.hostname) {
              return t('setup.urlHostnameError');
            }
            return true;
          } catch {
            return t('setup.urlInvalid');
          }
        },
      },
      {
        type: "input",
        name: "jiraUsername",
        message: t('setup.username'),
        validate: (input: string) => input.length > 0 || t('setup.enterUsername'),
      },
      {
        type: "password",
        name: "jiraPassword",
        message: t('setup.password'),
        mask: "*",
        validate: (input: string) => input.length > 0 || t('setup.enterPassword'),
      },
      {
        type: "input",
        name: "projectKey",
        message: t('setup.projectKey'),
        validate: (input: string) => {
          if (!input.match(/^[A-Z]+$/)) {
            return t('setup.projectKeyError');
          }
          return true;
        },
        transformer: (input: string) => input.toUpperCase(),
      },
      {
        type: "list",
        name: "aiProvider",
        message: t('setup.aiProvider'),
        choices: [
          { name: "Anthropic (Claude)", value: "anthropic" },
          { name: "OpenAI (GPT)", value: "openai" },
        ],
      },
      {
        type: "password",
        name: "aiApiKey",
        message: t('setup.aiApiKey'),
        mask: "*",
        validate: (input: string) => input.length > 0 || t('setup.enterApiKey'),
      },
    ]);

    // Test Jira connection
    console.log(`\n${t('setup.testingConnection')}`);
    const jiraClient = createJiraClient({
      jiraUrl: answers.jiraUrl,
      jiraUsername: answers.jiraUsername,
      jiraPassword: answers.jiraPassword,
      projectKey: answers.projectKey,
    });

    try {
      await jiraClient.testConnection();
      console.log(`\u2713 ${t('setup.connectionSuccess')}\n`);
    } catch (error: any) {
      displayError(t('setup.connectionFailed'));
      console.error(error.message);
      console.error(`\n${t('setup.checkHints')}`);
      console.error(`  - ${t('setup.connectionCheck1')}`);
      console.error(`  - ${t('setup.connectionCheck2')}`);
      console.error(`  - ${t('setup.connectionCheck3')}\n`);
      process.exit(1);
    }

    // Save config
    store.saveConfig({
      jiraUrl: answers.jiraUrl,
      jiraUsername: answers.jiraUsername,
      jiraPassword: answers.jiraPassword,
      projectKey: answers.projectKey.toUpperCase(),
      aiProvider: answers.aiProvider,
      aiApiKey: answers.aiApiKey,
      language,
    });

    console.log(`\n\u2713 ${t('setup.complete')}\n`);
    console.log(t('setup.usageHint1'));
    console.log(`  ${t('setup.usageHint2')}`);
    console.log(`  ${t('setup.usageHint3')}`);
    console.log(`  ${t('setup.usageHint4')}`);
    console.log(`  ${t('setup.usageHint5')}\n`);
  } catch (error) {
    handleError(error);
  }
}
