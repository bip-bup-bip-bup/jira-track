#!/usr/bin/env node

import { Command } from "commander";
import { setupCommand } from "./commands/setup";
import { quickCommand } from "./commands/quick";
import { templateCommand } from "./commands/template";
import { aliasCommand } from "./commands/alias";
import { logCommand } from "./commands/log";
import { store } from "./core/store";
import { setLang, t } from "./i18n";
import inquirer from "inquirer";

// Initialize language from config
const savedConfig = store.getConfig();
if (savedConfig?.language) {
  setLang(savedConfig.language);
}

const program = new Command();

program
  .name("jtw")
  .description("AI-powered Jira time logging CLI")
  .version("1.0.0");

// Setup command
program
  .command("setup")
  .description(t('index.setupDesc'))
  .action(async () => {
    await setupCommand();
  });

// Quick log command
program
  .command("q <input>")
  .description(t('index.quickDesc'))
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
    console.log(`\n${t('index.welcome')}\n`);
    console.log(`${t('index.needSetup')}\n`);

    const { proceed } = await inquirer.prompt([
      {
        type: "confirm",
        name: "proceed",
        message: t('index.startSetup'),
        default: true,
      },
    ]);

    if (proceed) {
      await setupCommand();
      console.log(`\n\u2713 ${t('index.setupDone')}\n`);
      console.log(`  ${t('index.interactive')}`);
      console.log(`  ${t('index.quickAi')}`);
      console.log(`  ${t('index.templates')}`);
      console.log(`  ${t('index.aliases')}\n`);
    } else {
      console.log(`\n${t('index.runLater')}\n`);
    }
    return;
  }

  // Regular interactive mode
  await logCommand();
});

program.parse(process.argv);
