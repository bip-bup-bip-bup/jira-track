import inquirer from "inquirer";
import { store } from "../core/store";
import { createJiraClient, JiraConnectionError } from "../core/jira";
import { handleError, displayError, displayWarning } from "../utils/display";
import { t, setLang, Lang } from "../i18n";

function validateJiraUrl(input: string): true | string {
  try {
    const url = new URL(input);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return t("setup.urlProtocolError");
    }
    if (!url.hostname) {
      return t("setup.urlHostnameError");
    }
    return true;
  } catch {
    return t("setup.urlInvalid");
  }
}

function validateProjectKey(input: string): true | string {
  if (!input.match(/^[A-Z][A-Z0-9]*$/)) {
    return t("setup.projectKeyError");
  }
  return true;
}

function validateApiKey(input: string, hasStoredValue: boolean): true | string {
  if (input.length > 0 || hasStoredValue) {
    return true;
  }
  return t("setup.enterApiKey");
}

export async function setupCommand(): Promise<void> {
  try {
    const existingConfig = store.getConfig();

    const { language } = await inquirer.prompt([
      {
        type: "list",
        name: "language",
        message: t("setup.language"),
        choices: [
          { name: "Русский", value: "ru" },
          { name: "English", value: "en" },
        ],
        default: existingConfig?.language ?? "ru",
      },
    ]);

    setLang(language as Lang);

    console.log(`\n${existingConfig ? t("setup.reconfigureTitle") : t("setup.title")}\n`);
    if (existingConfig) {
      displayWarning(t("setup.reconfigureHint"));
    }

    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "jiraUrl",
        message: t("setup.jiraUrl"),
        default: existingConfig?.jiraUrl ?? "https://jira.example.com",
        validate: validateJiraUrl,
      },
      {
        type: "input",
        name: "jiraUsername",
        message: t("setup.username"),
        default: existingConfig?.jiraUsername,
        validate: (input: string) => input.length > 0 || t("setup.enterUsername"),
      },
      {
        type: "password",
        name: "jiraPassword",
        message: existingConfig ? t("setup.passwordOptional") : t("setup.password"),
        mask: "*",
        validate: (input: string) => (input.length > 0 || existingConfig?.jiraPassword ? true : t("setup.enterPassword")),
      },
      {
        type: "input",
        name: "projectKey",
        message: t("setup.projectKey"),
        default: existingConfig?.projectKey,
        validate: validateProjectKey,
        transformer: (input: string) => input.toUpperCase(),
        filter: (input: string) => input.toUpperCase(),
      },
      {
        type: "list",
        name: "aiProvider",
        message: t("setup.aiProvider"),
        choices: [
          { name: "Anthropic (Claude)", value: "anthropic" },
          { name: "OpenAI (GPT)", value: "openai" },
        ],
        default: existingConfig?.aiProvider ?? "anthropic",
      },
      {
        type: "password",
        name: "aiApiKey",
        message: existingConfig ? t("setup.aiApiKeyOptional") : t("setup.aiApiKey"),
        mask: "*",
        validate: (input: string) => validateApiKey(input, Boolean(existingConfig?.aiApiKey)),
      },
    ]);

    const jiraPassword = answers.jiraPassword || existingConfig?.jiraPassword || "";
    const aiApiKey = answers.aiApiKey || existingConfig?.aiApiKey || "";

    console.log(`\n${t("setup.testingConnection")}`);
    const jiraClient = createJiraClient({
      jiraUrl: answers.jiraUrl,
      jiraUsername: answers.jiraUsername,
      jiraPassword,
      projectKey: answers.projectKey,
    });

    try {
      await jiraClient.testConnection();
      console.log(`✓ ${t("setup.connectionSuccess")}\n`);
    } catch (error) {
      displayError(t("setup.connectionFailed"));
      if (error instanceof JiraConnectionError) {
        console.error(`${error.message}\n`);
        console.error(`${t("setup.checkHints")}`);
        if (error.code === "auth") {
          console.error(`  - ${t("setup.connectionCheckAuth1")}`);
          console.error(`  - ${t("setup.connectionCheckAuth2")}`);
        } else if (error.code === "network") {
          console.error(`  - ${t("setup.connectionCheckNetwork1")}`);
          console.error(`  - ${t("setup.connectionCheckNetwork2")}`);
        } else if (error.code === "ssl") {
          console.error(`  - ${t("setup.connectionCheckSsl1")}`);
          console.error(`  - ${t("setup.connectionCheckSsl2")}`);
        } else {
          console.error(`  - ${t("setup.connectionCheck1")}`);
          console.error(`  - ${t("setup.connectionCheck2")}`);
          console.error(`  - ${t("setup.connectionCheck3")}`);
        }
      } else if (error instanceof Error) {
        console.error(`${error.message}\n`);
      }
      console.error("");
      process.exit(1);
    }

    store.saveConfig({
      jiraUrl: answers.jiraUrl,
      jiraUsername: answers.jiraUsername,
      jiraPassword,
      projectKey: answers.projectKey,
      aiProvider: answers.aiProvider,
      aiApiKey,
      language,
    });

    console.log(`\n✓ ${existingConfig ? t("setup.updated") : t("setup.complete")}\n`);
    console.log(t("setup.nextStepsTitle"));
    console.log(`  ${t("setup.nextStepInteractive")}`);
    console.log(`  ${t("setup.nextStepQuick1", { project: answers.projectKey })}`);
    console.log(`  ${t("setup.nextStepQuick2")}`);
    console.log(`  ${t("setup.nextStepTemplates")}`);
    console.log(`  ${t("setup.nextStepAliases")}\n`);
  } catch (error) {
    handleError(error);
  }
}
