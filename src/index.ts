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

const savedConfig = store.getConfig();
if (savedConfig?.language) {
  setLang(savedConfig.language);
}

const program = new Command();

program
  .name("jtw")
  .description("AI-powered Jira time logging CLI")
  .version("1.0.0");

program
  .command("setup")
  .description(t('index.setupDesc'))
  .action(async () => {
    await setupCommand();
  });

program
  .command("q <input>")
  .description(t('index.quickDesc'))
  .action(async (input: string) => {
    await quickCommand(input);
  });

program
  .command("t")
  .description(t('index.templatesDesc'))
  .action(async () => {
    await templateCommand();
  });

program
  .command("a")
  .description(t('index.aliasesDesc'))
  .action(async () => {
    await aliasCommand();
  });

program.action(async () => {
  const config = store.getConfig();

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
      console.log(`\n✓ ${t('index.setupDone')}\n`);
      console.log(`  ${t('index.interactive')}`);
      console.log(`  ${t('index.quickAiExample1', { project: store.getConfig()?.projectKey || 'PROJ' })}`);
      console.log(`  ${t('index.quickAiExample2')}`);
      console.log(`  ${t('index.templates')}`);
      console.log(`  ${t('index.aliases')}\n`);
    } else {
      console.log(`\n${t('index.runLater')}\n`);
    }
    return;
  }

  await logCommand();
});

program.parse(process.argv);
