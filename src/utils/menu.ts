import inquirer from 'inquirer';

export interface MenuItem<T> {
  label: string;
  value: T;
}

export interface MenuConfig<T> {
  title: string;
  items: MenuItem<T>[];
  emptyMessage: string;
  createFn: () => Promise<void>;
  editFn: (item: T) => Promise<void>;
  deleteFn: (item: T) => Promise<void>;
}

const CREATE_SENTINEL = '__create__';

export async function runMenu<T>(config: MenuConfig<T>): Promise<void> {
  if (config.items.length === 0) {
    console.log(`\n${config.emptyMessage}\n`);
    await config.createFn();
    return;
  }

  const choices = [
    ...config.items.map((item, i) => ({
      name: item.label,
      value: String(i),
    })),
    new inquirer.Separator(),
    { name: '+ Создать новый', value: CREATE_SENTINEL },
  ];

  const { selected } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selected',
      message: config.title,
      choices,
    },
  ]);

  if (selected === CREATE_SENTINEL) {
    await config.createFn();
    return;
  }

  const item = config.items[Number(selected)];

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: item.label,
      choices: [
        { name: 'Редактировать', value: 'edit' },
        { name: 'Удалить', value: 'delete' },
        { name: '<- Назад', value: 'back' },
      ],
    },
  ]);

  if (action === 'edit') {
    await config.editFn(item.value);
  } else if (action === 'delete') {
    await config.deleteFn(item.value);
  }
}
