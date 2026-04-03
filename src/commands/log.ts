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
            { name: t('log.recentActivity'), value: "stats" },
            { name: t('log.settings'), value: "setup" },
            { name: t('log.exit'), value: "exit" },
          ],
        },
      ]);

      switch (action) {
        case "quick": {
          const { input } = await inquirer.prompt([
            {
              type: "input",
              name: "input",
              message: t('log.enterText'),
              validate: (value: string) => value.length > 0 || t('log.enterTextValidation'),
            },
          ]);
          await quickCommand(input);
          break;
        }
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
  const recentEntries = store.getRecentHistory(5);
  if (recentEntries.length === 0) {
    displayWarning(t('log.noHistory'));
    return;
  }

  const topTasks = store.getTopTasks(5);
  const totalHours = store.getTotalLoggedHours();

  console.log(`\n${t('log.recentLogs')}\n`);
  for (const entry of recentEntries) {
    console.log(`  ${entry.date}  ${entry.task}  ${entry.activity}  ${entry.hours}h`);
  }

  console.log(`\n${t('log.frequentTasks')}\n`);
  for (const task of topTasks) {
    console.log(`  ${task.task}  ${task.totalHours}h  ${task.uses}x`);
  }

  console.log(`\n${t('log.totalHours')} ${totalHours}h\n`);
}
