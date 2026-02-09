import inquirer from "inquirer";
import { store } from "../core/store";
import { createJiraClient } from "../core/jira";
import { handleError, displayError } from "../utils/display";

export async function setupCommand(): Promise<void> {
  try {
    console.log("\n🔧 Настройка JT\n");

    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "jiraUrl",
        message: "Jira URL:",
        default: "https://jira.example.com",
        validate: (input: string) => {
          try {
            const url = new URL(input);
            if (url.protocol !== 'http:' && url.protocol !== 'https:') {
              return 'URL должен начинаться с http:// или https://';
            }
            if (!url.hostname) {
              return 'URL должен содержать hostname';
            }
            return true;
          } catch {
            return 'Некорректный URL';
          }
        },
      },
      {
        type: "input",
        name: "jiraUsername",
        message: "Username:",
        validate: (input: string) => input.length > 0 || "Введите username",
      },
      {
        type: "password",
        name: "jiraPassword",
        message: "Password:",
        mask: "*",
        validate: (input: string) => input.length > 0 || "Введите password",
      },
      {
        type: "input",
        name: "projectKey",
        message: "Project key (например, PROJ):",
        validate: (input: string) => {
          if (!input.match(/^[A-Z]+$/)) {
            return "Project key должен содержать только заглавные буквы";
          }
          return true;
        },
        transformer: (input: string) => input.toUpperCase(),
      },
      {
        type: "list",
        name: "aiProvider",
        message: "AI provider:",
        choices: [
          { name: "Anthropic (Claude)", value: "anthropic" },
          { name: "OpenAI (GPT)", value: "openai" },
        ],
      },
      {
        type: "password",
        name: "aiApiKey",
        message: "AI API key:",
        mask: "*",
        validate: (input: string) => input.length > 0 || "Введите API key",
      },
    ]);

    // Test Jira connection
    console.log("\nПроверка подключения к Jira...");
    const jiraClient = createJiraClient({
      jiraUrl: answers.jiraUrl,
      jiraUsername: answers.jiraUsername,
      jiraPassword: answers.jiraPassword,
      projectKey: answers.projectKey,
    });

    try {
      await jiraClient.testConnection();
      console.log("✓ Подключение к Jira успешно\n");
    } catch (error: any) {
      displayError("Не удалось подключиться к Jira");
      console.error(error.message);
      console.error("\nПроверьте:");
      console.error("  - VPN подключен");
      console.error("  - URL правильный");
      console.error("  - Логин и пароль корректны\n");
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
    });

    console.log("\n✓ Настройка завершена!\n");
    console.log("Теперь можно использовать:");
    console.log("  jt        - интерактивный режим");
    console.log('  jt q "текст" - быстрый лог через AI');
    console.log("  jt t      - работа с templates\n");
  } catch (error) {
    handleError(error);
  }
}
