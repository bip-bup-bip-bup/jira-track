import inquirer from "inquirer";
import { quickCommand } from "./quick";
import { templateCommand } from "./template";
import { aliasCommand } from "./alias";
import { setupCommand } from "./setup";
import { store } from "../core/store";
import { handleError, displayWarning } from "../utils/display";
import { t } from "../i18n";

export async function logCommand(): Promise<void> {
  try {
    const config = store.getConfig();

    if (!config) {
      displayWarning(t('log.noConfig'));
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
          message: t('log.menuTitle'),
          choices: [
            { name: t('log.quickLog'), value: "quick" },
            { name: t('log.manageTemplates'), value: "templates" },
            { name: t('log.manageAliases'), value: "aliases" },
            { name: t('log.stats'), value: "stats" },
            { name: t('log.settings'), value: "setup" },
            { name: t('log.exit'), value: "exit" },
          ],
        },
      ]);

      switch (action) {
        case "quick":
          const { input } = await inquirer.prompt([
            {
              type: "input",
              name: "input",
              message: t('log.enterText'),
              validate: (v: string) => v.length > 0 || t('log.enterTextValidation'),
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
          console.log(`\n${t('log.goodbye')}\n`);
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
    displayWarning(t('log.noHistory'));
    return;
  }

  console.log(`\n${t('log.recentTasks')}\n`);
  for (const task of recentTasks) {
    console.log(`  ${task}`);
  }
}
