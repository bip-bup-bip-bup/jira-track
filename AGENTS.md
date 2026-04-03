# AGENTS.md

## Project Overview
- This repository contains `jtw`, a Node.js 18+ TypeScript CLI for AI-assisted Jira work logging.
- The architecture is intentionally minimal. Keep changes small, direct, and consistent with the existing structure.
- Primary entrypoint: `src/index.ts`.

## Stack
- TypeScript
- Node.js
- `commander` for CLI wiring
- `inquirer` for interactive prompts
- `better-sqlite3` for local persistence
- `jira.js` for Jira integration
- `@anthropic-ai/sdk` and `openai` for AI parsing

## Repository Layout
- `src/commands/`: user-facing CLI commands and flows
- `src/core/`: core integrations and persistence (`ai`, `jira`, `store`)
- `src/utils/`: terminal display and menu helpers
- `src/i18n/`: localization dictionaries and lookup helpers
- `src/types.ts`: shared TypeScript types

## Working Rules
- Preserve the minimalist design. Do not introduce unnecessary abstractions, service layers, or framework-style patterns.
- Keep logic close to where it is used unless there is a clear reuse case already present in the codebase.
- Prefer focused edits over broad refactors.
- Match the existing TypeScript style and naming patterns in nearby files.
- Use ASCII unless a file already requires localized text or other non-ASCII content.
- When changing user-facing text, check whether the same text should also exist in `src/i18n/en.ts` and `src/i18n/ru.ts`.

## Validation
- Build with `npm run build` after meaningful code changes.
- There is currently no dedicated test suite in the repository; do not add heavy tooling unless explicitly requested.

## Notes For Agents
- Review `README.md` for CLI behavior and expected user flows before making product-facing changes.
- Treat the SQLite-backed local store as user data. Avoid destructive schema or data changes unless explicitly requested.
- Keep Jira and AI integrations pragmatic: favor clear error handling and predictable CLI output.
