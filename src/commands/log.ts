import inquirer from "inquirer";
import { quickCommand } from "./quick";
import { templateCommand } from "./template";
import { aliasCommand } from "./alias";
import { setupCommand } from "./setup";
import { store } from "../core/store";
import { handleError, displayWarning } from "../utils/display";

export async function logCommand(): Promise<void> {
  try {
    const config = store.getConfig();

    if (!config) {
      displayWarning("Конфигурация не найдена");
      await setupCommand();
      return;
    }

    // Main menu loop
    let exit = false;
    while (!exit) {
      const { action } = await inquirer.prompt([
        {
          type: "list",
          name: "action",
          message: "Что хотите сделать?",
          choices: [
            { name: "Быстрый лог (AI)", value: "quick" },
            { name: "Управление templates", value: "templates" },
            { name: "Управление aliases", value: "aliases" },
            { name: "Статистика", value: "stats" },
            { name: "Настройки", value: "setup" },
            { name: "← Выход", value: "exit" },
          ],
        },
      ]);

      switch (action) {
        case "quick":
          const { input } = await inquirer.prompt([
            {
              type: "input",
              name: "input",
              message: "Введите текст для парсинга:",
              validate: (v: string) => v.length > 0 || "Введите текст",
            },
          ]);
          await quickCommand(input);
          break;

        case "templates":
          await templateCommand();
          break;

        case "aliases":
          await aliasCommand();
          break;

        case "stats":
          await showStats();
          break;

        case "setup":
          await setupCommand();
          break;

        case "exit":
          console.log("\nДо свидания!\n");
          exit = true;
          break;
      }
    }
  } catch (error) {
    handleError(error);
  }
}

async function showStats(): Promise<void> {
  const recentTasks = store.getRecentTasks(10);

  if (recentTasks.length === 0) {
    displayWarning("Нет истории логирования");
    return;
  }

  console.log("\nПоследние задачи:\n");
  for (const task of recentTasks) {
    console.log(`  ${task}`);
  }
}
