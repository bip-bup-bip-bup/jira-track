import inquirer from "inquirer";
import { store } from "../core/store";
import { WorklogEntry, Template } from "../types";
import { handleError, displayError } from "../utils/display";
import { runMenu, MenuItem } from "../utils/menu";
import { t } from "../i18n";

export async function templateCommand(): Promise<void> {
  try {
    const templates = store.getTemplates();

    const items: MenuItem<Template>[] = templates.map((tmpl) => ({
      label: `${tmpl.name} -- ${tmpl.entries.length} ${tmpl.entries.length === 1 ? t('template.entry') : t('template.entries')}, ${tmpl.entries.reduce((s, e) => s + e.hours, 0)}h`,
      value: tmpl,
    }));

    await runMenu({
      title: "Templates",
      items,
      emptyMessage: t('template.noTemplates'),
      createFn: () => createTemplate(),
      editFn: (tmpl) => editTemplate(tmpl),
      deleteFn: (tmpl) => deleteTemplate(tmpl),
    });
  } catch (error) {
    handleError(error);
  }
}

async function createTemplate(): Promise<void> {
  const config = store.getConfig();
  if (!config) {
    displayError(t('template.noConfig'));
    process.exit(1);
  }

  const { name } = await inquirer.prompt([
    {
      type: "input",
      name: "name",
      message: t('template.namePrompt'),
      validate: (input: string) => input.length > 0 || t('template.enterName'),
    },
  ]);

  const entries = await collectEntries();
  store.saveTemplate(name, entries);
  console.log(`\n\u2713 Template "${name}" ${t('template.created')} ${entries.length} ${t('template.createdSuffix')}\n`);
}

async function editTemplate(template: Template): Promise<void> {
  const { name } = await inquirer.prompt([
    {
      type: "input",
      name: "name",
      message: t('template.nameEditPrompt'),
      default: template.name,
    },
  ]);

  const entries = await collectEntries(template.entries);

  if (name !== template.name) {
    store.deleteTemplate(template.name);
  }
  store.saveTemplate(name, entries);
  console.log(`\n\u2713 ${t('template.updated')} "${name}"\n`);
}

async function deleteTemplate(template: Template): Promise<void> {
  const { confirm } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message: `${t('template.deleteConfirm')} "${template.name}"?`,
      default: false,
    },
  ]);

  if (confirm) {
    store.deleteTemplate(template.name);
    console.log(`\n\u2713 ${t('template.deleted')} "${template.name}"\n`);
  }
}

async function collectEntries(
  defaults: WorklogEntry[] = [],
): Promise<WorklogEntry[]> {
  const entries: WorklogEntry[] = [];
  let addMore = true;
  let index = 0;

  while (addMore) {
    const current = defaults[index];
    console.log(`\n${t('template.entryLabel')} ${index + 1}:`);

    const entry = await inquirer.prompt([
      {
        type: "input",
        name: "task",
        message: t('template.taskKey'),
        default: current?.task,
        validate: (input: string) => {
          if (!input.match(/^[A-Z]+-\d+$/)) return t('quick.taskFormat');
          return true;
        },
      },
      {
        type: "input",
        name: "activity",
        message: t('template.activity'),
        default: current?.activity,
        validate: (input: string) => input.length > 0 || t('template.enterActivity'),
      },
      {
        type: "number",
        name: "hours",
        message: t('template.hours'),
        default: current?.hours,
        validate: (input: number) => {
          if (input <= 0 || input > 24) return t('template.hoursValidation');
          return true;
        },
      },
    ]);

    entries.push({
      task: entry.task.toUpperCase(),
      activity: entry.activity,
      hours: entry.hours,
      date: "",
    });

    index++;

    const { more } = await inquirer.prompt([
      {
        type: "confirm",
        name: "more",
        message: t('template.addMore'),
        default: index < defaults.length,
      },
    ]);
    addMore = more;
  }

  return entries;
}
