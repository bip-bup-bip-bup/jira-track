**English** | [Русский](README.ru.md)

# JT - Jira Time Tracker

AI-powered Jira time logging CLI. Write in natural language -- get structured worklogs.

## Installation

```bash
npm install -g jtw
```

## Quick Start

```bash
# First-time setup
jtw setup

# Quick AI logging
jtw q "yesterday standups 4 hours, PROJ-123 development 3h"

# Interactive mode
jt

# Manage templates
jtw t

# Manage aliases
jtw a
```

## Features

- **AI parsing:** Natural language to structured worklogs (Anthropic or OpenAI)
- **Aliases:** Map activities to tasks with semantic AI matching ("standups" -> PROJ-123)
- **Templates:** Save and reuse common worklog patterns
- **History:** All logs saved locally in SQLite
- **Periods:** "last week standups 1.5h each day" -- auto-expands to workdays
- **Jira Server & Cloud:** Works with on-premise and cloud installations

## Commands

| Command | Description |
|---------|-------------|
| `jtw` | Interactive menu |
| `jtw setup` | Configure Jira and AI credentials |
| `jtw q "text"` | Quick AI log |
| `jtw t` | Template management |
| `jtw a` | Alias management |

## Configuration

All settings stored in `~/.jtw/data.db` (SQLite). Run `jtw setup` to configure:

- Jira URL, username, password
- Project key (e.g., PROJ)
- AI provider (Anthropic / OpenAI) and API key

## Examples

```bash
# Simple log
jtw q "today standup 30 minutes"

# Multiple entries at once
jtw q "yesterday PROJ-123 development 6 hours, review 2 hours"

# AI matches aliases by meaning
# "standups" -> PROJ-123 (if alias exists)
jtw q "today standups 2 hours"

# Periods -- expands to workdays
jtw q "last week standups 1.5h each day"

# Relative dates
jtw q "day before yesterday bugfix 4h"
```

## Requirements

- Node.js 18+
- Jira Server or Jira Cloud access
- Anthropic or OpenAI API key

## Troubleshooting

**better-sqlite3 won't install:**
The package includes a native dependency. Prebuilt binaries are downloaded automatically. If that fails, you need a C++ compiler:
- macOS: `xcode-select --install`
- Ubuntu: `sudo apt install build-essential python3`
- Windows: `npm install -g windows-build-tools`

**Can't connect to Jira:**
Check VPN, URL, and credentials: `jtw setup`

**AI API error:**
Check your API key and account balance.

## Architecture

```
src/
├── commands/      # CLI commands (setup, quick, template, alias, log)
├── core/          # Core logic (store, jira, ai)
├── utils/         # Utilities (display, menu)
├── types.ts       # TypeScript types
└── index.ts       # CLI entry point
```

Minimalist design, no service layers. SQLite for all storage. Type-safe Jira API via jira.js.

## License

MIT
