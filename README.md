# JT - Jira Time Tracker

AI-powered Jira time logging CLI. Parse natural language to log worklogs automatically.

## Installation

```bash
npm install -g jira-track
```

## Quick Start

```bash
# First-time setup
jt setup

# Quick AI logging
jt q "вчера созвоны 4 часа, PROJ-123 разработка 3ч"

# Interactive mode
jt

# Manage templates
jt t

# Manage aliases
jt a
```

## Features

- **AI-powered parsing:** Natural language to structured worklogs (Anthropic or OpenAI)
- **Aliases:** Map activities to tasks ("созвоны" -> PROJ-123)
- **Templates:** Save and reuse common worklog patterns
- **History tracking:** All logs saved locally
- **Jira Server support:** Works with on-premise Jira installations

## Commands

| Command | Description |
|---------|-------------|
| `jt` | Interactive menu |
| `jt setup` | Configure Jira and AI credentials |
| `jt q "text"` | Quick AI log |
| `jt t` | Template management |
| `jt a` | Alias management |

## Configuration

All settings stored in `~/.jt/data.db` (SQLite). Run `jt setup` to configure:

- Jira URL, username, password
- Project key
- AI provider (anthropic/openai) and API key

## Examples

```bash
# Quick logging
jt q "сегодня стендап 30 минут"
jt q "вчера PROJ-123 разработка 6 часов, ревью 2 часа"

# Aliases resolve automatically via AI
# "созвоны" -> PROJ-123 (if alias exists)
jt q "сегодня созвоны 2 часа"
```

## Architecture

```
src/
├── commands/      # CLI commands (setup, quick, template, alias, log)
├── core/          # Core logic (store, jira, ai)
├── utils/         # Utilities (display, date, menu)
├── types.ts       # TypeScript types
└── index.ts       # CLI entry point
```

Minimalist design, no service layers. SQLite for all storage. Type-safe Jira API via jira.js.

## Requirements

- Node.js 18+
- Jira Server or Jira Cloud access
- Anthropic or OpenAI API key

## License

MIT
