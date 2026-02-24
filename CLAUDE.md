# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

**jtw** is an AI-powered Jira time logging CLI (v2 - minimalist rebuild). Uses Claude or GPT to parse natural language worklog entries and post to Jira Server.

## Build & Development

```bash
npm run build    # Compile TypeScript
npm run dev -- <command>  # Run locally
npm link         # Install globally for testing
```

## Architecture (v2)

Minimalist design: ~1600 lines total.

```
src/
├── commands/      # CLI commands (setup, quick, template, alias, log)
├── core/          # Core logic (store, jira, ai)
├── utils/         # Utilities (display, date, menu)
├── types.ts       # TypeScript types
└── index.ts       # CLI entry point
```

### Key Files

- **src/core/store.ts** - SQLite storage (~80 lines)
  - Config, aliases, templates, history
  - Single file: `~/.jtw/data.db`

- **src/core/jira.ts** - Jira API client (~100 lines)
  - Uses jira.js Version2Client
  - Supports Jira Server and Jira Cloud

- **src/core/ai.ts** - AI providers (~50 lines)
  - AnthropicProvider (claude-haiku-4-5)
  - OpenAIProvider (gpt-5-mini)
  - Unified prompt for both

- **src/commands/** - Individual commands
  - setup.ts - Interactive configuration wizard
  - quick.ts - Fast AI logging (jtw q)
  - template.ts - Template management (jtw t)
  - alias.ts - Alias management (jtw a)
  - log.ts - Interactive menu (jt)

- **src/utils/menu.ts** - Unified menu helpers

### No Layers

Direct implementation. No services/, errors/, validation/ layers.
Logic inline where needed.

## Testing

Manual testing only (no automated tests yet):

```bash
npm run build
npm link
jtw setup          # Configure
jtw q "test input" # Test AI parsing
jtw a              # Test aliases
jtw t              # Test templates
```

Test database: `~/.jtw/data.db`

Inspect: `sqlite3 ~/.jtw/data.db "SELECT * FROM config;"`

## Code Style

- TypeScript strict mode
- Immutability (no mutation)
- Small files (200-400 lines max)
- DRY, YAGNI

## Dependencies

Core:
- better-sqlite3 - SQLite storage
- jira.js - Type-safe Jira API
- commander - CLI framework
- inquirer - Interactive prompts
- @anthropic-ai/sdk - Claude integration
- openai - GPT integration

## Important Notes

1. **Jira API:** Uses Version2Client for on-premise Jira Server
2. **Storage:** All config in SQLite, no JSON files
3. **AI Prompt:** Supports semantic alias matching (see src/core/ai.ts)
4. **Date Format:** Russian format in display (2 фев 2026)
5. **Commands:** Short name `jtw` instead of `jira-track`

## Breaking Changes from v1

- Command name: `jira-track` → `jtw`
- Config: `~/.jira-track/config.json` → `~/.jtw/data.db`
- Aliases: New semantic matching via AI
- Removed: --file option (may add back later)

## Future Features

Not implemented (YAGNI):
- Background daemon
- Calendar integration
- Git activity tracking
- VPN auto-connect

<!-- gitnexus:start -->
# GitNexus MCP

This project is indexed by GitNexus as **jira-cli** (125 symbols, 338 relationships, 15 execution flows).

GitNexus provides a knowledge graph over this codebase — call chains, blast radius, execution flows, and semantic search.

## Always Start Here

For any task involving code understanding, debugging, impact analysis, or refactoring, you must:

1. **Read `gitnexus://repo/{name}/context`** — codebase overview + check index freshness
2. **Match your task to a skill below** and **read that skill file**
3. **Follow the skill's workflow and checklist**

> If step 1 warns the index is stale, run `npx gitnexus analyze` in the terminal first.

## Skills

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/refactoring/SKILL.md` |

## Tools Reference

| Tool | What it gives you |
|------|-------------------|
| `query` | Process-grouped code intelligence — execution flows related to a concept |
| `context` | 360-degree symbol view — categorized refs, processes it participates in |
| `impact` | Symbol blast radius — what breaks at depth 1/2/3 with confidence |
| `detect_changes` | Git-diff impact — what do your current changes affect |
| `rename` | Multi-file coordinated rename with confidence-tagged edits |
| `cypher` | Raw graph queries (read `gitnexus://repo/{name}/schema` first) |
| `list_repos` | Discover indexed repos |

## Resources Reference

Lightweight reads (~100-500 tokens) for navigation:

| Resource | Content |
|----------|---------|
| `gitnexus://repo/{name}/context` | Stats, staleness check |
| `gitnexus://repo/{name}/clusters` | All functional areas with cohesion scores |
| `gitnexus://repo/{name}/cluster/{clusterName}` | Area members |
| `gitnexus://repo/{name}/processes` | All execution flows |
| `gitnexus://repo/{name}/process/{processName}` | Step-by-step trace |
| `gitnexus://repo/{name}/schema` | Graph schema for Cypher |

## Graph Schema

**Nodes:** File, Function, Class, Interface, Method, Community, Process
**Edges (via CodeRelation.type):** CALLS, IMPORTS, EXTENDS, IMPLEMENTS, DEFINES, MEMBER_OF, STEP_IN_PROCESS

```cypher
MATCH (caller)-[:CodeRelation {type: 'CALLS'}]->(f:Function {name: "myFunc"})
RETURN caller.name, caller.filePath
```

<!-- gitnexus:end -->
