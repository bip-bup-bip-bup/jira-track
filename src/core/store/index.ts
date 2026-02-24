import { getConfig, saveConfig } from "./config";
import { getAliases, saveAlias, deleteAlias } from "./aliases";
import { getTemplates, saveTemplate, deleteTemplate } from "./templates";
import { saveHistory, getRecentTasks } from "./history";

// Facade: same API as old Store class
export const store = {
  getConfig,
  saveConfig,
  getAliases,
  saveAlias,
  deleteAlias,
  getTemplates,
  saveTemplate,
  deleteTemplate,
  saveHistory,
  getRecentTasks,
};
