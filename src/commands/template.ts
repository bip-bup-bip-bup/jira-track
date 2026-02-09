import inquirer from "inquirer";
import { store } from "../core/store";
import { WorklogEntry, Template } from "../types";
import { handleError, displayError } from "../utils/display";
import { runMenu, MenuItem } from "../utils/menu";

export async function templateCommand(): Promise<void> {
  try {
    const templates = store.getTemplates();

    const items: MenuItem<Template>[] = templates.map((t) => ({
      label: `${t.name} — ${t.entries.length} ${t.entries.length === 1 ? "запись" : "записей"}, ${t.entries.reduce((s, e) => s + e.hours, 0)}ч`,
      value: t,
    }));

    await runMenu({
      title: "Templates",
      items,
      emptyMessage: "Нет templates. Создадим первый.",
      createFn: () => createTemplate(),
      editFn: (t) => editTemplate(t),
      deleteFn: (t) => deleteTemplate(t),
    });
  } catch (error) {
    handleError(error);
  }
}

async function createTemplate(): Promise<void> {
  const config = store.getConfig();
  if (!config) {
    displayError("Конфигурация не найдена. Запустите: jt setup");
    process.exit(1);
  }

  const { name } = await inquirer.prompt([
    {
      type: "input",
      name: "name",
      message: "Название template:",
      validate: (input: string) => input.length > 0 || "Введите название",
    },
  ]);

  const entries = await collectEntries();
  store.saveTemplate(name, entries);
  console.log(`\n✓ Template "${name}" создан с ${entries.length} записями\n`);
}

async function editTemplate(template: Template): Promise<void> {
  const { name } = await inquirer.prompt([
    {
      type: "input",
      name: "name",
      message: "Название template:",
      default: template.name,
    },
  ]);

  const entries = await collectEntries(template.entries);

  if (name !== template.name) {
    store.deleteTemplate(template.name);
  }
  store.saveTemplate(name, entries);
  console.log(`\n✓ Template "${name}" обновлён\n`);
}

async function deleteTemplate(template: Template): Promise<void> {
  const { confirm } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message: `Удалить template "${template.name}"?`,
      default: false,
    },
  ]);

  if (confirm) {
    store.deleteTemplate(template.name);
    console.log(`\n✓ Template "${template.name}" удалён\n`);
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
    console.log(`\nEntry ${index + 1}:`);

    const entry = await inquirer.prompt([
      {
        type: "input",
        name: "task",
        message: "Task key:",
        default: current?.task,
        validate: (input: string) => {
          if (!input.match(/^[A-Z]+-\d+$/)) return "Формат: PROJ-123";
          return true;
        },
      },
      {
        type: "input",
        name: "activity",
        message: "Описание работы:",
        default: current?.activity,
        validate: (input: string) => input.length > 0 || "Введите описание",
      },
      {
        type: "number",
        name: "hours",
        message: "Часов:",
        default: current?.hours,
        validate: (input: number) => {
          if (input <= 0 || input > 24) return "Введите число от 0 до 24";
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
        message: "Добавить ещё одну запись?",
        default: index < defaults.length,
      },
    ]);
    addMore = more;
  }

  return entries;
}
