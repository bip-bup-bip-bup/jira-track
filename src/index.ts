#!/usr/bin/env node

import { Command } from "commander";
import { setupCommand } from "./commands/setup";
import { quickCommand } from "./commands/quick";
import { templateCommand } from "./commands/template";
import { aliasCommand } from "./commands/alias";
import { logCommand } from "./commands/log";
import { store } from "./core/store";
import inquirer from "inquirer";

const program = new Command();

program
  .name("jt")
  .description("AI-powered Jira time logging CLI")
  .version("2.0.0");

// Setup command
program
  .command("setup")
  .description("Настройка конфигурации")
  .action(async () => {
    await setupCommand();
  });

// Quick log command
program
  .command("q <input>")
  .description("Быстрый AI лог без подтверждения")
  .action(async (input: string) => {
    await quickCommand(input);
  });

// Template command
program
  .command("t")
  .description("Templates")
  .action(async () => {
    await templateCommand();
  });

// Alias command
program
  .command("a")
  .description("Aliases")
  .action(async () => {
    await aliasCommand();
  });

// Default interactive command
program.action(async () => {
  const config = store.getConfig();

  // First-run experience
  if (!config) {
    console.log("\n👋 Добро пожаловать в JT!\n");
    console.log("Сначала нужно настроить подключение к Jira.\n");

    const { proceed } = await inquirer.prompt([
      {
        type: "confirm",
        name: "proceed",
        message: "Начать настройку?",
        default: true,
      },
    ]);

    if (proceed) {
      await setupCommand();
      console.log("\n✓ Готово! Теперь используйте:\n");
      console.log("  jt        - интерактивный режим");
      console.log('  jt q "текст" - быстрый AI лог');
      console.log("  jt t      - templates");
      console.log("  jt a      - aliases\n");
    } else {
      console.log("\nЗапустите позже: jt setup\n");
    }
    return;
  }

  // Regular interactive mode
  await logCommand();
});

program.parse(process.argv);
