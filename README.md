**English** | [Русский](README.ru.md)

# JT - Jira Time Tracker

AI-powered Jira time logging CLI. Write in natural language and confirm the result before it reaches Jira.

## Installation

```bash
npm install -g jtw
```

## Quick Start

```bash
# First-time setup
jtw setup

# Quick AI logging
jtw q "today PROJ-123 development 2h"

# Quick AI logging with alias-style work
jtw q "today standup 30m"

# Interactive mode
jtw

# Manage templates
jtw t

# Manage aliases
jtw a
```

## Features

- **AI parsing:** Natural language to structured worklogs with preview and confirmation
- **Smarter fallbacks:** If AI cannot resolve a task, JTW suggests recent tasks, history, and aliases
- **Aliases:** Map recurring work to Jira tasks, for example `standup -> PROJ-123`
- **Templates:** Save and reuse common worklog batches
- **History:** All successful logs are stored locally in SQLite for better suggestions
- **Periods:** `last week standups 1.5h each day` expands to workdays automatically
- **Jira Server & Cloud:** Works with on-premise and cloud installations

## Commands

| Command | Description |
|---------|-------------|
| `jtw` | Interactive menu |
| `jtw setup` | Configure Jira, AI, and language settings |
| `jtw q "text"` | Parse a natural-language worklog and log it after confirmation |
| `jtw t` | Template management |
| `jtw a` | Alias management |

## Configuration

All settings are stored in `~/.jtw/data.db` (SQLite). Run `jtw setup` to configure:

- Jira URL, username, password
- Project key, for example `PROJ`
- AI provider (`Anthropic` or `OpenAI`) and API key
- CLI language (`English` or `Russian`)

When you rerun `jtw setup`, saved values are prefilled. Leave secret fields empty to keep the existing password and API key.

## Common Flows

### First setup

```bash
jtw setup
```

After a successful connection test, JTW shows concrete next commands you can run immediately.

### AI quick log

```bash
jtw q "today PROJ-123 code review 1h, standup 30m"
```

JTW parses the text, validates the Jira tasks, shows a grouped preview by date, and asks for confirmation before logging.

### Resolve an unresolved task

```bash
jtw q "today incident follow-up 45m"
```

If AI cannot determine the Jira task, JTW offers:

- recent logged tasks from local history
- recent Jira issues assigned to you
- saved aliases
- manual task entry

### Aliases and templates workflow

```bash
# Save recurring work keywords
jtw a

# Save reusable batches of entries
jtw t
```

Aliases help AI resolve recurring work. Templates help with repeated multi-entry logs.

## Examples

```bash
# Simple log
jtw q "today standup 30 minutes"

# Multiple entries at once
jtw q "yesterday PROJ-123 development 6 hours, review 2 hours"

# AI matches aliases by meaning
jtw q "today standups 2 hours"

# Periods expand to workdays
jtw q "last week standups 1.5h each day"

# Relative dates
jtw q "day before yesterday bugfix 4h"
```

## Requirements

- Node.js 18+
- Jira Server or Jira Cloud access
- Anthropic or OpenAI API key

## Troubleshooting

**Cannot connect to Jira:**
Run `jtw setup` again. The connection step now distinguishes credentials, network or VPN, and SSL certificate issues.

**AI returned invalid output:**
Retry the command or simplify the wording. If the issue repeats, try an explicit task key like `PROJ-123`.

**better-sqlite3 won't install:**
The package includes a native dependency. Prebuilt binaries are downloaded automatically. If that fails, you need a C++ compiler:
- macOS: `xcode-select --install`
- Ubuntu: `sudo apt install build-essential python3`
- Windows: `npm install -g windows-build-tools`

## Architecture

```text
src/
├── commands/      # CLI commands (setup, quick, template, alias, log)
├── core/          # Core logic (store, jira, ai)
├── utils/         # Utilities (display, menu)
├── types.ts       # TypeScript types
└── index.ts       # CLI entry point
```

Minimalist design, no service layers. SQLite stores configuration, aliases, templates, and log history.

## License

MIT
